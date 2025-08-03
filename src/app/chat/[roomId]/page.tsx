'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { useAuth } from '@/hooks/useAuth';
import { useMaskStore } from '@/store/maskStore';

interface RoomDetails {
  id: string;
  name: string;
  description: string;
  type: 'PUBLIC' | 'TRUTH_GAME' | 'DROP_ZONE' | 'ADMIN_CONTROLLED';
  isActive: boolean;
  maxUsers: number;
  currentUsers: number;
  adminMonitored: boolean;
  createdAt: string;
}

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { activeMask } = useMaskStore();
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const roomId = params.roomId as string;

  useEffect(() => {
    if (user && roomId) {
      loadRoomDetails();
    }
  }, [user, roomId]);

  const loadRoomDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('Room not found');
        } else if (response.status === 403) {
          setError('Access denied to this room');
        } else {
          setError('Failed to load room details');
        }
        return;
      }

      const data = await response.json();
      setRoomDetails(data.room);

      // Check if room is full
      if (data.room.currentUsers >= data.room.maxUsers) {
        setError('This room is currently full');
        return;
      }

      // Check if room is active
      if (!data.room.isActive) {
        setError('This room is not currently active');
        return;
      }

    } catch (err) {
      console.error('Load room details error:', err);
      setError('Failed to connect to room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!activeMask || !roomDetails) return;

    try {
      setJoining(true);

      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          maskName: activeMask.name,
          maskType: activeMask.type
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join room');
      }

      // Successfully joined - the ChatRoom component will handle the connection
    } catch (err) {
      console.error('Join room error:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  // Redirect if no user
  if (!user) {
    router.push('/login');
    return null;
  }

  // Redirect if no mask
  if (!activeMask) {
    router.push('/mask-selection');
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Loading chat room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !roomDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {error || 'Room not available'}
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/chat')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Chat Rooms
            </button>
            <div>
              <button
                onClick={loadRoomDetails}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Room entry confirmation
  if (!joining && roomDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-8 max-w-md w-full mx-4 border border-white/10">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">
              {roomDetails.type === 'PUBLIC' ? '💬' :
               roomDetails.type === 'TRUTH_GAME' ? '🎭' :
               roomDetails.type === 'DROP_ZONE' ? '📍' : '🔒'}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{roomDetails.name}</h2>
            <p className="text-gray-300">{roomDetails.description}</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Room Type:</span>
              <span className="text-white">{roomDetails.type.replace('_', ' ')}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Current Users:</span>
              <span className="text-white">{roomDetails.currentUsers}/{roomDetails.maxUsers}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Your Mask:</span>
              <span className="text-blue-400">{activeMask.name}</span>
            </div>
            
            {roomDetails.adminMonitored && (
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-orange-400 text-sm">
                  <span>👁️</span>
                  <span>This room is monitored by administrators</span>
                </div>
              </div>
            )}

            {roomDetails.type === 'TRUTH_GAME' && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-purple-400 text-sm">
                  <span>🎭</span>
                  <span>Truth game conversations are psychologically analyzed</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={joinRoom}
              disabled={joining}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {joining ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Joining...</span>
                </div>
              ) : (
                'Join Room'
              )}
            </button>
            
            <button
              onClick={() => router.push('/chat')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Back to Rooms
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main chat room interface
  return (
    <ChatRoom
      roomId={roomId}
      roomName={roomDetails.name}
      roomType={roomDetails.type}
    />
  );
}
