const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: corsOptions
});

// Initialize Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Initialize Twilio for TURN servers (optional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('Twilio initialized for TURN servers');
  } catch (error) {
    console.warn('Failed to initialize Twilio:', error.message);
  }
} else {
  console.log('Twilio credentials not provided - using basic STUN servers only');
}

// Connect to Redis
redisClient.connect().catch(console.error);

// Get ICE servers including TURN from Twilio
async function getIceServers() {
  try {
    if (!twilioClient) {
      // Return basic STUN servers if Twilio not configured
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];
    }

    const token = await twilioClient.tokens.create();
    return token.iceServers;
  } catch (error) {
    console.error('Error getting TURN servers:', error);
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining a room
  socket.on('join-room', async (data) => {
    const { roomId, nickname } = data;
    const participantId = socket.id;

    try {
      // Join the socket room
      socket.join(roomId);

      // Store participant details in Redis
      await redisClient.hSet(`participant:${participantId}`, {
        id: participantId,
        roomId: roomId,
        nickname: nickname,
        isMuted: 'false'
      });

      // Add participant to room presence set
      await redisClient.sAdd(`presence:${roomId}`, participantId);

      // Set TTL for cleanup (24 hours)
      await redisClient.expire(`participant:${participantId}`, 86400);
      await redisClient.expire(`presence:${roomId}`, 86400);

      // Get all participants in the room
      const participantIds = await redisClient.sMembers(`presence:${roomId}`);
      const allUsers = [];

      for (const id of participantIds) {
        if (id !== participantId) {
          const userData = await redisClient.hGetAll(`participant:${id}`);
          if (userData && userData.id) {
            allUsers.push({
              id: userData.id,
              nickname: userData.nickname,
              isMuted: userData.isMuted === 'true'
            });
          }
        }
      }

      // Get ICE servers
      const iceServers = await getIceServers();

      // Send room-joined event to the new user
      socket.emit('room-joined', { allUsers, iceServers });

      // Notify other users in the room
      const newUserData = await redisClient.hGetAll(`participant:${participantId}`);
      socket.to(roomId).emit('user-joined', {
        newUser: {
          id: newUserData.id,
          nickname: newUserData.nickname,
          isMuted: newUserData.isMuted === 'true'
        }
      });

      console.log(`User ${nickname} (${participantId}) joined room ${roomId}`);

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle WebRTC signaling
  socket.on('sending-signal', (data) => {
    const { userToSignal, callerID, signal } = data;
    io.to(userToSignal).emit('user-joined', { signal, callerID });
  });

  socket.on('returning-signal', (data) => {
    const { callerID, signal } = data;
    io.to(callerID).emit('receiving-returned-signal', { signal, id: socket.id });
  });

  // Handle user state updates (mute/unmute)
  socket.on('update-my-state', async (data) => {
    const { isMuted } = data;
    const participantId = socket.id;

    try {
      // Update user state in Redis
      await redisClient.hSet(`participant:${participantId}`, 'isMuted', isMuted.toString());

      // Get user's room
      const roomId = await redisClient.hGet(`participant:${participantId}`, 'roomId');
      
      if (roomId) {
        // Broadcast state change to room
        socket.to(roomId).emit('user-state-changed', {
          id: participantId,
          isMuted: isMuted
        });
      }

    } catch (error) {
      console.error('Error updating user state:', error);
    }
  });

  // Handle chat messages
  socket.on('send-chat-message', async (data) => {
    const { message, timestamp } = data;
    const participantId = socket.id;

    try {
      // Get user data and room
      const userData = await redisClient.hGetAll(`participant:${participantId}`);
      const roomId = userData.roomId;
      
      if (roomId && userData.nickname) {
        // Create message object
        const chatMessage = {
          id: uuidv4(),
          senderId: participantId,
          senderNickname: userData.nickname,
          message: message,
          timestamp: timestamp
        };

        // Broadcast message to all users in room (including sender)
        io.to(roomId).emit('broadcast-chat-message', chatMessage);
        
        console.log(`Chat message from ${userData.nickname} in room ${roomId}: ${message}`);
      }

    } catch (error) {
      console.error('Error handling chat message:', error);
    }
  });

  // Handle disconnection (critical for self-destruct)
  socket.on('disconnect', async () => {
    const participantId = socket.id;
    
    try {
      // Get user's room ID
      const roomId = await redisClient.hGet(`participant:${participantId}`, 'roomId');
      
      if (roomId) {
        // Start Redis transaction
        const multi = redisClient.multi();
        
        // Remove participant data
        multi.del(`participant:${participantId}`);
        
        // Remove from presence set
        multi.sRem(`presence:${roomId}`, participantId);
        
        // Get room member count
        multi.sCard(`presence:${roomId}`);
        
        // Execute transaction
        const results = await multi.exec();
        const memberCount = results[2];

        // If room is empty, clean up
        if (memberCount === 0) {
          await redisClient.del(`presence:${roomId}`);
          console.log(`Room ${roomId} destroyed - last participant left`);
        }

        // Notify other users
        socket.to(roomId).emit('user-left', { id: participantId });
        
        console.log(`User ${participantId} left room ${roomId}. Remaining: ${memberCount}`);
      }

    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Echoless backend server running on port ${PORT}`);
});