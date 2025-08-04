'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminSurveillanceStore } from '@/store/adminSurveillanceStore';

export interface UserSurveillanceHook {
  // User data
  surveilledUsers: any[];
  selectedUser: any | null;
  userCredentials: any | null;
  
  // Loading states
  loading: boolean;
  credentialsLoading: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  loadUser: (userId: string) => Promise<void>;
  loadUserCredentials: (userId: string) => Promise<void>;
  loadAllUsers: () => Promise<void>;
  trackUserActivity: (userId: string, activity: string, details: any) => Promise<void>;
  flagUser: (userId: string, reason: string) => Promise<void>;
  unflagUser: (userId: string) => Promise<void>;
  
  // Real-time monitoring
  startMonitoring: (userId: string) => void;
  stopMonitoring: (userId: string) => void;
  isMonitoring: (userId: string) => boolean;
}

export function useUserSurveillance(): UserSurveillanceHook {
  const {
    surveilledUsers,
    selectedUser,
    addSurveilledUser,
    updateSurveilledUser,
    setSelectedUser,
    addUserActivity,
    addAlert
  } = useAdminSurveillanceStore();

  const [userCredentials, setUserCredentials] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monitoredUsers] = useState<Set<string>>(new Set());

  const loadUser = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/surveillance/user/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load user data');
      }

      const userData = await response.json();
      
      // Add to store
      addSurveilledUser(userData.user);
      setSelectedUser(userData.user);

    } catch (err: any) {
      setError(err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [addSurveilledUser, setSelectedUser]);

  const loadUserCredentials = useCallback(async (userId: string) => {
    try {
      setCredentialsLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/surveillance/credentials/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load user credentials');
      }

      const credentials = await response.json();
      setUserCredentials(credentials);

    } catch (err: any) {
      setError(err.message || 'Failed to load credentials');
    } finally {
      setCredentialsLoading(false);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/surveillance/users');
      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const usersData = await response.json();
      
      // Add all users to store
      usersData.users.forEach((user: any) => {
        addSurveilledUser(user);
      });

    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [addSurveilledUser]);

  const trackUserActivity = useCallback(async (userId: string, activity: string, details: any) => {
    try {
      const response = await fetch('/api/admin/surveillance/track-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, activity, details })
      });

      if (!response.ok) {
        throw new Error('Failed to track activity');
      }

      // Add to live activity feed
      addUserActivity({
        userId,
        username: selectedUser?.username || 'Unknown',
        activityType: activity,
        details,
        timestamp: new Date(),
        riskScore: Math.random() // Would be calculated properly
      });

    } catch (err: any) {
      console.error('Activity tracking error:', err);
    }
  }, [addUserActivity, selectedUser]);

  const flagUser = useCallback(async (userId: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/surveillance/flag-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to flag user');
      }

      // Update user in store
      updateSurveilledUser(userId, {
        flagCount: (surveilledUsers.find(u => u.id === userId)?.flagCount || 0) + 1,
        surveillanceNotes: reason
      });

      // Create alert
      addAlert({
        id: `flag-${Date.now()}`,
        type: 'BEHAVIOR',
        level: 'MEDIUM',
        title: 'User Flagged',
        description: `User flagged for: ${reason}`,
        userId,
        username: surveilledUsers.find(u => u.id === userId)?.username || 'Unknown',
        timestamp: new Date(),
        isRead: false,
        actionRequired: true,
        relatedData: { reason }
      });

    } catch (err: any) {
      setError(err.message || 'Failed to flag user');
    }
  }, [updateSurveilledUser, addAlert, surveilledUsers]);

  const unflagUser = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/admin/surveillance/unflag-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to unflag user');
      }

      // Update user in store
      updateSurveilledUser(userId, {
        flagCount: Math.max(0, (surveilledUsers.find(u => u.id === userId)?.flagCount || 0) - 1)
      });

    } catch (err: any) {
      setError(err.message || 'Failed to unflag user');
    }
  }, [updateSurveilledUser, surveilledUsers]);

  const startMonitoring = useCallback((userId: string) => {
    monitoredUsers.add(userId);
    
    // Start real-time monitoring for this user
    // In a real implementation, this would set up WebSocket connections
    console.log(`Started monitoring user ${userId}`);
  }, [monitoredUsers]);

  const stopMonitoring = useCallback((userId: string) => {
    monitoredUsers.delete(userId);
    console.log(`Stopped monitoring user ${userId}`);
  }, [monitoredUsers]);

  const isMonitoring = useCallback((userId: string) => {
    return monitoredUsers.has(userId);
  }, [monitoredUsers]);

  return {
    surveilledUsers,
    selectedUser,
    userCredentials,
    loading,
    credentialsLoading,
    error,
    loadUser,
    loadUserCredentials,
    loadAllUsers,
    trackUserActivity,
    flagUser,
    unflagUser,
    startMonitoring,
    stopMonitoring,
    isMonitoring
  };
}

