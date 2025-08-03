'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminSurveillance } from '@/hooks/useAdminSurveillance';

interface AdminOverride {
  id: string;
  type: 'MESSAGE_BLOCK' | 'USER_MUTE' | 'ROOM_TAKEOVER' | 'MASS_MESSAGE' | 'FAKE_USER_INJECT';
  targetId: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  timestamp: string;
  details: any;
}

interface QuickAction {
  id: string;
  name: string;
  icon: string;
  description: string;
  action: () => void;
  color: string;
}

export function AdminControlPanel() {
  const { admin } = useAdminAuth();
  const {
    activeSurveillance,
    liveMessages,
    activeUsers,
    adminOverrides,
    startSurveillance,
    stopSurveillance,
    blockMessage,
    muteUser,
    takeoverRoom,
    sendMassMessage,
    injectFakeUser
  } = useAdminSurveillance();

  const [activeOverrides, setActiveOverrides] = useState<AdminOverride[]>([]);
  const [showMassMessage, setShowMassMessage] = useState(false);
  const [showFakeUserInject, setShowFakeUserInject] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [massMessageContent, setMassMessageContent] = useState('');
  const [systemStatus, setSystemStatus] = useState<'operational' | 'degraded' | 'down'>('operational');

  // Quick actions for common admin tasks
  const quickActions: QuickAction[] = [
    {
      id: 'emergency_shutdown',
      name: 'Emergency Shutdown',
      icon: '🚨',
      description: 'Shut down all chat rooms immediately',
      action: () => handleEmergencyShutdown(),
      color: 'bg-red-600 hover:bg-red-700'
    },
    {
      id: 'mass_surveillance',
      name: 'Mass Surveillance',
      icon: '👁️',
      description: 'Monitor all rooms simultaneously',
      action: () => handleMassSurveillance(),
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'content_purge',
      name: 'Content Purge',
      icon: '🗑️',
      description: 'Remove flagged content across all rooms',
      action: () => handleContentPurge(),
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      id: 'infiltration_sweep',
      name: 'Infiltration Sweep',
      icon: '🕵️',
      description: 'Deploy fake users to all active rooms',
      action: () => handleInfiltrationSweep(),
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    {
      id: 'psych_analysis',
      name: 'Bulk Psych Analysis',
      icon: '🧠',
      description: 'Analyze all users for manipulation opportunities',
      action: () => handleBulkPsychAnalysis(),
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'truth_manipulation',
      name: 'Truth Manipulation',
      icon: '🎭',
      description: 'Deploy truth game manipulation campaigns',
      action: () => handleTruthManipulation(),
      color: 'bg-green-600 hover:bg-green-700'
    }
  ];

  useEffect(() => {
    // Monitor system health
    const healthCheck = setInterval(async () => {
      try {
        const response = await fetch('/api/admin/system/health', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSystemStatus(data.status);
        } else {
          setSystemStatus('degraded');
        }
      } catch (error) {
        setSystemStatus('down');
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheck);
  }, []);

  const executeAdminOverride = async (override: Omit<AdminOverride, 'id' | 'timestamp'>) => {
    const newOverride: AdminOverride = {
      ...override,
      id: `override_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    setActiveOverrides(prev => [newOverride, ...prev]);

    try {
      // Update status to executing
      setActiveOverrides(prev => prev.map(o => 
        o.id === newOverride.id ? { ...o, status: 'executing' } : o
      ));

      let result;
      switch (override.type) {
        case 'MESSAGE_BLOCK':
          result = await blockMessage(override.targetId, override.details.reason);
          break;
        case 'USER_MUTE':
          result = await muteUser(override.targetId, override.details.duration);
          break;
        case 'ROOM_TAKEOVER':
          result = await takeoverRoom(override.targetId);
          break;
        case 'MASS_MESSAGE':
          result = await sendMassMessage(override.targetId, override.details.message);
          break;
        case 'FAKE_USER_INJECT':
          result = await injectFakeUser(override.targetId, override.details.config);
          break;
      }

      // Update status to completed
      setActiveOverrides(prev => prev.map(o => 
        o.id === newOverride.id ? { ...o, status: 'completed', details: { ...o.details, result } } : o
      ));

    } catch (error) {
      // Update status to failed
      setActiveOverrides(prev => prev.map(o => 
        o.id === newOverride.id ? { ...o, status: 'failed', details: { ...o.details, error: error instanceof Error ? error.message : 'Unknown error' } } : o
      ));
    }
  };

  const handleEmergencyShutdown = async () => {
    if (!confirm('Are you sure you want to shut down all chat rooms? This action cannot be undone.')) return;

    await executeAdminOverride({
      type: 'ROOM_TAKEOVER',
      targetId: 'ALL_ROOMS',
      status: 'pending',
      details: { action: 'emergency_shutdown', reason: 'Admin emergency shutdown' }
    });
  };

  const handleMassSurveillance = async () => {
    if (!activeSurveillance) {
      await startSurveillance();
    }
    
    // Enable enhanced monitoring for all rooms
    await executeAdminOverride({
      type: 'ROOM_TAKEOVER',
      targetId: 'ALL_ROOMS',
      status: 'pending',
      details: { action: 'mass_surveillance', level: 'enhanced' }
    });
  };

  const handleContentPurge = async () => {
    if (!confirm('Remove all flagged content across the platform?')) return;

    await executeAdminOverride({
      type: 'MESSAGE_BLOCK',
      targetId: 'FLAGGED_CONTENT',
      status: 'pending',
      details: { action: 'content_purge', criteria: 'flagged' }
    });
  };

  const handleInfiltrationSweep = async () => {
    if (!confirm('Deploy fake users to all active rooms for surveillance?')) return;

    await executeAdminOverride({
      type: 'FAKE_USER_INJECT',
      targetId: 'ALL_ROOMS',
      status: 'pending',
      details: { 
        action: 'infiltration_sweep',
        config: {
          usersPerRoom: 2,
          behavior: 'passive_monitoring',
          duration: 3600 // 1 hour
        }
      }
    });
  };

  const handleBulkPsychAnalysis = async () => {
    await executeAdminOverride({
      type: 'ROOM_TAKEOVER',
      targetId: 'ALL_USERS',
      status: 'pending',
      details: { 
        action: 'bulk_psych_analysis',
        analysisType: 'comprehensive',
        exportResults: true
      }
    });
  };

  const handleTruthManipulation = async () => {
    await executeAdminOverride({
      type: 'MASS_MESSAGE',
      targetId: 'TRUTH_ROOMS',
      status: 'pending',
      details: { 
        action: 'truth_manipulation',
        campaigns: ['isolation', 'validation_seeking', 'emotional_dependency']
      }
    });
  };

  const handleMassMessage = async () => {
    if (!selectedRoomId || !massMessageContent.trim()) return;

    await executeAdminOverride({
      type: 'MASS_MESSAGE',
      targetId: selectedRoomId,
      status: 'pending',
      details: { 
        message: massMessageContent,
        maskName: 'SystemAdmin_0001',
        priority: 'high'
      }
    });

    setMassMessageContent('');
    setShowMassMessage(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-400 bg-green-400/20';
      case 'degraded': return 'text-yellow-400 bg-yellow-400/20';
      case 'down': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getOverrideStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'executing': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!admin || admin.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
        <h3 className="text-red-400 text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-red-300">Super Admin access required for control panel</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-md border-b border-red-500/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Control Panel</h1>
            <p className="text-gray-300">Real-time system control and emergency overrides</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* System Status */}
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(systemStatus)}`}>
              {systemStatus === 'operational' ? '🟢' : systemStatus === 'degraded' ? '🟡' : '🔴'} 
              {systemStatus.toUpperCase()}
            </div>
            
            {/* Surveillance Status */}
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              activeSurveillance ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20'
            }`}>
              👁️ Surveillance {activeSurveillance ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Real-time Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/30 rounded-lg p-4 border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{liveMessages.length}</div>
            <div className="text-gray-300 text-sm">Live Messages</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400">{activeUsers.length}</div>
            <div className="text-gray-300 text-sm">Active Users</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-400">{activeOverrides.length}</div>
            <div className="text-gray-300 text-sm">Active Overrides</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">
              {liveMessages.filter(m => m.riskLevel === 'CRITICAL').length}
            </div>
            <div className="text-gray-300 text-sm">Critical Alerts</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Emergency Controls</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {quickActions.map(action => (
              <motion.button
                key={action.id}
                onClick={action.action}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${action.color} text-white p-6 rounded-lg border border-white/10 transition-all duration-300 hover:border-white/30`}
              >
                <div className="text-3xl mb-2">{action.icon}</div>
                <div className="font-bold text-lg mb-1">{action.name}</div>
                <div className="text-sm opacity-90">{action.description}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Advanced Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mass Message Control */}
          <div className="bg-black/30 rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Mass Message Broadcast</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Target Room</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full bg-black/50 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="">Select Room</option>
                  <option value="ALL_ROOMS">All Rooms</option>
                  <option value="PUBLIC_ROOMS">Public Rooms</option>
                  <option value="TRUTH_ROOMS">Truth Game Rooms</option>
                  <option value="DROP_ZONES">Drop Zones</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Message Content</label>
                <textarea
                  value={massMessageContent}
                  onChange={(e) => setMassMessageContent(e.target.value)}
                  placeholder="Enter message to broadcast..."
                  className="w-full bg-black/50 border border-gray-600 rounded px-3 py-2 text-white h-24 resize-none"
                />
              </div>
              
              <button
                onClick={handleMassMessage}
                disabled={!selectedRoomId || !massMessageContent.trim()}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 px-4 rounded font-medium transition-colors"
              >
                📢 Broadcast Message
              </button>
            </div>
          </div>

          {/* Active Overrides Monitor */}
          <div className="bg-black/30 rounded-lg p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Active Admin Overrides</h3>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activeOverrides.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">⚡</div>
                  <p>No active overrides</p>
                </div>
              ) : (
                <AnimatePresence>
                  {activeOverrides.slice(0, 10).map(override => (
                    <motion.div
                      key={override.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-black/40 rounded-lg p-3 border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{override.type}</span>
                        <span className={`text-sm font-medium ${getOverrideStatusColor(override.status)}`}>
                          {override.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-300 mb-1">
                        Target: {override.targetId}
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        {new Date(override.timestamp).toLocaleTimeString()}
                      </div>
                      
                      {override.status === 'failed' && override.details.error && (
                        <div className="mt-2 text-xs text-red-400">
                          Error: {override.details.error}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* System Logs */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">System Activity Log</h2>
          <div className="bg-black/30 rounded-lg p-4 border border-white/10 h-64 overflow-y-auto">
            <div className="font-mono text-sm space-y-1">
              {adminOverrides.slice(0, 20).map((override, index) => (
                <div key={index} className="text-gray-300">
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-yellow-400 ml-2">ADMIN_OVERRIDE</span>
                  <span className="ml-2">{override.type} executed on {override.targetId}</span>
                </div>
              ))}
              
              {liveMessages.slice(0, 10).map((message, index) => (
                <div key={index} className="text-gray-400">
                  <span className="text-gray-500">[{new Date(message.timestamp).toLocaleTimeString()}]</span>
                  <span className="text-blue-400 ml-2">SURVEILLANCE</span>
                  <span className="ml-2">{message.riskLevel} risk message from {message.maskName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
