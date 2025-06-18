'use client';

import { useEffect, useState, useRef, useReducer } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';

interface User {
  id: string;
  nickname: string;
  isMuted: boolean;
}

interface PeerConnection {
  peer: Peer.Instance;
  stream?: MediaStream;
}

interface PeersState {
  [peerId: string]: PeerConnection;
}

type PeerAction = 
  | { type: 'ADD_PEER'; payload: { peerId: string; peer: Peer.Instance } }
  | { type: 'REMOVE_PEER'; payload: { peerId: string } }
  | { type: 'SET_PEER_STREAM'; payload: { peerId: string; stream: MediaStream } }
  | { type: 'SET_MUTE_STATUS'; payload: { peerId: string; isMuted: boolean } };

function peersReducer(state: PeersState, action: PeerAction): PeersState {
  switch (action.type) {
    case 'ADD_PEER':
      return {
        ...state,
        [action.payload.peerId]: {
          peer: action.payload.peer
        }
      };
    case 'REMOVE_PEER':
      const { [action.payload.peerId]: removed, ...rest } = state;
      if (removed?.peer) {
        removed.peer.destroy();
      }
      return rest;
    case 'SET_PEER_STREAM':
      return {
        ...state,
        [action.payload.peerId]: {
          ...state[action.payload.peerId],
          stream: action.payload.stream
        }
      };
    default:
      return state;
  }
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  
  const [nickname, setNickname] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [peers, dispatch] = useReducer(peersReducer, {});
  const socketRef = useRef<Socket | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const myAudioRef = useRef<HTMLAudioElement>(null);

  const joinRoom = async () => {
    if (!nickname.trim()) return;

    setIsConnecting(true);
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      myStreamRef.current = stream;

      // Connect to Socket.IO server
      const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001');
      socketRef.current = socket;

      // Set up socket event listeners
      socket.on('room-joined', ({ allUsers, iceServers }) => {
        setUsers(allUsers);
        
        // Create peer connections for existing users
        allUsers.forEach((user: User) => {
          createPeer(user.id, socket.id!, stream, iceServers);
        });
        
        setHasJoined(true);
        setIsConnecting(false);
      });

      socket.on('user-joined', ({ signal, callerID, newUser }) => {
        if (newUser) {
          setUsers(prev => [...prev, newUser]);
        }
        
        if (signal && callerID) {
          addPeer(signal, callerID, stream);
        }
      });

      socket.on('user-left', ({ id }) => {
        setUsers(prev => prev.filter(user => user.id !== id));
        dispatch({ type: 'REMOVE_PEER', payload: { peerId: id } });
      });

      socket.on('receiving-returned-signal', ({ signal, id }) => {
        const peer = peers[id]?.peer;
        if (peer) {
          peer.signal(signal);
        }
      });

      socket.on('user-state-changed', ({ id, isMuted }) => {
        setUsers(prev => prev.map(user => 
          user.id === id ? { ...user, isMuted } : user
        ));
      });

      // Join the room
      socket.emit('join-room', { roomId, nickname: nickname.trim() });

    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to access microphone or join room. Please check permissions.');
      setIsConnecting(false);
    }
  };

  const createPeer = (userToSignal: string, callerID: string, stream: MediaStream, iceServers: any[]) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: iceServers
      },
      stream
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('sending-signal', { userToSignal, callerID, signal });
    });

    peer.on('stream', (remoteStream) => {
      dispatch({ type: 'SET_PEER_STREAM', payload: { peerId: userToSignal, stream: remoteStream } });
    });

    dispatch({ type: 'ADD_PEER', payload: { peerId: userToSignal, peer } });
  };

  const addPeer = (incomingSignal: any, callerID: string, stream: MediaStream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('returning-signal', { signal, callerID });
    });

    peer.on('stream', (remoteStream) => {
      dispatch({ type: 'SET_PEER_STREAM', payload: { peerId: callerID, stream: remoteStream } });
    });

    peer.signal(incomingSignal);
    dispatch({ type: 'ADD_PEER', payload: { peerId: callerID, peer } });
  };

  const toggleMute = () => {
    if (myStreamRef.current) {
      const audioTrack = myStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        socketRef.current?.emit('update-my-state', { isMuted: !audioTrack.enabled });
      }
    }
  };

  const copyRoomLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach(track => track.stop());
    }
    Object.values(peers).forEach(({ peer }) => peer.destroy());
    window.location.href = '/';
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peers).forEach(({ peer }) => peer.destroy());
    };
  }, []);

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-gray-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-gray-300/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 w-full max-w-md shadow-xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                Create Room
              </h1>
              <p className="text-gray-600">
                Enter your nickname to join the conversation
              </p>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your nickname"
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-300"
                  maxLength={20}
                  onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                />
              </div>
              
              <button
                onClick={joinRoom}
                disabled={!nickname.trim() || isConnecting}
                className="w-full text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-xl disabled:cursor-not-allowed"
                style={isConnecting ? {
                  backgroundColor: '#9CA3AF'
                } : {
                  backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                  backgroundSize: '400% 400%',
                  animation: 'rainbow 8s ease-in-out infinite'
                }}
              >
                <span className="flex items-center justify-center space-x-2">
                  {isConnecting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Join</span>
                    </>
                  )}
                </span>
              </button>
            </div>

            <div className="mt-8 text-center space-y-3">
              <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span>We'll need microphone access to join</span>
              </div>
              <p className="text-gray-400 text-xs">
                Your voice will be transmitted securely via peer-to-peer connection
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gray-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-gray-300/15 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 mb-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                     style={{
                       backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                       backgroundSize: '400% 400%',
                       animation: 'rainbow 8s ease-in-out infinite'
                     }}>
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                    <span className="text-gray-900">Echoless Room</span>
                  </h1>
                  <style jsx>{`
                    @keyframes rainbow {
                      0% { background-position: 0% 50%; }
                      50% { background-position: 100% 50%; }
                      100% { background-position: 0% 50%; }
                    }
                  `}</style>
                  <p className="text-gray-600 text-sm">{users.length + 1} {users.length === 0 ? 'participant' : 'participants'} connected</p>
                </div>
              </div>
              <button
                onClick={leaveRoom}
                className="text-white px-4 py-2 rounded-2xl transition-all duration-300 transform hover:scale-105"
                style={{
                  backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                  backgroundSize: '400% 400%',
                  animation: 'rainbow 8s ease-in-out infinite'
                }}
              >
                Leave Room
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={toggleMute}
                className="group px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 text-white"
                style={{
                  backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                  backgroundSize: '400% 400%',
                  animation: 'rainbow 8s ease-in-out infinite'
                }}
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    {isMuted ? (
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM17.707 9.293a1 1 0 010 1.414L15.414 13l2.293 2.293a1 1 0 11-1.414 1.414L14 14.414l-2.293 2.293a1 1 0 01-1.414-1.414L12.586 13l-2.293-2.293a1 1 0 011.414-1.414L14 11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    ) : (
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    )}
                  </svg>
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </span>
              </button>

              <button
                onClick={copyRoomLink}
                className="group px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 text-white"
                style={{
                  backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                  backgroundSize: '400% 400%',
                  animation: 'rainbow 8s ease-in-out infinite'
                }}
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"></path>
                    <path d="M3 5a2 2 0 012-2 3 3 0 003 3h6a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2V9h-2v2z"></path>
                  </svg>
                  <span>{copySuccess ? 'Copied!' : 'Copy Link'}</span>
                </span>
              </button>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white/90 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
              <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
              </svg>
              <span>Participants ({users.length + 1})</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Current user */}
              <div className="group bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 transition-all duration-300 hover:bg-white hover:scale-105 shadow-sm hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{
                           backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                           backgroundSize: '400% 400%',
                           animation: 'rainbow 8s ease-in-out infinite'
                         }}>
                      <span className="text-white font-semibold text-sm">{nickname.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-gray-900 font-medium block">{nickname}</span>
                      <span className="text-gray-600 text-xs">You</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                       style={{
                         backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                         backgroundSize: '400% 400%',
                         animation: 'rainbow 8s ease-in-out infinite'
                       }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      {isMuted ? (
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM17.707 9.293a1 1 0 010 1.414L15.414 13l2.293 2.293a1 1 0 11-1.414 1.414L14 14.414l-2.293 2.293a1 1 0 01-1.414-1.414L12.586 13l-2.293-2.293a1 1 0 011.414-1.414L14 11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      )}
                    </svg>
                  </div>
                </div>
              </div>

              {/* Other users */}
              {users.map((user) => (
                <div key={user.id} className="group bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 transition-all duration-300 hover:bg-white hover:scale-105 shadow-sm hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                           style={{
                             backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                             backgroundSize: '400% 400%',
                             animation: 'rainbow 8s ease-in-out infinite'
                           }}>
                        <span className="text-white font-semibold text-sm">{user.nickname.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-gray-900 font-medium block">{user.nickname}</span>
                        <span className="text-gray-600 text-xs">Participant</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                         style={{
                           backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                           backgroundSize: '400% 400%',
                           animation: 'rainbow 8s ease-in-out infinite'
                         }}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        {user.isMuted ? (
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM17.707 9.293a1 1 0 010 1.414L15.414 13l2.293 2.293a1 1 0 11-1.414 1.414L14 14.414l-2.293 2.293a1 1 0 01-1.414-1.414L12.586 13l-2.293-2.293a1 1 0 011.414-1.414L14 11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        )}
                      </svg>
                    </div>
                  </div>
                  {peers[user.id]?.stream && (
                    <audio
                      autoPlay
                      playsInline
                      ref={(audio) => {
                        if (audio && peers[user.id]?.stream) {
                          audio.srcObject = peers[user.id].stream;
                        }
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
                     style={{
                       backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                       backgroundSize: '400% 400%',
                       animation: 'rainbow 8s ease-in-out infinite'
                     }}>
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                  </svg>
                </div>
                <h3 className="text-gray-900 font-semibold mb-2">You're alone in this room</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Share the room link to start your conversation. They'll join instantly with no signup required.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}