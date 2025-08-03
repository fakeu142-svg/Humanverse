'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useMaskStore } from '@/store/maskStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ReactionPanel } from './ReactionPanel';

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  roomType: 'PUBLIC' | 'TRUTH_GAME' | 'DROP_ZONE' | 'ADMIN_CONTROLLED';
}

interface ChatMessage {
  id: string;
  content: string;
  maskName: string;
  maskType: string;
  userId: string;
  reactions?: Record<string, string[]>;
  upvotes: number;
  expiresAt?: string;
  createdAt: string;
  isFromAdmin: boolean;
  originalUserId?: string;
}

interface TypingUser {
  maskName: string;
  maskType: string;
  timestamp: number;
}

export function ChatRoom({ roomId, roomName, roomType }: ChatRoomProps) {
  const { user } = useAuth();
  const { activeMask } = useMaskStore();
  const { socket, isConnected } = useSocket();
  const { 
    messages, 
    joinRoom, 
    sendMessage, 
    addReaction, 
    upvoteMessage,
    loading 
  } = useChat(roomId);

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showReactionPanel, setShowReactionPanel] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [roomUsers, setRoomUsers] = useState<number>(0);
  const [isAdminMonitored, setIsAdminMonitored] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingRef = useRef<number>(0);

  useEffect(() => {
    if (user && activeMask && socket) {
      joinRoom(roomId, activeMask.name);
      
      // Socket event listeners
      socket.on('userJoined', handleUserJoined);
      socket.on('userLeft', handleUserLeft);
      socket.on('userTyping', handleUserTyping);
      socket.on('userStoppedTyping', handleUserStoppedTyping);
      socket.on('roomUserCount', handleRoomUserCount);
      socket.on('adminPresence', handleAdminPresence);
      socket.on('messageReaction', handleMessageReaction);
      socket.on('messageUpvote', handleMessageUpvote);
      
      return () => {
        socket.off('userJoined', handleUserJoined);
        socket.off('userLeft', handleUserLeft);
        socket.off('userTyping', handleUserTyping);
        socket.off('userStoppedTyping', handleUserStoppedTyping);
        socket.off('roomUserCount', handleRoomUserCount);
        socket.off('adminPresence', handleAdminPresence);
        socket.off('messageReaction', handleMessageReaction);
        socket.off('messageUpvote', handleMessageUpvote);
      };
    }
  }, [user, activeMask, socket, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUserJoined = (data: { maskName: string; maskType: string }) => {
    // Show subtle notification
    console.log(`${data.maskName} joined the room`);
  };

  const handleUserLeft = (data: { maskName: string }) => {
    console.log(`${data.maskName} left the room`);
    // Remove from typing users
    setTypingUsers(prev => prev.filter(u => u.maskName !== data.maskName));
  };

  const handleUserTyping = (data: { maskName: string; maskType: string }) => {
    if (data.maskName !== activeMask?.name) {
      setTypingUsers(prev => {
        const existing = prev.find(u => u.maskName === data.maskName);
        if (existing) {
          return prev.map(u => 
            u.maskName === data.maskName 
              ? { ...u, timestamp: Date.now() }
              : u
          );
        }
        return [...prev, { ...data, timestamp: Date.now() }];
      });
    }
  };

  const handleUserStoppedTyping = (data: { maskName: string }) => {
    setTypingUsers(prev => prev.filter(u => u.maskName !== data.maskName));
  };

  const handleRoomUserCount = (count: number) => {
    setRoomUsers(count);
  };

  const handleAdminPresence = (data: { present: boolean; adminCount: number }) => {
    setIsAdminMonitored(data.present);
  };

  const handleMessageReaction = (data: { messageId: string; reaction: string; maskName: string; add: boolean }) => {
    // This would update the message reactions in real-time
    console.log('Message reaction:', data);
  };

  const handleMessageUpvote = (data: { messageId: string; upvotes: number }) => {
    // This would update the message upvotes in real-time
    console.log('Message upvote:', data);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeMask) return;
    
    try {
      await sendMessage(content, activeMask.name, activeMask.type);
      stopTyping();
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleTyping = () => {
    if (!activeMask || !socket) return;
    
    const now = Date.now();
    if (now - lastTypingRef.current > 1000) { // Throttle typing events
      socket.emit('typing', {
        roomId,
        maskName: activeMask.name,
        maskType: activeMask.type
      });
      lastTypingRef.current = now;
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const stopTyping = () => {
    if (isTyping && socket && activeMask) {
      socket.emit('stopTyping', {
        roomId,
        maskName: activeMask.name
      });
      setIsTyping(false);
    }
  };

  const handleReaction = async (messageId: string, reaction: string) => {
    if (!activeMask) return;
    
    try {
      await addReaction(messageId, reaction, activeMask.name);
      setShowReactionPanel(null);
    } catch (error) {
      console.error('Add reaction error:', error);
    }
  };

  const handleUpvote = async (messageId: string) => {
    try {
      await upvoteMessage(messageId);
    } catch (error) {
      console.error('Upvote error:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getRoomTypeConfig = () => {
    const configs = {
      PUBLIC: {
        color: 'from-blue-900 to-blue-700',
        icon: '💬',
        description: 'Open conversation for all anonymous users'
      },
      TRUTH_GAME: {
        color: 'from-purple-900 to-purple-700',
        icon: '🎭',
        description: 'Truth game discussions and confessions'
      },
      DROP_ZONE: {
        color: 'from-green-900 to-green-700',
        icon: '📍',
        description: 'Location-based secret sharing'
      },
      ADMIN_CONTROLLED: {
        color: 'from-red-900 to-red-700',
        icon: '🔒',
        description: 'Admin moderated environment'
      }
    };
    return configs[roomType] || configs.PUBLIC;
  };

  const config = getRoomTypeConfig();

  if (!user || !activeMask) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-gray-400">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p>Please log in and select a mask to enter the chat room</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.color} flex flex-col`}>
      {/* Chat Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/30 backdrop-blur-md border-b border-white/10 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-3xl">{config.icon}</div>
            <div>
              <h1 className="text-2xl font-bold text-white">{roomName}</h1>
              <p className="text-gray-300 text-sm">{config.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              isConnected ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="text-xs font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* User Count */}
            <div className="bg-white/10 px-3 py-1 rounded-full text-white text-sm">
              {roomUsers} users
            </div>
            
            {/* Admin Monitoring Indicator */}
            {isAdminMonitored && (
              <div className="bg-orange-600/20 text-orange-400 px-3 py-1 rounded-full text-xs flex items-center space-x-1">
                <span>👁️</span>
                <span>Admin Monitored</span>
              </div>
            )}
            
            {/* Current Mask */}
            <div className="bg-black/20 px-3 py-1 rounded-full text-white text-sm">
              {activeMask.name}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chat Messages Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full"></div>
              <span className="ml-3 text-white">Loading messages...</span>
            </div>
          ) : (
            <MessageList
              messages={messages}
              currentUserMask={activeMask.name}
              onReaction={(messageId) => setShowReactionPanel(messageId)}
              onUpvote={handleUpvote}
              onMessageSelect={setSelectedMessage}
            />
          )}
          
          {/* Typing Indicators */}
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center space-x-2 text-gray-400 text-sm px-4"
              >
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span>
                  {typingUsers.map(u => u.maskName).join(', ')} 
                  {typingUsers.length === 1 ? ' is' : ' are'} typing...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/10"
        >
          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            onStopTyping={stopTyping}
            disabled={!isConnected}
            maskName={activeMask.name}
            roomType={roomType}
          />
        </motion.div>
      </div>

      {/* Reaction Panel */}
      <AnimatePresence>
        {showReactionPanel && (
          <ReactionPanel
            messageId={showReactionPanel}
            onReaction={handleReaction}
            onClose={() => setShowReactionPanel(null)}
          />
        )}
      </AnimatePresence>

      {/* Room Atmosphere Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-white/3 rounded-full blur-2xl"></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-white/4 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
