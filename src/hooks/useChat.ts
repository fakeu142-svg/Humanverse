import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket, useSocketEvent, useSocketEmit } from './useSocket';
import { useAuth } from './useAuth';
import { useAdminAuth } from './useAdminAuth';
import { setupUserChat, setupAdminSurveillance, socketActions } from '@/lib/socket';
import { toast } from 'react-hot-toast';

export interface ChatMessage {
  id: string;
  content: string;
  maskName: string;
  maskType: string;
  reactions: { [emoji: string]: number };
  upvotes: number;
  createdAt: Date;
  isFromAdmin?: boolean;
  userId?: string; // Only for admins
  userEmail?: string; // Only for admins
}

export interface ChatUser {
  maskName: string;
  isTyping?: boolean;
  lastSeen?: Date;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  userCount: number;
  maxUsers: number;
}

interface UseChatOptions {
  roomId: string | null;
  autoLoadHistory?: boolean;
  messageLimit?: number;
}

export function useChat({ roomId, autoLoadHistory = true, messageLimit = 50 }: UseChatOptions) {
  const { user, isAuthenticated: userAuthenticated } = useAuth();
  const { admin, isAuthenticated: adminAuthenticated } = useAdminAuth();
  const isAuthenticated = userAuthenticated || adminAuthenticated;
  const isAdmin = !!admin;

  // Socket configuration
  const socketConfig = isAuthenticated ? {
    token: isAdmin ? 'admin-token' : 'auth-token', // Would get actual tokens from cookies
    type: isAdmin ? 'admin' as const : 'user' as const
  } : null;

  const { socket, isConnected, isSocketAuthenticated } = useSocket(socketConfig, {
    onConnect: () => {
      if (roomId && isSocketAuthenticated) {
        joinRoom(roomId);
      }
    },
    onError: (error) => {
      toast.error(`Chat connection error: ${error.message}`);
    },
  });

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Refs for managing state
  const messagesRef = useRef<ChatMessage[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Socket emit helper
  const emit = useSocketEmit();

  // Load message history
  const loadMessageHistory = useCallback(async (before?: string) => {
    if (!roomId || !isAuthenticated) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages?limit=${messageLimit}${before ? `&before=${before}` : ''}`);
      const data = await response.json();

      if (data.success) {
        const newMessages = data.messages.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }));

        if (before) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
          messagesRef.current = newMessages;
        }

        setHasMoreHistory(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to load message history:', error);
      toast.error('Failed to load message history');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [roomId, isAuthenticated, messageLimit]);

  // Join room
  const joinRoom = useCallback(async (targetRoomId: string) => {
    if (!isConnected || !isSocketAuthenticated) return false;

    try {
      // API call to join room
      const response = await fetch(`/api/rooms/${targetRoomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to join room');
        return false;
      }

      // Socket join
      socketActions.joinRoom(targetRoomId);
      setCurrentRoom(data.room);

      // Load message history
      if (autoLoadHistory) {
        await loadMessageHistory();
      }

      return true;
    } catch (error) {
      console.error('Failed to join room:', error);
      toast.error('Failed to join room');
      return false;
    }
  }, [isConnected, isSocketAuthenticated, autoLoadHistory, loadMessageHistory]);

  // Leave room
  const leaveRoom = useCallback(() => {
    if (roomId && isConnected) {
      socketActions.leaveRoom(roomId);
      setCurrentRoom(null);
      setMessages([]);
      setUsers([]);
      setTypingUsers(new Set());
    }
  }, [roomId, isConnected]);

  // Send message
  const sendMessage = useCallback((content: string) => {
    if (!roomId || !isConnected || !content.trim()) return false;

    if (isAdmin) {
      // Admin can send as themselves or impersonate
      socketActions.sendMessage(roomId, content.trim());
    } else {
      socketActions.sendMessage(roomId, content.trim());
    }

    return true;
  }, [roomId, isConnected, isAdmin]);

  // Send admin impersonation message
  const sendAdminMessage = useCallback((content: string, targetUserId: string, maskName: string, maskType: string) => {
    if (!roomId || !isConnected || !isAdmin) return false;

    socketActions.sendAdminMessage(roomId, content.trim(), targetUserId, maskName, maskType);
    return true;
  }, [roomId, isConnected, isAdmin]);

  // Set typing status
  const setTyping = useCallback((isTyping: boolean) => {
    if (!roomId || !isConnected) return;

    socketActions.setTyping(roomId, isTyping);

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socketActions.setTyping(roomId, false);
      }, 3000);
    }
  }, [roomId, isConnected]);

  // React to message
  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    if (!roomId || !isConnected) return false;

    socketActions.reactToMessage(messageId, emoji, roomId);
    return true;
  }, [roomId, isConnected]);

  // Socket event handlers
  useSocketEvent('new-message', (data: any) => {
    const newMessage: ChatMessage = {
      ...data,
      createdAt: new Date(data.createdAt),
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      messagesRef.current = updated;
      return updated;
    });
  });

  useSocketEvent('user-joined', (data: any) => {
    setUsers(prev => {
      const existing = prev.find(u => u.maskName === data.maskName);
      if (existing) return prev;
      return [...prev, { maskName: data.maskName }];
    });

    if (!isAdmin) {
      toast.success(`${data.maskName} joined the conversation`, { duration: 2000 });
    }
  });

  useSocketEvent('user-left', (data: any) => {
    setUsers(prev => prev.filter(u => u.maskName !== data.maskName));
    setTypingUsers(prev => {
      const updated = new Set(prev);
      updated.delete(data.maskName);
      return updated;
    });

    if (!isAdmin) {
      toast(`${data.maskName} left the conversation`, { duration: 2000 });
    }
  });

  useSocketEvent('user-typing', (data: any) => {
    setTypingUsers(prev => {
      const updated = new Set(prev);
      if (data.isTyping) {
        updated.add(data.maskName);
      } else {
        updated.delete(data.maskName);
      }
      return updated;
    });

    // Auto-remove typing indicator after 5 seconds
    if (data.isTyping) {
      setTimeout(() => {
        setTypingUsers(prev => {
          const updated = new Set(prev);
          updated.delete(data.maskName);
          return updated;
        });
      }, 5000);
    }
  });

  useSocketEvent('message-reaction', (data: any) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === data.messageId 
          ? {
              ...msg,
              reactions: {
                ...msg.reactions,
                [data.emoji]: (msg.reactions[data.emoji] || 0) + 1
              }
            }
          : msg
      )
    );
  });

  useSocketEvent('room-joined', (data: any) => {
    setCurrentRoom(prev => prev ? { ...prev, userCount: data.userCount } : null);
  });

  useSocketEvent('error', (data: any) => {
    toast.error(data.error || 'Chat error occurred');
  });

  // Admin surveillance events
  useEffect(() => {
    if (!socket || !isAdmin) return;

    setupAdminSurveillance(socket, {
      onMessageIntercepted: (data) => {
        // Admin receives all messages with user identity
        console.log('🔍 Message intercepted:', data);
      },
      onTypingSurveillance: (data) => {
        console.log('🔍 Typing surveillance:', data);
      },
      onUserConnected: (data) => {
        console.log('🔍 User connected:', data);
      },
      onUserDisconnected: (data) => {
        console.log('🔍 User disconnected:', data);
      },
    });
  }, [socket, isAdmin]);

  // Auto-join room when roomId changes
  useEffect(() => {
    if (roomId && isConnected && isSocketAuthenticated) {
      joinRoom(roomId);
    }

    return () => {
      if (roomId) {
        leaveRoom();
      }
    };
  }, [roomId, isConnected, isSocketAuthenticated, joinRoom, leaveRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    messages,
    users,
    currentRoom,
    typingUsers: Array.from(typingUsers),
    isLoadingHistory,
    hasMoreHistory,
    isConnected,
    isAuthenticated: isSocketAuthenticated,

    // Actions
    sendMessage,
    sendAdminMessage: isAdmin ? sendAdminMessage : undefined,
    setTyping,
    reactToMessage,
    loadMessageHistory: () => loadMessageHistory(messages[0]?.createdAt.toISOString()),
    joinRoom,
    leaveRoom,

    // Admin features
    isAdmin,
    adminFeatures: isAdmin ? {
      disconnectUser: (socketId: string) => socketActions.adminDisconnectUser(socketId),
      monitorRoom: (targetRoomId: string) => socketActions.adminMonitorRoom(targetRoomId),
    } : undefined,
  };
}

// Hook for room list management
export function useRoomList() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms/list');
      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms);
      } else {
        setError(data.error || 'Failed to load rooms');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  return {
    rooms,
    isLoading,
    error,
    reload: loadRooms,
  };
}
