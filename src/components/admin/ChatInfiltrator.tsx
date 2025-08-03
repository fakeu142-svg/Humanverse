'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSocket } from '@/hooks/useSocket';

interface InfiltrationSession {
  id: string;
  roomId: string;
  roomName: string;
  targetUserId?: string;
  targetMaskName?: string;
  fakeMaskName: string;
  fakeMaskType: string;
  startTime: string;
  status: 'active' | 'paused' | 'ended';
  messagesSent: number;
  targetEngagement: number;
  suspicionLevel: number;
}

interface FakeMaskOption {
  name: string;
  type: string;
  backstory: string;
  personality: string[];
  communicationStyle: string;
  believabilityScore: number;
}

interface InfiltrationMessage {
  id: string;
  content: string;
  fromAdmin: boolean;
  maskName: string;
  timestamp: string;
  reactions?: Record<string, number>;
  suspicionGenerated: number;
  engagementLevel: number;
}

const FAKE_MASK_OPTIONS: FakeMaskOption[] = [
  {
    name: 'EchoDust_9247',
    type: 'ECHO_DUST',
    backstory: 'Lonely college student dealing with anxiety and depression',
    personality: ['vulnerable', 'seeking validation', 'overshares'],
    communicationStyle: 'emotional, seeks sympathy, uses lowercase',
    believabilityScore: 9
  },
  {
    name: 'AshFox_3891',
    type: 'ASH_FOX',
    backstory: 'Recent breakup survivor, trust issues, works night shift',
    personality: ['guarded', 'cynical', 'occasionally opens up'],
    communicationStyle: 'short responses, dark humor, types properly',
    believabilityScore: 8
  },
  {
    name: 'VioletCrow_1556',
    type: 'VIOLET_CROW',
    backstory: 'Creative type struggling with self-worth and family pressure',
    personality: ['artistic', 'sensitive', 'philosophical'],
    communicationStyle: 'poetic language, asks deep questions, empathetic',
    believabilityScore: 9
  },
  {
    name: 'IronSage_7203',
    type: 'IRON_SAGE',
    backstory: 'Former military, dealing with PTSD, trying to reconnect',
    personality: ['stoic', 'protective', 'struggles with emotions'],
    communicationStyle: 'direct, formal at times, occasional vulnerability',
    believabilityScore: 7
  },
  {
    name: 'GhostWind_4429',
    type: 'GHOST_WIND',
    backstory: 'Mysterious loner with trust issues and deep secrets',
    personality: ['enigmatic', 'observant', 'rarely reveals personal info'],
    communicationStyle: 'cryptic messages, asks probing questions',
    believabilityScore: 6
  }
];

