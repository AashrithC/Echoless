# Echoless

A real-time, ephemeral audio chat application. Create temporary chat rooms that self-destruct when the last participant leaves.

## Features

- **Instant Room Creation**: Create audio chat rooms with a single click
- **Real-time Audio**: High-quality peer-to-peer audio streaming using WebRTC
- **Ephemeral Text Chat**: Send messages that disappear when the room is destroyed
- **Privacy First**: All data is deleted when the last person leaves
- **No Accounts**: No registration or login required
- **Shareable Links**: Invite others with a simple room link

## Architecture

- **Frontend**: Next.js with TypeScript, deployed on Vercel
- **Backend**: Node.js with Express and Socket.IO, deployed on Fly.io
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
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080
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
PORT=8080
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

The backend will be available at `http://localhost:8080`

## Deployment

### Prerequisites

- GitHub repository with your code
- Free accounts on [Vercel](https://vercel.com) and [Fly.io](https://fly.io)
- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed locally
- Optional: [Twilio account](https://console.twilio.com/) for TURN servers

### Step 1: Deploy Backend to Fly.io

1. **Install Fly CLI and authenticate:**
   ```bash
   # Install flyctl (if not already installed)
   curl -L https://fly.io/install.sh | sh
   
   # Login to Fly.io
   flyctl auth login
   ```

2. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

3. **Initialize Fly app:**
   ```bash
   flyctl launch --no-deploy
   ```
   - Choose a unique app name (e.g., `echoless-backend-yourname`)
   - Select a region closest to your users
   - Don't deploy yet - we need to set up environment variables first

4. **Add Redis database:**
   ```bash
   flyctl redis create
   ```
   - Choose the same region as your app
   - Copy the Redis connection URL provided

5. **Set environment variables:**
   ```bash
   flyctl secrets set REDIS_URL="your_redis_connection_url"
   flyctl secrets set TWILIO_ACCOUNT_SID="your_twilio_sid" # optional
   flyctl secrets set TWILIO_AUTH_TOKEN="your_twilio_token" # optional
   flyctl secrets set FRONTEND_URL="https://localhost:3000" # temporary
   ```

6. **Deploy the backend:**
   ```bash
   flyctl deploy
   ```

7. **Get your backend URL:**
   ```bash
   flyctl info
   ```
   Copy the hostname (e.g., `echoless-backend-yourname.fly.dev`)

### Step 2: Deploy Frontend to Vercel

1. Log in to Vercel and click "Add New... -> Project"
2. Select your GitHub repository
3. Add environment variable:
   - `NEXT_PUBLIC_WEBSOCKET_URL`: Your Fly.io backend URL with `wss://` protocol
   - Example: `wss://echoless-backend-yourname.fly.dev`
4. Click "Deploy"
5. Copy your Vercel frontend URL after deployment completes

### Step 3: Update Backend Configuration

1. **Update backend with frontend URL:**
   ```bash
   cd backend
   flyctl secrets set FRONTEND_URL="https://your-vercel-url.vercel.app"
   ```

2. **Verify deployment:**
   ```bash
   flyctl logs
   ```

### Step 4: Configure Custom Domain (Optional)

#### For Frontend (Vercel)

1. In your Vercel project dashboard, go to "Settings" → "Domains"
2. Add your custom domain (e.g., `echoless.yourdomain.com`)
3. Follow Vercel's DNS configuration instructions:
   - **For subdomain**: Add a CNAME record pointing to `cname.vercel-dns.com`
   - **For apex domain**: Add A records pointing to Vercel's IP addresses
4. Wait for DNS propagation (usually 5-60 minutes)
5. Vercel will automatically provision an SSL certificate

#### For Backend (Fly.io) - Optional

1. **Add custom domain to Fly app:**
   ```bash
   cd backend
   flyctl certs create api.yourdomain.com
   ```

2. **Configure DNS:**
   - Add a CNAME record pointing to your Fly.io app
   - Fly.io will provide the exact DNS configuration needed

3. **Verify certificate:**
   ```bash
   flyctl certs show api.yourdomain.com
   ```

#### Update Environment Variables for Custom Domains

After setting up custom domains, update your environment variables:

**In Vercel (Frontend):**
- Update `NEXT_PUBLIC_WEBSOCKET_URL` to use your custom backend domain
- Example: `wss://api.yourdomain.com`

**In Fly.io (Backend):**
- Update `FRONTEND_URL` to use your custom frontend domain:
  ```bash
  flyctl secrets set FRONTEND_URL="https://echoless.yourdomain.com"
  ```

#### DNS Configuration Example

For a domain like `yourdomain.com`, add these DNS records:

```
Type    Name        Value
CNAME   echoless    cname.vercel-dns.com
CNAME   api         your-app-name.fly.dev
```

Your app is now live with your custom domain! 🎉

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
- `send-chat-message` - Send a text message to the room

#### Server to Client
- `room-joined` - Successfully joined room
- `user-joined` - New user joined the room
- `user-left` - User left the room
- `receiving-returned-signal` - Receive returned WebRTC signal
- `user-state-changed` - User state changed
- `broadcast-chat-message` - Receive a text message from another user

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
