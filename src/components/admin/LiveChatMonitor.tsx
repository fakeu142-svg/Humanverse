'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';

interface MonitoredMessage {
  id: string;
  roomId: string;
  roomName: string;
  content: string;
  maskName: string;
  maskType: string;
  userId: string;
  userEmail?: string;
  emotionalIntensity: number;
  toxicityScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  psychAnalysis: {
    dominantEmotion: string;
    triggers: string[];
    vulnerabilityIndicators: string[];
    manipulationOpportunities: string[];
  };
  surveillanceFlags: string[];
  timestamp: string;
  ipAddress?: string;
  deviceInfo?: any;
}

interface LiveUser {
  userId: string;
  email: string;
  maskName: string;
  maskType: string;
  roomId: string;
  roomName: string;
  isTyping: boolean;
  lastActivity: string;
  riskScore: number;
  alertCount: number;
}

export function LiveChatMonitor() {
  const { admin } = useAdminAuth();
  const { 
    liveMessages, 
    activeSurveillance, 
    startSurveillance, 
    stopSurveillance,
    flagMessage,
    blockUser,
    infiltrateRoom
  } = useAdminSurveillance();

  const [messages, setMessages] = useState<MonitoredMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<LiveUser[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'CRITICAL'>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showUserDetails, setShowUserDetails] = useState<string | null>(null);
  const [infiltrationMode, setInfiltrationMode] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (admin) {
      initializeLiveSurveillance();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [admin]);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const initializeLiveSurveillance = async () => {
    try {
      // Start real-time surveillance
      await startSurveillance();
      
      // Connect to admin surveillance WebSocket
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/admin/surveillance/live`;
      socketRef.current = new WebSocket(wsUrl);
      
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleSurveillanceEvent(data);
      };
      
      socketRef.current.onerror = (error) => {
        console.error('Surveillance WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to initialize surveillance:', error);
    }
  };

  const handleSurveillanceEvent = (data: any) => {
    switch (data.type) {
      case 'NEW_MESSAGE':
        addMonitoredMessage(data.message);
        break;
      case 'USER_ACTIVITY':
        updateUserActivity(data.user);
        break;
      case 'RISK_ALERT':
        handleRiskAlert(data.alert);
        break;
      case 'USER_JOINED':
        addActiveUser(data.user);
        break;
      case 'USER_LEFT':
        removeActiveUser(data.userId);
        break;
    }
  };

  const addMonitoredMessage = (message: MonitoredMessage) => {
    // Apply filters
    if (selectedRoom !== 'all' && message.roomId !== selectedRoom) return;
    if (riskFilter !== 'ALL' && message.riskLevel !== riskFilter && message.riskLevel !== 'CRITICAL') return;

    setMessages(prev => [message, ...prev].slice(0, 1000)); // Keep last 1000 messages
  };

  const updateUserActivity = (user: LiveUser) => {
    setActiveUsers(prev => {
      const existing = prev.find(u => u.userId === user.userId);
      if (existing) {
        return prev.map(u => u.userId === user.userId ? { ...u, ...user } : u);
      }
      return [user, ...prev];
    });
  };

  const addActiveUser = (user: LiveUser) => {
    setActiveUsers(prev => {
      if (!prev.find(u => u.userId === user.userId)) {
        return [user, ...prev];
      }
      return prev;
    });
  };

  const removeActiveUser = (userId: string) => {
    setActiveUsers(prev => prev.filter(u => u.userId !== userId));
  };

  const handleRiskAlert = (alert: any) => {
    // Show critical alerts
    if (alert.severity === 'CRITICAL') {
      // Flash the UI or show notification
    }
  };

  const handleFlagMessage = async (messageId: string, reason: string) => {
    try {
      await flagMessage(messageId, reason);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, surveillanceFlags: [...msg.surveillanceFlags, reason] }
          : msg
      ));
    } catch (error) {
      console.error('Flag message error:', error);
    }
  };

  const handleBlockUser = async (userId: string, reason: string) => {
    try {
      await blockUser(userId, reason);
      setActiveUsers(prev => prev.filter(u => u.userId !== userId));
      setMessages(prev => prev.filter(msg => msg.userId !== userId));
    } catch (error) {
      console.error('Block user error:', error);
    }
  };

  const handleInfiltrate = async (roomId: string, targetUserId?: string) => {
    try {
      await infiltrateRoom(roomId, targetUserId);
      setInfiltrationMode(true);
      setSelectedTarget(targetUserId || null);
    } catch (error) {
      console.error('Infiltration error:', error);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500 bg-red-500/20 border-red-500/50';
      case 'HIGH': return 'text-orange-500 bg-orange-500/20 border-orange-500/50';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/50';
      default: return 'text-green-500 bg-green-500/20 border-green-500/50';
    }
  };

  const getEmotionIcon = (emotion: string) => {
    const icons = {
      anger: '😡', fear: '😨', sadness: '😢', joy: '😊',
      disgust: '🤢', shame: '😞', neutral: '😐'
    };
    return icons[emotion as keyof typeof icons] || '😐';
  };

  if (!admin) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
        <h3 className="text-red-400 text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-red-300">Admin access required for chat surveillance</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Chat Surveillance</h1>
            <p className="text-gray-300">Real-time monitoring and psychological analysis</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm ${
              activeSurveillance ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
            }`}>
              {activeSurveillance ? '🟢 Live' : '🔴 Offline'}
            </div>
            
            <div className="text-white text-sm">
              {activeUsers.length} active users • {messages.length} messages
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Sidebar - Active Users */}
        <div className="w-80 bg-black/20 border-r border-white/10 p-4">
          <h3 className="text-lg font-bold text-white mb-4">Active Users</h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activeUsers.map(user => (
              <motion.div
                key={user.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  user.riskScore > 70 
                    ? 'bg-red-900/20 border-red-500/50'
                    : user.riskScore > 40
                    ? 'bg-yellow-900/20 border-yellow-500/50'
                    : 'bg-blue-900/20 border-blue-500/50'
                }`}
                onClick={() => setShowUserDetails(user.userId)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium">{user.maskName}</span>
                  <span className="text-xs text-gray-400">{user.roomName}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{user.email}</span>
                  <div className="flex items-center space-x-2">
                    {user.isTyping && (
                      <span className="text-green-400 text-xs">✍️ typing</span>
                    )}
                    <span className={`text-xs font-medium ${
                      user.riskScore > 70 ? 'text-red-400' : 
                      user.riskScore > 40 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {user.riskScore}
                    </span>
                  </div>
                </div>
                
                {user.alertCount > 0 && (
                  <div className="mt-2 flex items-center space-x-1">
                    <span className="text-red-400 text-xs">🚨</span>
                    <span className="text-red-300 text-xs">{user.alertCount} alerts</span>
                  </div>
                )}
                
                <div className="mt-2 flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTarget(user.userId);
                    }}
                    className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded hover:bg-purple-600/30"
                  >
                    Target
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInfiltrate(user.roomId, user.userId);
                    }}
                    className="text-xs bg-orange-600/20 text-orange-300 px-2 py-1 rounded hover:bg-orange-600/30"
                  >
                    Infiltrate
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Main Area - Message Monitor */}
        <div className="flex-1 flex flex-col">
          {/* Filters */}
          <div className="bg-black/20 border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="bg-black/30 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                >
                  <option value="all">All Rooms</option>
                  <option value="public">Public Rooms</option>
                  <option value="truth">Truth Game</option>
                  <option value="drop">Drop Zones</option>
                </select>
                
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value as any)}
                  className="bg-black/30 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="HIGH">High Risk</option>
                  <option value="CRITICAL">Critical Only</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 text-white text-sm">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded"
                  />
                  <span>Auto-scroll</span>
                </label>
                
                {infiltrationMode && selectedTarget && (
                  <div className="bg-orange-600/20 text-orange-300 px-3 py-1 rounded-full text-sm">
                    🕵️ Infiltrating: {selectedTarget}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">👁️</div>
                  <h3 className="text-xl font-semibold mb-2">Surveillance Active</h3>
                  <p>Monitoring all chat activity in real-time</p>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map(message => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-4 rounded-lg border ${getRiskColor(message.riskLevel)}`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getEmotionIcon(message.psychAnalysis.dominantEmotion)}</span>
                          <span className="text-white font-medium">{message.maskName}</span>
                          <span className="text-gray-400 text-sm">in {message.roomName}</span>
                        </div>
                        
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(message.riskLevel)}`}>
                          {message.riskLevel}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        
                        {message.surveillanceFlags.length > 0 && (
                          <div className="flex space-x-1">
                            {message.surveillanceFlags.map((flag, idx) => (
                              <span key={idx} className="bg-red-600/20 text-red-300 px-1 py-0.5 rounded text-xs">
                                🚨 {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="text-white mb-3 bg-black/20 rounded-lg p-3">
                      {message.content}
                    </div>

                    {/* Analysis Data */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                      <div>
                        <span className="text-gray-400">Emotion:</span>
                        <div className="text-white capitalize">{message.psychAnalysis.dominantEmotion}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Intensity:</span>
                        <div className="text-white">{message.emotionalIntensity}/10</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Toxicity:</span>
                        <div className="text-white">{Math.round(message.toxicityScore * 100)}%</div>
                      </div>
                      <div>
                        <span className="text-gray-400">User Email:</span>
                        <div className="text-white text-xs">{message.userEmail}</div>
                      </div>
                    </div>

                    {/* Triggers and Opportunities */}
                    {(message.psychAnalysis.triggers.length > 0 || message.psychAnalysis.manipulationOpportunities.length > 0) && (
                      <div className="space-y-2 mb-3">
                        {message.psychAnalysis.triggers.length > 0 && (
                          <div>
                            <span className="text-red-400 text-sm">Triggers: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {message.psychAnalysis.triggers.map((trigger, idx) => (
                                <span key={idx} className="bg-red-600/20 text-red-300 px-2 py-1 rounded text-xs">
                                  {trigger}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {message.psychAnalysis.manipulationOpportunities.length > 0 && (
                          <div>
                            <span className="text-purple-400 text-sm">Manipulation Opportunities: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {message.psychAnalysis.manipulationOpportunities.map((opp, idx) => (
                                <span key={idx} className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded text-xs">
                                  {opp}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleFlagMessage(message.id, 'concerning_content')}
                        className="text-xs bg-red-600/20 text-red-300 px-3 py-1 rounded hover:bg-red-600/30"
                      >
                        🚨 Flag
                      </button>
                      <button
                        onClick={() => setShowUserDetails(message.userId)}
                        className="text-xs bg-blue-600/20 text-blue-300 px-3 py-1 rounded hover:bg-blue-600/30"
                      >
                        👤 Profile
                      </button>
                      <button
                        onClick={() => handleInfiltrate(message.roomId, message.userId)}
                        className="text-xs bg-orange-600/20 text-orange-300 px-3 py-1 rounded hover:bg-orange-600/30"
                      >
                        🕵️ Infiltrate
                      </button>
                      <button
                        onClick={() => handleBlockUser(message.userId, 'surveillance_action')}
                        className="text-xs bg-gray-600/20 text-gray-300 px-3 py-1 rounded hover:bg-gray-600/30"
                      >
                        🚫 Block
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowUserDetails(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">User Surveillance Profile</h3>
                <button
                  onClick={() => setShowUserDetails(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-center text-gray-400">
                <p>Detailed user profile would be loaded here...</p>
                <p>Including psychological analysis, risk assessment, and manipulation recommendations</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