export function ChatInfiltrator() {
  const { admin } = useAdminAuth();
  const { socket } = useSocket();
  
  const [activeSessions, setActiveSessions] = useState<InfiltrationSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<InfiltrationSession | null>(null);
  const [messages, setMessages] = useState<InfiltrationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedMask, setSelectedMask] = useState<FakeMaskOption>(FAKE_MASK_OPTIONS[0]);
  const [targetUser, setTargetUser] = useState('');
  const [roomId, setRoomId] = useState('');
  const [manipulationGoal, setManipulationGoal] = useState<'befriend' | 'extract_info' | 'influence' | 'destabilize'>('befriend');
  const [showMaskSelector, setShowMaskSelector] = useState(false);
  const [autoRespond, setAutoRespond] = useState(false);
  const [responseStyle, setResponseStyle] = useState<'empathetic' | 'probing' | 'validating' | 'challenging'>('empathetic');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const startInfiltration = async () => {
    if (!roomId || !selectedMask) return;

    try {
      const response = await fetch('/api/admin/rooms/infiltrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          roomId,
          targetUserId: targetUser || undefined,
          fakeMask: {
            name: selectedMask.name,
            type: selectedMask.type,
            backstory: selectedMask.backstory,
            personality: selectedMask.personality
          },
          manipulationGoal
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start infiltration');
      }

      const session = await response.json();
      setActiveSessions(prev => [session, ...prev]);
      setSelectedSession(session);
      
      // Clear form
      setRoomId('');
      setTargetUser('');
      
    } catch (error) {
      console.error('Infiltration error:', error);
      alert('Failed to start infiltration');
    }
  };

  const sendInfiltrationMessage = async () => {
    if (!currentMessage.trim() || !selectedSession) return;

    try {
      const response = await fetch('/api/admin/rooms/infiltrate/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          content: currentMessage,
          manipulationTactic: responseStyle
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      
      // Add message to local state
      const newMessage: InfiltrationMessage = {
        id: `msg_${Date.now()}`,
        content: currentMessage,
        fromAdmin: true,
        maskName: selectedSession.fakeMaskName,
        timestamp: new Date().toISOString(),
        suspicionGenerated: result.suspicionGenerated || 0,
        engagementLevel: result.engagementLevel || 0
      };
      
      setMessages(prev => [...prev, newMessage]);
      setCurrentMessage('');
      
      // Update session stats
      setSelectedSession(prev => prev ? {
        ...prev,
        messagesSent: prev.messagesSent + 1,
        suspicionLevel: Math.min(prev.suspicionLevel + result.suspicionGenerated, 100),
        targetEngagement: Math.max(prev.targetEngagement, result.engagementLevel)
      } : null);
      
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const generateResponse = async (targetMessage: string) => {
    if (!selectedSession) return;

    try {
      const response = await fetch('/api/admin/rooms/infiltrate/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          targetMessage,
          responseStyle,
          manipulationGoal,
          maskPersonality: selectedMask.personality
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate response');
      }

      const result = await response.json();
      setCurrentMessage(result.generatedResponse);
      
    } catch (error) {
      console.error('Generate response error:', error);
    }
  };

  const endInfiltration = async (sessionId: string) => {
    try {
      await fetch(`/api/admin/rooms/infiltrate/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      setActiveSessions(prev => prev.map(session => 
        session.id === sessionId ? { ...session, status: 'ended' } : session
      ));
      
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setMessages([]);
      }
      
    } catch (error) {
      console.error('End infiltration error:', error);
    }
  };

  const getSuspicionColor = (level: number) => {
    if (level > 80) return 'text-red-500';
    if (level > 60) return 'text-orange-500';
    if (level > 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getEngagementColor = (level: number) => {
    if (level > 80) return 'text-green-500';
    if (level > 60) return 'text-blue-500';
    if (level > 40) return 'text-yellow-500';
    return 'text-gray-500';
  };

  if (!admin) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
        <h3 className="text-red-400 text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-red-300">Admin access required for chat infiltration</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 p-4">
        <h1 className="text-2xl font-bold text-white mb-2">Chat Infiltration Control</h1>
        <p className="text-gray-300">Advanced undercover operations and social manipulation</p>
      </div>

      <div className="flex h-screen">
        {/* Sidebar - Session Management */}
        <div className="w-80 bg-black/20 border-r border-white/10 p-4">
          {/* New Infiltration */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Start New Infiltration</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-black/30 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  placeholder="Enter room ID"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-1">Target User (Optional)</label>
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  className="w-full bg-black/30 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  placeholder="Specific user to target"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-1">Fake Mask</label>
                <button
                  onClick={() => setShowMaskSelector(!showMaskSelector)}
                  className="w-full bg-black/30 border border-gray-600 rounded px-3 py-2 text-white text-sm text-left"
                >
                  {selectedMask.name} ({selectedMask.type})
                </button>
                
                {showMaskSelector && (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {FAKE_MASK_OPTIONS.map(mask => (
                      <button
                        key={mask.name}
                        onClick={() => {
                          setSelectedMask(mask);
                          setShowMaskSelector(false);
                        }}
                        className="w-full text-left p-2 bg-black/40 hover:bg-black/60 rounded text-white text-xs"
                      >
                        <div className="font-medium">{mask.name}</div>
                        <div className="text-gray-400">{mask.backstory}</div>
                        <div className="text-purple-400">Believability: {mask.believabilityScore}/10</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-1">Goal</label>
                <select
                  value={manipulationGoal}
                  onChange={(e) => setManipulationGoal(e.target.value as any)}
                  className="w-full bg-black/30 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                >
                  <option value="befriend">Befriend & Gain Trust</option>
                  <option value="extract_info">Extract Information</option>
                  <option value="influence">Influence Behavior</option>
                  <option value="destabilize">Destabilize & Isolate</option>
                </select>
              </div>
              
              <button
                onClick={startInfiltration}
                disabled={!roomId || !selectedMask}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 px-4 rounded font-medium transition-colors"
              >
                🕵️ Start Infiltration
              </button>
            </div>
          </div>

          {/* Active Sessions */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Active Sessions</h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activeSessions.map(session => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedSession?.id === session.id
                      ? 'bg-purple-900/30 border-purple-500/50'
                      : session.status === 'active'
                      ? 'bg-green-900/20 border-green-500/50'
                      : 'bg-gray-900/20 border-gray-500/50'
                  }`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{session.fakeMaskName}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      session.status === 'active' ? 'bg-green-600/20 text-green-400' :
                      session.status === 'paused' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-300 mb-2">{session.roomName}</div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Messages:</span>
                      <div className="text-white">{session.messagesSent}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Engagement:</span>
                      <div className={getEngagementColor(session.targetEngagement)}>
                        {session.targetEngagement}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Suspicion:</span>
                      <div className={getSuspicionColor(session.suspicionLevel)}>
                        {session.suspicionLevel}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Duration:</span>
                      <div className="text-white">
                        {Math.floor((Date.now() - new Date(session.startTime).getTime()) / 60000)}m
                      </div>
                    </div>
                  </div>
                  
                  {session.targetMaskName && (
                    <div className="mt-2 text-xs text-orange-400">
                      🎯 Targeting: {session.targetMaskName}
                    </div>
                  )}
                  
                  {session.status === 'active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        endInfiltration(session.id);
                      }}
                      className="mt-2 w-full bg-red-600/20 text-red-300 text-xs py-1 rounded hover:bg-red-600/30"
                    >
                      End Session
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Area - Chat Interface */}
        <div className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              {/* Session Header */}
              <div className="bg-black/20 border-b border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedSession.fakeMaskName}</h2>
                    <p className="text-gray-300">Infiltrating {selectedSession.roomName}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-sm">
                      <span className="text-gray-400">Engagement: </span>
                      <span className={getEngagementColor(selectedSession.targetEngagement)}>
                        {selectedSession.targetEngagement}%
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400">Suspicion: </span>
                      <span className={getSuspicionColor(selectedSession.suspicionLevel)}>
                        {selectedSession.suspicionLevel}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`max-w-xs md:max-w-md ${
                      message.fromAdmin ? 'ml-auto' : 'mr-auto'
                    }`}
                  >
                    <div className={`p-3 rounded-lg ${
                      message.fromAdmin
                        ? 'bg-purple-600/20 border border-purple-500/50 text-white'
                        : 'bg-gray-600/20 border border-gray-500/50 text-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{message.maskName}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="text-sm">{message.content}</div>
                      
                      {message.fromAdmin && (
                        <div className="mt-2 flex items-center space-x-3 text-xs">
                          <span className={`${getSuspicionColor(message.suspicionGenerated)}`}>
                            Suspicion: +{message.suspicionGenerated}
                          </span>
                          <span className={`${getEngagementColor(message.engagementLevel)}`}>
                            Engagement: {message.engagementLevel}%
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-black/20 border-t border-white/10 p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <label className="flex items-center space-x-2 text-white text-sm">
                    <input
                      type="checkbox"
                      checked={autoRespond}
                      onChange={(e) => setAutoRespond(e.target.checked)}
                      className="rounded"
                    />
                    <span>Auto-respond</span>
                  </label>
                  
                  <select
                    value={responseStyle}
                    onChange={(e) => setResponseStyle(e.target.value as any)}
                    className="bg-black/30 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                  >
                    <option value="empathetic">Empathetic</option>
                    <option value="probing">Probing</option>
                    <option value="validating">Validating</option>
                    <option value="challenging">Challenging</option>
                  </select>
                </div>
                
                <div className="flex space-x-3">
                  <textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder={`Message as ${selectedSession.fakeMaskName}...`}
                    className="flex-1 bg-black/30 border border-gray-600 rounded px-3 py-2 text-white text-sm resize-none"
                    rows={2}
                  />
                  
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={sendInfiltrationMessage}
                      disabled={!currentMessage.trim()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium"
                    >
                      Send
                    </button>
                    
                    <button
                      onClick={() => generateResponse('target message')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded text-xs"
                    >
                      AI Generate
                    </button>
                  </div>
                </div>
                
                {/* Mask Personality Reminder */}
                <div className="mt-3 p-2 bg-black/20 rounded text-xs text-gray-400">
                  <strong>Personality:</strong> {selectedMask.personality.join(', ')} • 
                  <strong> Style:</strong> {selectedMask.communicationStyle}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">🕵️</div>
                <h3 className="text-xl font-semibold mb-2">No Active Infiltration</h3>
                <p>Start a new infiltration session or select an existing one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