export function useAccountControl() {
  const { 
    activeTakeovers, 
    addTakeoverSession, 
    updateTakeoverSession, 
    removeTakeoverSession 
  } = useAdminSurveillanceStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const impersonateUser = useCallback(async (targetUserId: string, method: string, stealthMode: boolean = true) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/account-takeover/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, method, stealthMode })
      });

      if (!response.ok) {
        throw new Error('Failed to impersonate user');
      }

      const session = await response.json();
      
      addTakeoverSession({
        id: session.sessionId,
        adminId: session.adminId,
        targetUserId,
        targetUsername: session.targetUsername,
        method: method as any,
        isActive: true,
        stealthMode,
        startTime: new Date(),
        actionsPerformed: 0,
        lastAction: new Date()
      });

      return session;
    } catch (err: any) {
      setError(err.message || 'Failed to impersonate user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addTakeoverSession]);

  const performAction = useCallback(async (sessionId: string, action: string, data: any) => {
    try {
      const response = await fetch('/api/admin/account-takeover/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action, data })
      });

      if (!response.ok) {
        throw new Error('Failed to perform action');
      }

      // Update session in store
      updateTakeoverSession(sessionId, {
        actionsPerformed: (activeTakeovers.find(s => s.id === sessionId)?.actionsPerformed || 0) + 1,
        lastAction: new Date()
      });

      return await response.json();
    } catch (err: any) {
      setError(err.message || 'Failed to perform action');
      throw err;
    }
  }, [updateTakeoverSession, activeTakeovers]);

  const endSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch('/api/admin/account-takeover/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      removeTakeoverSession(sessionId);
    } catch (err: any) {
      setError(err.message || 'Failed to end session');
      throw err;
    }
  }, [removeTakeoverSession]);

  return {
    activeTakeovers,
    loading,
    error,
    impersonateUser,
    performAction,
    endSession
  };
}

