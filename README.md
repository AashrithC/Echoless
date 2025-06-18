# Echoless

A real-time, ephemeral audio chat application. Create temporary chat rooms that self-destruct when the last participant leaves.

## Features

- **Instant Room Creation**: Create audio chat rooms with a single click
- **Real-time Audio**: High-quality peer-to-peer audio streaming using WebRTC
- **Privacy First**: All data is deleted when the last person leaves
- **No Accounts**: No registration or login required
- **Shareable Links**: Invite others with a simple room link

## Architecture

- **Frontend**: Next.js with TypeScript, deployed on Vercel
- **Backend**: Node.js with Express and Socket.IO, deployed on Railway
- **Database**: Redis for ephemeral state management
- **WebRTC**: Twilio TURN servers for peer-to-peer connections

## Development Setup

### Prerequisites

- Node.js 18+ 
- Redis server
- Twilio account (optional, for TURN servers)

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your configuration:
```
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
```

5. Start Redis server (if running locally):
```bash
redis-server
```

6. Start the backend server:
```bash
npm run dev
```

The backend will be available at `http://localhost:3001`

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_WEBSOCKET_URL`: Your deployed backend URL

### Backend (Railway)

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   - `FRONTEND_URL`: Your deployed frontend URL
   - `REDIS_URL`: Railway Redis add-on URL
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token

## How It Works

1. **Room Creation**: Users create rooms via the frontend API route
2. **WebSocket Connection**: Users connect to the backend via Socket.IO
3. **WebRTC Signaling**: The backend facilitates WebRTC connection setup
4. **P2P Audio**: Audio streams directly between users (or via TURN relay)
5. **Self-Destruct**: When the last user leaves, all room data is deleted

## API Documentation

### REST Endpoints

- `POST /api/rooms` - Create a new room

### WebSocket Events

#### Client to Server
- `join-room` - Join a room with nickname
- `sending-signal` - Send WebRTC signal to another user
- `returning-signal` - Return WebRTC signal
- `update-my-state` - Update user state (mute/unmute)

#### Server to Client
- `room-joined` - Successfully joined room
- `user-joined` - New user joined the room
- `user-left` - User left the room
- `receiving-returned-signal` - Receive returned WebRTC signal
- `user-state-changed` - User state changed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
