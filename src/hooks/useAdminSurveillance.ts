import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket, useSocketEvent } from './useSocket';
import { useAdminAuth } from './useAdminAuth';
import { setupAdminSurveillance } from '@/lib/socket';
import { toast } from 'react-hot-toast';

export interface SurveillanceMessage {
  id: string;
  content: string;
  maskName: string;
  userId: string;
  userEmail: string;
  roomId: string;
  roomName?: string;
  createdAt: Date;
  isFromAdmin: boolean;
  originalUserId?: string;
}

export interface SurveillanceUser {
  socketId: string;
  userId: string;
  userEmail: string;
  maskName: string;
  rooms: string[];
  lastActivity: Date;
  isTyping?: boolean;
  currentRoom?: string;
}

export interface SurveillanceRoom {
  roomId: string;
  roomName?: string;
  userCount: number;
  users: Array<{
    maskName: string;
    userEmail: string;
    isAdmin: boolean;
  }>;
  lastActivity?: Date;
}

export interface TypingEvent {
  roomId: string;
  userId: string;
  userEmail: string;
  maskName: string;
  isTyping: boolean;
  timestamp: Date;
}

export function useAdminSurveillance() {
  const { admin, isAuthenticated } = useAdminAuth();
  
  // Socket configuration for admin
  const socketConfig = isAuthenticated && admin ? {
    token: 'admin-token', // Would get from cookies in real implementation
    type: 'admin' as const
  } : null;

  const { socket, isConnected, isAuthenticated: isSocketAuthenticated } = useSocket(socketConfig, {
    onError: (error) => {
      toast.error(`Surveillance connection error: ${error.message}`);
    },
  });

  // Surveillance state
  const [interceptedMessages, setInterceptedMessages] = useState<SurveillanceMessage[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<Map<string, SurveillanceUser>>(new Map());
  const [monitoredRooms, setMonitoredRooms] = useState<Map<string, SurveillanceRoom>>(new Map());
  const [typingEvents, setTypingEvents] = useState<TypingEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Refs for managing large datasets
  const messageBufferRef = useRef<SurveillanceMessage[]>([]);
  const maxMessages = 1000; // Keep last 1000 messages in memory

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  // Start surveillance monitoring
  const startSurveillance = useCallback(async () => {
    if (!isSocketAuthenticated || !admin?.permissions.surveillance) return false;

    try {
      setIsLoadingDashboard(true);
      const response = await fetch('/api/admin/rooms/monitor');
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.surveillance);
        setIsMonitoring(true);
        toast.success('Surveillance monitoring started');
        return true;
      } else {
        toast.error(data.error || 'Failed to start surveillance');
        return false;
      }
    } catch (error: any) {
      toast.error('Failed to start surveillance');
      return false;
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [isSocketAuthenticated, admin?.permissions.surveillance]);

  // Stop surveillance monitoring
  const stopSurveillance = useCallback(() => {
    setIsMonitoring(false);
    setInterceptedMessages([]);
    setConnectedUsers(new Map());
    setMonitoredRooms(new Map());
    setTypingEvents([]);
    messageBufferRef.current = [];
    toast.info('Surveillance monitoring stopped');
  }, []);

  // Flag suspicious content
  const flagContent = useCallback(async (messageId: string, reason: string) => {
    if (!admin?.permissions.surveillance) return false;

    try {
      const response = await fetch('/api/admin/rooms/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FLAG_CONTENT',
          messageId,
          reason,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Content flagged successfully');
        return true;
      } else {
        toast.error(data.error || 'Failed to flag content');
        return false;
      }
    } catch (error) {
      toast.error('Failed to flag content');
      return false;
    }
  }, [admin?.permissions.surveillance]);

  // Extract user data
  const extractUserData = useCallback(async (userId: string) => {
    if (!admin?.permissions.surveillance) return null;

    try {
      const response = await fetch('/api/admin/rooms/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXTRACT_USER_DATA',
          targetUserId: userId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        return data.userData;
      } else {
        toast.error(data.error || 'Failed to extract user data');
        return null;
      }
    } catch (error) {
      toast.error('Failed to extract user data');
      return null;
    }
  }, [admin?.permissions.surveillance]);

  // Get infiltration opportunities
  const getInfiltrationOpportunities = useCallback(async () => {
    if (!admin?.permissions.impersonation) return [];

    try {
      const response = await fetch('/api/admin/rooms/infiltrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_INFILTRATION_OPPORTUNITIES' }),
      });

      const data = await response.json();
      if (data.success) {
        return data.opportunities;
      } else {
        toast.error(data.error || 'Failed to get infiltration opportunities');
        return [];
      }
    } catch (error) {
      toast.error('Failed to get infiltration opportunities');
      return [];
    }
  }, [admin?.permissions.impersonation]);

  // Socket event handlers for surveillance
  useSocketEvent('message-intercepted', (data: SurveillanceMessage) => {
    const message: SurveillanceMessage = {
      ...data,
      createdAt: new Date(data.createdAt),
    };

    setInterceptedMessages(prev => {
      const updated = [message, ...prev].slice(0, maxMessages);
      messageBufferRef.current = updated;
      return updated;
    });
  });

  useSocketEvent('user-connected', (data: any) => {
    setConnectedUsers(prev => {
      const updated = new Map(prev);
      updated.set(data.socketId, {
        socketId: data.socketId,
        userId: data.userId,
        userEmail: data.userEmail,
        maskName: data.maskName,
        rooms: [],
        lastActivity: new Date(data.timestamp),
      });
      return updated;
    });
  });

  useSocketEvent('user-disconnected', (data: any) => {
    setConnectedUsers(prev => {
      const updated = new Map(prev);
      updated.delete(data.socketId);
      return updated;
    });
  });

  useSocketEvent('room-joined', (data: any) => {
    setConnectedUsers(prev => {
      const updated = new Map(prev);
      const user = updated.get(data.socketId);
      if (user) {
        user.rooms.push(data.roomId);
        user.currentRoom = data.roomId;
        user.lastActivity = new Date(data.timestamp);
        updated.set(data.socketId, user);
      }
      return updated;
    });

    setMonitoredRooms(prev => {
      const updated = new Map(prev);
      const room = updated.get(data.roomId) || {
        roomId: data.roomId,
        userCount: 0,
        users: [],
      };
      room.userCount++;
      room.lastActivity = new Date(data.timestamp);
      if (data.userEmail) {
        room.users.push({
          maskName: data.maskName,
          userEmail: data.userEmail,
          isAdmin: false,
        });
      }
      updated.set(data.roomId, room);
      return updated;
    });
  });

  useSocketEvent('room-left', (data: any) => {
    setConnectedUsers(prev => {
      const updated = new Map(prev);
      const user = updated.get(data.socketId);
      if (user) {
        user.rooms = user.rooms.filter(r => r !== data.roomId);
        user.currentRoom = user.rooms[user.rooms.length - 1];
        user.lastActivity = new Date(data.timestamp);
        updated.set(data.socketId, user);
      }
      return updated;
    });

    setMonitoredRooms(prev => {
      const updated = new Map(prev);
      const room = updated.get(data.roomId);
      if (room) {
        room.userCount = Math.max(0, room.userCount - 1);
        room.users = room.users.filter(u => u.maskName !== data.maskName);
        updated.set(data.roomId, room);
      }
      return updated;
    });
  });

  useSocketEvent('typing-surveillance', (data: any) => {
    const typingEvent: TypingEvent = {
      roomId: data.roomId,
      userId: data.userId,
      userEmail: data.userEmail,
      maskName: data.maskName,
      isTyping: data.isTyping,
      timestamp: new Date(data.timestamp),
    };

    setTypingEvents(prev => {
      // Keep only recent typing events (last 50)
      const filtered = prev.filter(e => 
        Date.now() - e.timestamp.getTime() < 10000 // 10 seconds
      );
      return [typingEvent, ...filtered].slice(0, 50);
    });

    // Update user typing status
    setConnectedUsers(prev => {
      const updated = new Map(prev);
      for (const [socketId, user] of updated) {
        if (user.userId === data.userId) {
          user.isTyping = data.isTyping;
          user.lastActivity = new Date(data.timestamp);
          updated.set(socketId, user);
          break;
        }
      }
      return updated;
    });
  });

  useSocketEvent('surveillance-data', (data: any) => {
    // Initial surveillance data from server
    if (data.rooms) {
      const roomMap = new Map();
      data.rooms.forEach((room: any) => {
        roomMap.set(room.roomId, {
          roomId: room.roomId,
          userCount: room.userCount,
          users: room.users || [],
        });
      });
      setMonitoredRooms(roomMap);
    }
  });

  // Auto-start surveillance when authenticated
  useEffect(() => {
    if (isSocketAuthenticated && admin?.permissions.surveillance && !isMonitoring) {
      startSurveillance();
    }
  }, [isSocketAuthenticated, admin?.permissions.surveillance, isMonitoring, startSurveillance]);

  // Setup surveillance socket events
  useEffect(() => {
    if (!socket || !admin?.permissions.surveillance) return;

    setupAdminSurveillance(socket, {
      onMessageIntercepted: (data) => {
        // Handled by useSocketEvent above
      },
      onUserConnected: (data) => {
        // Handled by useSocketEvent above
      },
      onUserDisconnected: (data) => {
        // Handled by useSocketEvent above
      },
      onRoomJoined: (data) => {
        // Handled by useSocketEvent above
      },
      onRoomLeft: (data) => {
        // Handled by useSocketEvent above
      },
      onTypingSurveillance: (data) => {
        // Handled by useSocketEvent above
      },
    });
  }, [socket, admin?.permissions.surveillance]);

  // Get surveillance statistics
  const getStatistics = useCallback(() => {
    return {
      totalInterceptedMessages: interceptedMessages.length,
      totalConnectedUsers: connectedUsers.size,
      totalMonitoredRooms: monitoredRooms.size,
      recentTypingEvents: typingEvents.length,
      highRiskUsers: Array.from(connectedUsers.values()).filter(user => 
        // Would check risk score from dashboard data
        dashboardData?.userActivity?.find((u: any) => u.email === user.userEmail)?.riskScore > 70
      ).length,
    };
  }, [interceptedMessages.length, connectedUsers.size, monitoredRooms.size, typingEvents.length, dashboardData]);

  // Search intercepted messages
  const searchMessages = useCallback((query: string) => {
    if (!query.trim()) return interceptedMessages;

    return interceptedMessages.filter(message =>
      message.content.toLowerCase().includes(query.toLowerCase()) ||
      message.maskName.toLowerCase().includes(query.toLowerCase()) ||
      message.userEmail.toLowerCase().includes(query.toLowerCase())
    );
  }, [interceptedMessages]);

  return {
    // State
    isMonitoring,
    isConnected,
    isAuthenticated: isSocketAuthenticated,
    interceptedMessages,
    connectedUsers: Array.from(connectedUsers.values()),
    monitoredRooms: Array.from(monitoredRooms.values()),
    typingEvents,
    dashboardData,
    isLoadingDashboard,

    // Actions
    startSurveillance,
    stopSurveillance,
    flagContent,
    extractUserData,
    getInfiltrationOpportunities,

    // Utilities
    getStatistics,
    searchMessages,

    // Admin permissions check
    canSurveillance: admin?.permissions.surveillance || false,
    canImpersonate: admin?.permissions.impersonation || false,
  };
}
