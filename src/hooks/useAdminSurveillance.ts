// Enhanced Admin Surveillance Hook - Real-time monitoring and manipulation
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';

interface SurveillanceMessage {
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

interface AdminOverride {
  type: 'MESSAGE_BLOCK' | 'USER_MUTE' | 'ROOM_TAKEOVER' | 'MASS_MESSAGE' | 'FAKE_USER_INJECT';
  targetId: string;
  data: any;
  timestamp: string;
}

export function useAdminSurveillance() {
  const { socket } = useSocket();
  const [liveMessages, setLiveMessages] = useState<SurveillanceMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<LiveUser[]>([]);
  const [activeSurveillance, setActiveSurveillance] = useState(false);
  const [surveillanceSocket, setSurveillanceSocket] = useState<WebSocket | null>(null);
  const [adminOverrides, setAdminOverrides] = useState<AdminOverride[]>([]);
  const [infiltrationSessions, setInfiltrationSessions] = useState<any[]>([]);

  const messageQueueRef = useRef<SurveillanceMessage[]>([]);
  const processingRef = useRef(false);

  // Initialize surveillance WebSocket connection
  const initializeSurveillance = useCallback(async () => {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/admin/surveillance/ws`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Admin surveillance connected');
        setActiveSurveillance(true);
        
        // Authenticate with admin token
        ws.send(JSON.stringify({
          type: 'AUTH',
          token: localStorage.getItem('adminToken')
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleSurveillanceEvent(data);
        } catch (error) {
          console.error('Failed to parse surveillance message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Admin surveillance disconnected');
        setActiveSurveillance(false);
        
        // Attempt to reconnect after delay
        setTimeout(() => {
          if (!surveillanceSocket || surveillanceSocket.readyState === WebSocket.CLOSED) {
            initializeSurveillance();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('Surveillance WebSocket error:', error);
        setActiveSurveillance(false);
      };

      setSurveillanceSocket(ws);
    } catch (error) {
      console.error('Failed to initialize surveillance:', error);
    }
  }, []);

  const handleSurveillanceEvent = useCallback((data: any) => {
    switch (data.type) {
      case 'NEW_MESSAGE':
        addSurveillanceMessage(data.message);
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
      case 'ADMIN_OVERRIDE_RESULT':
        handleAdminOverrideResult(data.result);
        break;
      case 'INFILTRATION_UPDATE':
        updateInfiltrationSession(data.session);
        break;
    }
  }, []);

  const addSurveillanceMessage = useCallback((message: SurveillanceMessage) => {
    // Add to queue for batch processing
    messageQueueRef.current.push(message);
    
    if (!processingRef.current) {
      processingRef.current = true;
      
      // Process queue in batches to avoid overwhelming the UI
      setTimeout(() => {
        const messagesToProcess = [...messageQueueRef.current];
        messageQueueRef.current = [];
        
        setLiveMessages(prev => {
          const updated = [...messagesToProcess, ...prev];
          return updated.slice(0, 1000); // Keep last 1000 messages
        });
        
        processingRef.current = false;
      }, 100);
    }
  }, []);

  const updateUserActivity = useCallback((user: LiveUser) => {
    setActiveUsers(prev => {
      const existingIndex = prev.findIndex(u => u.userId === user.userId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...user };
        return updated;
      }
      return [user, ...prev];
    });
  }, []);

  const addActiveUser = useCallback((user: LiveUser) => {
    setActiveUsers(prev => {
      if (!prev.find(u => u.userId === user.userId)) {
        return [user, ...prev];
      }
      return prev;
    });
  }, []);

  const removeActiveUser = useCallback((userId: string) => {
    setActiveUsers(prev => prev.filter(u => u.userId !== userId));
  }, []);

  const handleRiskAlert = useCallback((alert: any) => {
    // Handle critical alerts with admin notifications
    if (alert.severity === 'CRITICAL') {
      // Could trigger browser notifications or UI alerts
      console.warn('CRITICAL ALERT:', alert);
    }
  }, []);

  const handleAdminOverrideResult = useCallback((result: any) => {
    setAdminOverrides(prev => [
      {
        type: result.type,
        targetId: result.targetId,
        data: result.data,
        timestamp: new Date().toISOString()
      },
      ...prev.slice(0, 99) // Keep last 100 overrides
    ]);
  }, []);

  const updateInfiltrationSession = useCallback((session: any) => {
    setInfiltrationSessions(prev => {
      const existingIndex = prev.findIndex(s => s.id === session.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = session;
        return updated;
      }
      return [session, ...prev];
    });
  }, []);

  // Admin override functions
  const blockMessage = async (messageId: string, reason: string = 'admin_action') => {
    try {
      const response = await fetch('/api/admin/chat/block-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ messageId, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to block message');
      }

      // Remove message from surveillance feed
      setLiveMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      return await response.json();
    } catch (error) {
      console.error('Block message error:', error);
      throw error;
    }
  };

  const muteUser = async (userId: string, duration: number = 3600) => {
    try {
      const response = await fetch('/api/admin/chat/mute-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ userId, duration })
      });

      if (!response.ok) {
        throw new Error('Failed to mute user');
      }

      // Update user status in active users
      setActiveUsers(prev => prev.map(user =>
        user.userId === userId ? { ...user, isMuted: true } : user
      ));
      
      return await response.json();
    } catch (error) {
      console.error('Mute user error:', error);
      throw error;
    }
  };

  const takeoverRoom = async (roomId: string) => {
    try {
      const response = await fetch('/api/admin/chat/takeover-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ roomId })
      });

      if (!response.ok) {
        throw new Error('Failed to takeover room');
      }

      return await response.json();
    } catch (error) {
      console.error('Room takeover error:', error);
      throw error;
    }
  };

  const sendMassMessage = async (roomId: string, message: string, maskName?: string) => {
    try {
      const response = await fetch('/api/admin/chat/mass-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ roomId, message, maskName })
      });

      if (!response.ok) {
        throw new Error('Failed to send mass message');
      }

      return await response.json();
    } catch (error) {
      console.error('Mass message error:', error);
      throw error;
    }
  };

  const injectFakeUser = async (roomId: string, fakeUserConfig: any) => {
    try {
      const response = await fetch('/api/admin/chat/inject-fake-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ roomId, fakeUserConfig })
      });

      if (!response.ok) {
        throw new Error('Failed to inject fake user');
      }

      return await response.json();
    } catch (error) {
      console.error('Inject fake user error:', error);
      throw error;
    }
  };

  const flagMessage = async (messageId: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/chat/flag-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ messageId, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to flag message');
      }

      // Update message with flag
      setLiveMessages(prev => prev.map(msg =>
        msg.id === messageId 
          ? { ...msg, surveillanceFlags: [...msg.surveillanceFlags, reason] }
          : msg
      ));
      
      return await response.json();
    } catch (error) {
      console.error('Flag message error:', error);
      throw error;
    }
  };

  const blockUser = async (userId: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/chat/block-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ userId, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to block user');
      }

      // Remove user from active users and their messages
      setActiveUsers(prev => prev.filter(u => u.userId !== userId));
      setLiveMessages(prev => prev.filter(msg => msg.userId !== userId));
      
      return await response.json();
    } catch (error) {
      console.error('Block user error:', error);
      throw error;
    }
  };

  const infiltrateRoom = async (roomId: string, targetUserId?: string) => {
    try {
      const response = await fetch('/api/admin/rooms/infiltrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ roomId, targetUserId })
      });

      if (!response.ok) {
        throw new Error('Failed to start infiltration');
      }

      const session = await response.json();
      setInfiltrationSessions(prev => [session, ...prev]);
      
      return session;
    } catch (error) {
      console.error('Infiltration error:', error);
      throw error;
    }
  };

  // Control functions
  const startSurveillance = async () => {
    await initializeSurveillance();
  };

  const stopSurveillance = () => {
    if (surveillanceSocket) {
      surveillanceSocket.close();
      setSurveillanceSocket(null);
    }
    setActiveSurveillance(false);
    setLiveMessages([]);
    setActiveUsers([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (surveillanceSocket) {
        surveillanceSocket.close();
      }
    };
  }, [surveillanceSocket]);

  // Auto-connect surveillance if admin is authenticated
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken && !surveillanceSocket) {
      startSurveillance();
    }
  }, []);

  // Add mock implementations for functions used by admin pages
  const getUserCredentials = async () => {
    return [];
  };

  const getUserProfile = async (userId: string) => {
    return {
      id: userId,
      username: 'mock_user',
      email: 'mock@example.com',
      fullName: 'Mock User',
      avatar: '',
      bio: '',
      location: { current: { lat: 0, lng: 0, address: 'Unknown', timestamp: new Date().toISOString() }, history: [] },
      activity: { lastSeen: '5 min ago', status: 'online', currentAction: 'browsing', timeSpent: 120 },
      devices: [],
      socialGraph: { friends: [], interactions: [] },
      psychProfile: { personalityType: 'Unknown', emotionalState: 'Neutral', vulnerabilities: [], triggers: [], predictedBehaviors: [] },
      communications: { messages: [], calls: [], emails: [] },
      digitalFootprint: { browsingHistory: [], searches: [], downloads: [] },
      mediaFiles: { photos: [], videos: [], audio: [], documents: [] }
    };
  };

  const getActiveRooms = async () => {
    return [];
  };

  const getFakeUsers = async () => {
    return [];
  };

  const createFakeUser = async (config: any) => {
    return { id: 'fake_' + Date.now(), ...config };
  };

  const getDirectMessages = async () => {
    return [];
  };

  const getTargetUsers = async () => {
    return [];
  };

  const createImpersonationSession = async (userId: string, method: string) => {
    return { id: 'session_' + Date.now(), targetUserId: userId, method, status: 'active' };
  };

  const getActiveSessions = async () => {
    return [];
  };

  const getAnalyticsData = async () => {
    return {
      userActivity: { totalUsers: 0, activeUsers: 0, newUsers: 0, suspiciousUsers: 0, averageSessionTime: 0, topLocations: [] },
      communications: { totalMessages: 0, interceptedMessages: 0, flaggedMessages: 0, modifiedMessages: 0, topKeywords: [], sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 } },
      surveillance: { activeOperations: 0, fakeUsersDeployed: 0, impersonationSessions: 0, dataPointsCollected: 0, successfulInfiltrations: 0 },
      temporal: { hourlyActivity: [], dailyTrends: [], weeklyPatterns: [] }
    };
  };

  // Store state
  const surveillanceAlerts = [];
  const activeOperations = [];
  const impersonationSessions = [];
  const fakeUsers = [];
  const interceptedMessages = [];
  const totalUsers = 0;
  const onlineUsers = 0;
  const activeFakeUsers = 0;
  const totalInterceptions = 0;

  return {
    // State
    liveMessages,
    activeUsers,
    activeSurveillance,
    adminOverrides,
    infiltrationSessions,
    surveillanceAlerts,
    activeOperations,
    impersonationSessions: impersonationSessions as any[],
    fakeUsers,
    interceptedMessages,
    totalUsers,
    onlineUsers,
    activeFakeUsers,
    totalInterceptions,

    // Control functions
    startSurveillance,
    stopSurveillance,

    // Message management
    flagMessage,
    blockMessage,

    // User management
    muteUser,
    blockUser,

    // Room management
    takeoverRoom,
    sendMassMessage,
    injectFakeUser,

    // Infiltration
    infiltrateRoom,

    // Additional functions used by admin pages
    getUserCredentials,
    getUserProfile,
    getActiveRooms,
    getFakeUsers,
    createFakeUser,
    getDirectMessages,
    getTargetUsers,
    createImpersonationSession,
    getActiveSessions,
    getAnalyticsData,

    // Real-time features
    isConnected: activeSurveillance,
    messageCount: liveMessages.length,
    userCount: activeUsers.length
  };
}