export function useFakeUsers() {
  const { 
    activeFakeUsers, 
    addFakeUser, 
    updateFakeUser, 
    removeFakeUser,
    infiltrationOperations,
    addInfiltrationOp,
    updateInfiltrationOp
  } = useAdminSurveillanceStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFakeUser = useCallback(async (config: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/fake-users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to create fake user');
      }

      const fakeUser = await response.json();
      
      addFakeUser({
        id: fakeUser.id,
        username: fakeUser.username,
        displayName: fakeUser.displayName,
        isActive: true,
        assignedRooms: [],
        targetUsers: config.targetUsers || [],
        objectives: config.objectives || [],
        performanceScore: 0,
        coverStatus: 'INTACT',
        lastActivity: new Date(),
        createdBy: fakeUser.createdBy
      });

      return fakeUser;
    } catch (err: any) {
      setError(err.message || 'Failed to create fake user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addFakeUser]);

  const manageFakeUser = useCallback(async (fakeUserId: string, action: string, data?: any) => {
    try {
      const response = await fetch('/api/admin/fake-users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fakeUserId, action, data })
      });

      if (!response.ok) {
        throw new Error('Failed to manage fake user');
      }

      // Update in store based on action
      switch (action) {
        case 'ACTIVATE':
          updateFakeUser(fakeUserId, { isActive: true });
          break;
        case 'DEACTIVATE':
          updateFakeUser(fakeUserId, { isActive: false });
          break;
        case 'UPDATE_OBJECTIVES':
          updateFakeUser(fakeUserId, { objectives: data.objectives });
          break;
      }

    } catch (err: any) {
      setError(err.message || 'Failed to manage fake user');
      throw err;
    }
  }, [updateFakeUser]);

  const createInfiltrationOperation = useCallback(async (config: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/infiltration/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to create infiltration operation');
      }

      const operation = await response.json();
      
      addInfiltrationOp({
        id: operation.id,
        name: operation.name,
        targetRoom: operation.targetRoom,
        targetUsers: operation.targetUsers,
        assignedFakeUsers: operation.fakeUsersAssigned,
        status: 'PLANNING',
        progress: 0,
        informationExtracted: 0,
        startDate: new Date(),
        objectives: operation.objectives
      });

      return operation;
    } catch (err: any) {
      setError(err.message || 'Failed to create operation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addInfiltrationOp]);

  return {
    activeFakeUsers,
    infiltrationOperations,
    loading,
    error,
    createFakeUser,
    manageFakeUser,
    createInfiltrationOperation
  };
}

export function useMessageSurveillance() {
  const {
    interceptedMessages,
    typingData,
    addInterceptedMessage,
    addTypingData,
    clearTypingData
  } = useAdminSurveillanceStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interceptMessage = useCallback(async (messageId: string, action: string, actionData?: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/message-intercept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, action, actionData })
      });

      if (!response.ok) {
        throw new Error('Failed to intercept message');
      }

      const interception = await response.json();
      
      addInterceptedMessage({
        id: interception.id,
        originalMessageId: messageId,
        roomId: interception.roomId,
        senderId: interception.senderId,
        senderUsername: interception.senderUsername,
        content: interception.content,
        action: action as any,
        interceptedAt: new Date(),
        interceptedBy: interception.interceptedBy,
        isProcessed: false
      });

    } catch (err: any) {
      setError(err.message || 'Failed to intercept message');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addInterceptedMessage]);

  const monitorTyping = useCallback((userId: string, roomId: string, typingContent: string) => {
    addTypingData({
      userId,
      username: 'Unknown', // Would be fetched from user data
      roomId,
      typingContent,
      timestamp: new Date(),
      keystrokes: typingContent.length,
      isCurrentlyTyping: true
    });
  }, [addTypingData]);

  const startRoomMonitoring = useCallback(async (roomId: string, options: any) => {
    try {
      const response = await fetch('/api/admin/room-monitoring/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, options })
      });

      if (!response.ok) {
        throw new Error('Failed to start room monitoring');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to start monitoring');
      throw err;
    }
  }, []);

  const stopRoomMonitoring = useCallback(async (roomId: string) => {
    try {
      const response = await fetch('/api/admin/room-monitoring/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });

      if (!response.ok) {
        throw new Error('Failed to stop room monitoring');
      }

      // Clear typing data for this room
      clearTypingData(roomId);

    } catch (err: any) {
      setError(err.message || 'Failed to stop monitoring');
      throw err;
    }
  }, [clearTypingData]);

  return {
    interceptedMessages,
    typingData,
    loading,
    error,
    interceptMessage,
    monitorTyping,
    startRoomMonitoring,
    stopRoomMonitoring
  };
}

export function useAdminAlerts() {
  const { activeAlerts, addAlert, markAlertAsRead, removeAlert } = useAdminSurveillanceStore();

  const createAlert = useCallback((
    type: string,
    level: string,
    title: string,
    description: string,
    userId?: string,
    relatedData?: any
  ) => {
    addAlert({
      id: `alert-${Date.now()}`,
      type: type as any,
      level: level as any,
      title,
      description,
      userId,
      username: relatedData?.username,
      timestamp: new Date(),
      isRead: false,
      actionRequired: level === 'HIGH' || level === 'CRITICAL',
      relatedData
    });
  }, [addAlert]);

  const dismissAlert = useCallback((alertId: string) => {
    markAlertAsRead(alertId);
    setTimeout(() => removeAlert(alertId), 5000); // Remove after 5 seconds
  }, [markAlertAsRead, removeAlert]);

  return {
    activeAlerts,
    createAlert,
    dismissAlert,
    markAlertAsRead,
    removeAlert
  };
}
