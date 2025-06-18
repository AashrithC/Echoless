'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const createRoom = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const { roomId } = await response.json();
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gray-300/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-12 max-w-2xl w-full">
          {/* Hero Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-7xl md:text-8xl font-bold tracking-tight relative" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500" 
                      style={{
                        backgroundSize: '400% 400%',
                        animation: 'rainbow 8s ease-in-out infinite'
                      }}>
                  Echoless
                </span>
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 mx-auto rounded-full"
                   style={{
                     backgroundSize: '400% 400%',
                     animation: 'rainbow 8s ease-in-out infinite'
                   }}></div>
              <style jsx>{`
                @keyframes rainbow {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
              `}</style>
            </div>
            <p className="text-xl md:text-2xl text-gray-600 font-normal leading-relaxed max-w-xl mx-auto">
              Create ephemeral audio chat rooms that 
              <span className="text-gray-800 font-semibold"> vanish without a trace</span>
            </p>
          </div>

          {/* CTA Section */}
          <div className="space-y-6">
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="group relative px-8 py-4 text-white font-semibold rounded-2xl text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed"
              style={isCreating ? {
                backgroundColor: '#9CA3AF'
              } : {
                backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                backgroundSize: '400% 400%',
                animation: 'rainbow 8s ease-in-out infinite'
              }}
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Room...</span>
                  </>
                ) : (
                  <>
                    <span>Create New Room</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </span>
            </button>
            
            <p className="text-gray-500 text-sm max-w-lg mx-auto leading-relaxed">
              No accounts • No history • No traces<br />
              <span className="text-gray-700 font-medium">Everything disappears when the last person leaves</span>
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="group p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform mx-auto"
                   style={{
                     backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                     backgroundSize: '400% 400%',
                     animation: 'rainbow 8s ease-in-out infinite'
                   }}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-semibold mb-2 text-center">Instant Creation</h3>
              <p className="text-gray-600 text-sm text-center">One click to create. Share the link immediately.</p>
            </div>
            
            <div className="group p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform mx-auto"
                   style={{
                     backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                     backgroundSize: '400% 400%',
                     animation: 'rainbow 8s ease-in-out infinite'
                   }}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"/>
                  <path d="M15.536 8.464a1 1 0 111.414 1.414 4 4 0 010 5.657 1 1 0 11-1.414-1.414 2 2 0 000-2.829z"/>
                  <path d="M17.95 6.05a1 1 0 111.414 1.415 7 7 0 010 9.9 1 1 0 11-1.414-1.414 5 5 0 000-7.071z"/>
                </svg>
              </div>
              <h3 className="text-gray-900 font-semibold mb-2 text-center">Crystal Clear Audio</h3>
              <p className="text-gray-600 text-sm text-center">High-quality peer-to-peer voice streaming.</p>
            </div>
            
            <div className="group p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform mx-auto"
                   style={{
                     backgroundImage: 'linear-gradient(-45deg, #ef4444, #f59e0b, #10b981, #3b82f6, #6366f1, #8b5cf6)',
                     backgroundSize: '400% 400%',
                     animation: 'rainbow 8s ease-in-out infinite'
                   }}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-gray-900 font-semibold mb-2 text-center">Privacy First</h3>
              <p className="text-gray-600 text-sm text-center">Self-destructing rooms. Zero data retention.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
