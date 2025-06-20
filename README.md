# Echoless: Real-time Ephemeral Audio Chat

A web-based audio-only chat application where conversations are permanently deleted the moment the last person leaves the room.

> **Suggestion**: Create a short screen recording of two browser windows interacting and convert it to a GIF to showcase the real-time audio chat functionality.

## Core Concept

Echoless solves the problem of "digital residue" from casual online conversations. It provides a platform for creating temporary, audio-only chat rooms that are ephemeral by design. By leveraging WebRTC for direct peer-to-peer audio streams and a Redis-backed presence system, the application ensures that once a conversation is over, it's gone for good.

## Technical Architecture

The system uses a decoupled frontend and backend to optimize for scalability and maintainability.

- **Frontend (Next.js on Vercel)**: A server-rendered React application responsible for the UI and all client-side logic. It handles the initial HTTP request to create a room.
- **Signaling Server (Node.js/Express on Fly.io)**: A stateful WebSocket server that manages user presence, signaling for WebRTC handshakes, and chat message broadcasting. It is the authority for the "self-destruct" mechanism.
- **Database (Redis)**: An in-memory data store used for its speed in managing the real-time state of active rooms and participant lists. No conversation data is ever stored here.
- **WebRTC**: Enables direct peer-to-peer, low-latency audio streaming between clients, minimizing server load and enhancing privacy.

## Technology Stack

### Frontend
- **Framework**: Next.js / React
- **Language**: TypeScript
- **Real-time**: Socket.IO Client, Simple-Peer (for WebRTC)
- **Styling**: Tailwind CSS

### Backend
- **Framework**: Node.js / Express
- **Language**: JavaScript
- **Real-time**: Socket.IO
- **Database**: Redis

## Key Features

- 🎙️ **Crystal Clear Audio**: High-quality peer-to-peer voice streaming
- 🔒 **Zero Persistence**: Conversations are permanently deleted when rooms empty
- ⚡ **Instant Connection**: No sign-up required, join with just a nickname
- 💬 **Integrated Chat**: Real-time text messaging alongside voice
- 📱 **Cross-Platform**: Works on desktop and mobile browsers
- 🌐 **Global Reach**: STUN/TURN server support for worldwide connectivity

## File Structure

The repository is structured as a monorepo with two primary packages:

```
/
├── src/                  # Next.js frontend application
│   ├── app/
│   │   ├── page.tsx     # Landing page with room creation
│   │   └── room/        # Room interface and WebRTC logic
│   └── ...
├── backend/              # Node.js/Express signaling server
│   ├── index.js         # Main server with Socket.IO handlers
│   └── package.json
├── public/              # Static assets
└── README.md
```

## Running the Development Environment

To run this project locally, you will need Node.js, npm, and a running Redis instance.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/echoless.git
cd echoless
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../
npm install
```

### 4. Set up environment variables

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:8080
```

**Backend (.env):**
```bash
# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Optional: Twilio for TURN servers (improves connectivity)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
```

### 5. Start Redis

Make sure you have Redis running locally:
```bash
redis-server
```

### 6. Run the servers

**Start the backend server:**
```bash
cd backend
npm start
```

**Start the frontend development server:**
```bash
cd ../
npm run dev
```

The application will be available at `http://localhost:3000`.

## How It Works

1. **Room Creation**: Users create ephemeral rooms with a unique ID
2. **WebRTC Signaling**: The backend facilitates peer-to-peer connection establishment
3. **Audio Streaming**: Direct P2P audio streams between participants using WebRTC
4. **Presence Management**: Redis tracks active participants in real-time
5. **Self-Destruction**: Rooms are automatically deleted when the last participant leaves

## WebRTC Implementation Details

- **Peer-to-Peer Audio**: Uses `simple-peer` library for WebRTC abstraction
- **STUN/TURN Servers**: Configurable ICE servers for NAT traversal
- **Signaling**: Custom Socket.IO events for offer/answer exchange
- **Audio Processing**: Includes echo cancellation, noise suppression, and auto gain control

## Contributing

This is a portfolio project, but suggestions and feedback are welcome! Feel free to open issues or submit pull requests.

## License

This project is open source and available under the [MIT License](LICENSE).