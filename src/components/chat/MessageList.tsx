'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  surveillanceFlags?: string[];
  emotionalIntensity?: number;
  toxicityScore?: number;
  psychAnalysis?: {
    dominantEmotion: string;
    triggers: string[];
    vulnerabilityIndicators: string[];
  };
}

interface MessageListProps {
  messages: ChatMessage[];
  currentUserMask: string;
  onReaction: (messageId: string) => void;
  onUpvote: (messageId: string) => void;
  onMessageSelect: (message: ChatMessage) => void;
}

export function MessageList({
  messages,
  currentUserMask,
  onReaction,
  onUpvote,
  onMessageSelect
}: MessageListProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showSurveillanceData, setShowSurveillanceData] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const getMaskTypeConfig = (maskType: string) => {
    const configs = {
      ASH_FOX: { color: 'text-orange-400', bgColor: 'bg-orange-600/20', icon: '🦊' },
      VIOLET_CROW: { color: 'text-purple-400', bgColor: 'bg-purple-600/20', icon: '🐦' },
      ECHO_DUST: { color: 'text-gray-400', bgColor: 'bg-gray-600/20', icon: '🌪️' },
      IRON_SAGE: { color: 'text-green-400', bgColor: 'bg-green-600/20', icon: '🛡️' },
      GHOST_WIND: { color: 'text-blue-400', bgColor: 'bg-blue-600/20', icon: '👻' }
    };
    return configs[maskType as keyof typeof configs] || configs.GHOST_WIND;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  const isMessageExpiring = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const timeLeft = expiry.getTime() - now.getTime();
    return timeLeft < 5 * 60 * 1000; // Less than 5 minutes
  };

  const getEmotionalIntensityColor = (intensity?: number) => {
    if (!intensity) return 'text-gray-400';
    if (intensity >= 8) return 'text-red-500';
    if (intensity >= 6) return 'text-orange-500';
    if (intensity >= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getToxicityColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 0.8) return 'text-red-600';
    if (score >= 0.6) return 'text-orange-500';
    if (score >= 0.4) return 'text-yellow-500';
    return 'text-green-500';
  };

  const handleMessageClick = (message: ChatMessage) => {
    setSelectedMessageId(message.id === selectedMessageId ? null : message.id);
    onMessageSelect(message);
  };

  const handleReactionClick = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onReaction(messageId);
  };

  const handleUpvoteClick = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpvote(messageId);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
          <p>Be the first to start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={messagesContainerRef} className="space-y-4">
      {/* Surveillance Toggle (for debugging/admin view) */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowSurveillanceData(!showSurveillanceData)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {showSurveillanceData ? '🔒 Hide' : '👁️ Show'} Surveillance Data
        </button>
      </div>

      <AnimatePresence>
        {messages.map((message, index) => {
          const config = getMaskTypeConfig(message.maskType);
          const isOwnMessage = message.maskName === currentUserMask;
          const isSelected = message.id === selectedMessageId;
          const isExpiring = isMessageExpiring(message.expiresAt);
          
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                type: "spring",
                stiffness: 120
              }}
              className={`group relative ${
                isOwnMessage ? 'ml-8' : 'mr-8'
              }`}
              onClick={() => handleMessageClick(message)}
            >
              <div className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-300 ${
                isOwnMessage 
                  ? 'bg-white/10 border border-white/20 ml-auto max-w-xs md:max-w-md' 
                  : `${config.bgColor} border border-white/10 max-w-xs md:max-w-md`
              } ${isSelected ? 'ring-2 ring-white/50 shadow-lg' : ''} ${
                isExpiring ? 'animate-pulse border-red-500/50' : ''
              }`}>
                
                {/* Admin Impersonation Indicator */}
                {message.isFromAdmin && message.originalUserId && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                    👁️ Admin
                  </div>
                )}

                {/* Surveillance Flags */}
                {showSurveillanceData && message.surveillanceFlags && message.surveillanceFlags.length > 0 && (
                  <div className="absolute -top-2 -left-2 flex space-x-1">
                    {message.surveillanceFlags.map((flag, idx) => (
                      <span 
                        key={idx}
                        className="bg-orange-600 text-white text-xs px-1 py-0.5 rounded"
                        title={flag}
                      >
                        🚨
                      </span>
                    ))}
                  </div>
                )}

                {/* Message Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className={`font-semibold ${config.color}`}>
                      {message.maskName}
                    </span>
                    {message.expiresAt && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isExpiring ? 'bg-red-600/30 text-red-300' : 'bg-yellow-600/30 text-yellow-300'
                      }`}>
                        ⏱️ {isExpiring ? 'Expiring!' : 'Temporary'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(message.createdAt)}
                  </span>
                </div>

                {/* Message Content */}
                <div className="text-white leading-relaxed mb-3">
                  {message.content}
                </div>

                {/* Surveillance Data (Admin View) */}
                {showSurveillanceData && (
                  <div className="mt-3 space-y-1 text-xs bg-black/20 rounded-lg p-2">
                    {message.emotionalIntensity !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Emotional Intensity:</span>
                        <span className={getEmotionalIntensityColor(message.emotionalIntensity)}>
                          {message.emotionalIntensity}/10
                        </span>
                      </div>
                    )}
                    
                    {message.toxicityScore !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Toxicity Score:</span>
                        <span className={getToxicityColor(message.toxicityScore)}>
                          {Math.round(message.toxicityScore * 100)}%
                        </span>
                      </div>
                    )}
                    
                    {message.psychAnalysis?.dominantEmotion && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Dominant Emotion:</span>
                        <span className="text-purple-400 capitalize">
                          {message.psychAnalysis.dominantEmotion}
                        </span>
                      </div>
                    )}
                    
                    {message.psychAnalysis?.triggers && message.psychAnalysis.triggers.length > 0 && (
                      <div className="mt-1">
                        <span className="text-gray-400 text-xs">Triggers: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {message.psychAnalysis.triggers.map((trigger, idx) => (
                            <span 
                              key={idx}
                              className="bg-red-600/20 text-red-300 px-1 py-0.5 rounded text-xs"
                            >
                              {trigger}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Actions */}
                <div className="flex items-center justify-between mt-3">
                  {/* Reactions */}
                  <div className="flex items-center space-x-2">
                    {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => (
                      <div
                        key={emoji}
                        className="flex items-center space-x-1 bg-black/20 rounded-full px-2 py-1 text-xs"
                      >
                        <span>{emoji}</span>
                        <span className="text-gray-400">{users.length}</span>
                      </div>
                    ))}
                    
                    {/* Add Reaction Button */}
                    <button
                      onClick={(e) => handleReactionClick(message.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 rounded-full p-1 text-gray-400 hover:text-white"
                      title="Add reaction"
                    >
                      😊
                    </button>
                  </div>

                  {/* Upvotes */}
                  <button
                    onClick={(e) => handleUpvoteClick(message.id, e)}
                    className="flex items-center space-x-1 text-gray-400 hover:text-green-400 transition-colors"
                    title="Upvote message"
                  >
                    <span>👍</span>
                    <span className="text-xs">{message.upvotes}</span>
                  </button>
                </div>

                {/* Expiry Warning */}
                {isExpiring && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 p-2 bg-red-600/20 border border-red-500/30 rounded-lg"
                  >
                    <div className="flex items-center space-x-2 text-red-300 text-xs">
                      <span>⚠️</span>
                      <span>This message will expire soon</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Message Thread Indicator */}
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white/50 rounded-full"
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Auto-scroll indicator */}
      <div className="h-1" /> {/* Spacer for scroll target */}
    </div>
  );
}
