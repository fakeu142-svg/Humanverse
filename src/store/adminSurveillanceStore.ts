import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SurveillanceState {
  // Active surveillance operations
  activeOperations: ActiveOperation[];
  
  // Live monitoring data
  liveUserActivity: UserActivity[];
  liveMessages: LiveMessage[];
  liveLocations: LiveLocation[];
  
  // User surveillance data
  surveilledUsers: SurveilledUser[];
  selectedUser: SurveilledUser | null;
  
  // Alerts and flags
  activeAlerts: SurveillanceAlert[];
  flaggedContent: FlaggedContent[];
  
  // Fake users and infiltration
  activeFakeUsers: FakeUser[];
  infiltrationOperations: InfiltrationOp[];
  
  // Impersonation sessions
  activeTakeovers: TakeoverSession[];
  
  // Message interception
  interceptedMessages: InterceptedMsg[];
  typingData: TypingData[];
  
  // Real-time status
  isConnected: boolean;
  lastUpdate: Date;
  
  // UI state
  activeView: string;
  selectedRoom: string | null;
  filterSettings: FilterSettings;
  
  // Performance metrics
  performanceMetrics: PerformanceMetrics;
}

export interface ActiveOperation {
  id: string;
  type: 'SURVEILLANCE' | 'INFILTRATION' | 'IMPERSONATION' | 'MANIPULATION';
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  progress: number;
  startTime: Date;
  estimatedEndTime?: Date;
  targetUsers: string[];
  adminId: string;
  details: any;
}

export interface UserActivity {
  userId: string;
  username: string;
  activityType: string;
  details: any;
  timestamp: Date;
  location?: string;
  riskScore: number;
}

export interface LiveMessage {
  id: string;
  userId: string;
  username: string;
  roomId: string;
  roomName: string;
  content: string;
  timestamp: Date;
  isIntercepted: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface LiveLocation {
  userId: string;
  username: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  city: string;
  region: string;
  timestamp: Date;
  source: string;
}

export interface SurveilledUser {
  id: string;
  username: string;
  email: string;
  isOnline: boolean;
  lastActive: Date;
  riskScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flagCount: number;
  surveillanceNotes: string;
  psychProfile?: any;
  locationHistory?: any[];
  activitySummary: any;
}

export interface SurveillanceAlert {
  id: string;
  type: 'SECURITY' | 'BEHAVIOR' | 'CONTENT' | 'LOCATION' | 'SYSTEM';
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  userId?: string;
  username?: string;
  timestamp: Date;
  isRead: boolean;
  actionRequired: boolean;
  relatedData: any;
}

export interface FlaggedContent {
  id: string;
  contentId: string;
  contentType: 'MESSAGE' | 'TRUTH_ANSWER' | 'DROPZONE_SECRET';
  userId: string;
  username: string;
  content: string;
  flagReason: string;
  flaggedBy: string;
  flaggedAt: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'REMOVED';
}

export interface FakeUser {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  assignedRooms: string[];
  targetUsers: string[];
  objectives: string[];
  performanceScore: number;
  coverStatus: 'INTACT' | 'COMPROMISED' | 'SUSPECTED';
  lastActivity: Date;
  createdBy: string;
}

export interface InfiltrationOp {
  id: string;
  name: string;
  targetRoom: string;
  targetUsers: string[];
  assignedFakeUsers: string[];
  status: 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'COMPROMISED';
  progress: number;
  informationExtracted: number;
  startDate: Date;
  endDate?: Date;
  objectives: string[];
}

export interface TakeoverSession {
  id: string;
  adminId: string;
  targetUserId: string;
  targetUsername: string;
  method: 'CREDENTIAL' | 'SESSION_HIJACK' | 'TOKEN_FORGE';
  isActive: boolean;
  stealthMode: boolean;
  startTime: Date;
  actionsPerformed: number;
  lastAction: Date;
}

export interface InterceptedMsg {
  id: string;
  originalMessageId: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  action: 'MONITOR' | 'MODIFY' | 'BLOCK' | 'REDIRECT';
  interceptedAt: Date;
  interceptedBy: string;
  isProcessed: boolean;
}

export interface TypingData {
  userId: string;
  username: string;
  roomId: string;
  typingContent: string;
  timestamp: Date;
  keystrokes: number;
  isCurrentlyTyping: boolean;
}

export interface FilterSettings {
  userRiskLevel: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertLevel: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeRange: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'ALL';
  activityTypes: string[];
  rooms: string[];
  showOnlineOnly: boolean;
  showFlaggedOnly: boolean;
}

export interface PerformanceMetrics {
  totalUsers: number;
  onlineUsers: number;
  activeOperations: number;
  interceptedMessages: number;
  flaggedContent: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  systemLoad: number;
  responseTime: number;
}

export interface SurveillanceActions {
  // Connection management
  connect: () => void;
  disconnect: () => void;
  updateConnectionStatus: (isConnected: boolean) => void;
  
  // User surveillance
  addSurveilledUser: (user: SurveilledUser) => void;
  updateSurveilledUser: (userId: string, updates: Partial<SurveilledUser>) => void;
  setSelectedUser: (user: SurveilledUser | null) => void;
  removeSurveilledUser: (userId: string) => void;
  
  // Live monitoring
  addUserActivity: (activity: UserActivity) => void;
  addLiveMessage: (message: LiveMessage) => void;
  addLiveLocation: (location: LiveLocation) => void;
  clearLiveData: (type: 'activity' | 'messages' | 'locations' | 'all') => void;
  
  // Alerts and flags
  addAlert: (alert: SurveillanceAlert) => void;
  markAlertAsRead: (alertId: string) => void;
  removeAlert: (alertId: string) => void;
  addFlaggedContent: (content: FlaggedContent) => void;
  updateFlaggedContent: (contentId: string, updates: Partial<FlaggedContent>) => void;
  
  // Operations management
  addOperation: (operation: ActiveOperation) => void;
  updateOperation: (operationId: string, updates: Partial<ActiveOperation>) => void;
  removeOperation: (operationId: string) => void;
  
  // Fake users and infiltration
  addFakeUser: (fakeUser: FakeUser) => void;
  updateFakeUser: (userId: string, updates: Partial<FakeUser>) => void;
  removeFakeUser: (userId: string) => void;
  addInfiltrationOp: (operation: InfiltrationOp) => void;
  updateInfiltrationOp: (opId: string, updates: Partial<InfiltrationOp>) => void;
  
  // Impersonation
  addTakeoverSession: (session: TakeoverSession) => void;
  updateTakeoverSession: (sessionId: string, updates: Partial<TakeoverSession>) => void;
  removeTakeoverSession: (sessionId: string) => void;
  
  // Message interception
  addInterceptedMessage: (message: InterceptedMsg) => void;
  updateInterceptedMessage: (messageId: string, updates: Partial<InterceptedMsg>) => void;
  addTypingData: (typing: TypingData) => void;
  clearTypingData: (roomId?: string) => void;
  
  // UI state
  setActiveView: (view: string) => void;
  setSelectedRoom: (roomId: string | null) => void;
  updateFilterSettings: (filters: Partial<FilterSettings>) => void;
  
  // Performance metrics
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  
  // Bulk operations
  loadInitialData: (data: Partial<SurveillanceState>) => void;
  resetStore: () => void;
}

const initialState: SurveillanceState = {
  activeOperations: [],
  liveUserActivity: [],
  liveMessages: [],
  liveLocations: [],
  surveilledUsers: [],
  selectedUser: null,
  activeAlerts: [],
  flaggedContent: [],
  activeFakeUsers: [],
  infiltrationOperations: [],
  activeTakeovers: [],
  interceptedMessages: [],
  typingData: [],
  isConnected: false,
  lastUpdate: new Date(),
  activeView: 'dashboard',
  selectedRoom: null,
  filterSettings: {
    userRiskLevel: 'ALL',
    alertLevel: 'ALL',
    timeRange: 'DAY',
    activityTypes: [],
    rooms: [],
    showOnlineOnly: false,
    showFlaggedOnly: false
  },
  performanceMetrics: {
    totalUsers: 0,
    onlineUsers: 0,
    activeOperations: 0,
    interceptedMessages: 0,
    flaggedContent: 0,
    riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
    systemLoad: 0,
    responseTime: 0
  }
};

export const useAdminSurveillanceStore = create<SurveillanceState & SurveillanceActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Connection management
      connect: () => {
        set({ isConnected: true, lastUpdate: new Date() });
      },

      disconnect: () => {
        set({ isConnected: false });
      },

      updateConnectionStatus: (isConnected: boolean) => {
        set({ isConnected, lastUpdate: new Date() });
      },

      // User surveillance
      addSurveilledUser: (user: SurveilledUser) => {
        set(state => ({
          surveilledUsers: [...state.surveilledUsers.filter(u => u.id !== user.id), user]
        }));
      },

      updateSurveilledUser: (userId: string, updates: Partial<SurveilledUser>) => {
        set(state => ({
          surveilledUsers: state.surveilledUsers.map(user =>
            user.id === userId ? { ...user, ...updates } : user
          ),
          selectedUser: state.selectedUser?.id === userId 
            ? { ...state.selectedUser, ...updates } 
            : state.selectedUser
        }));
      },

      setSelectedUser: (user: SurveilledUser | null) => {
        set({ selectedUser: user });
      },

      removeSurveilledUser: (userId: string) => {
        set(state => ({
          surveilledUsers: state.surveilledUsers.filter(user => user.id !== userId),
          selectedUser: state.selectedUser?.id === userId ? null : state.selectedUser
        }));
      },

      // Live monitoring
      addUserActivity: (activity: UserActivity) => {
        set(state => ({
          liveUserActivity: [activity, ...state.liveUserActivity.slice(0, 499)] // Keep last 500
        }));
      },

      addLiveMessage: (message: LiveMessage) => {
        set(state => ({
          liveMessages: [message, ...state.liveMessages.slice(0, 199)] // Keep last 200
        }));
      },

      addLiveLocation: (location: LiveLocation) => {
        set(state => ({
          liveLocations: [location, ...state.liveLocations.slice(0, 99)] // Keep last 100
        }));
      },

      clearLiveData: (type: 'activity' | 'messages' | 'locations' | 'all') => {
        set(state => ({
          liveUserActivity: type === 'activity' || type === 'all' ? [] : state.liveUserActivity,
          liveMessages: type === 'messages' || type === 'all' ? [] : state.liveMessages,
          liveLocations: type === 'locations' || type === 'all' ? [] : state.liveLocations
        }));
      },

      // Alerts and flags
      addAlert: (alert: SurveillanceAlert) => {
        set(state => ({
          activeAlerts: [alert, ...state.activeAlerts.slice(0, 99)] // Keep last 100
        }));
      },

      markAlertAsRead: (alertId: string) => {
        set(state => ({
          activeAlerts: state.activeAlerts.map(alert =>
            alert.id === alertId ? { ...alert, isRead: true } : alert
          )
        }));
      },

      removeAlert: (alertId: string) => {
        set(state => ({
          activeAlerts: state.activeAlerts.filter(alert => alert.id !== alertId)
        }));
      },

      addFlaggedContent: (content: FlaggedContent) => {
        set(state => ({
          flaggedContent: [content, ...state.flaggedContent.filter(c => c.id !== content.id)]
        }));
      },

      updateFlaggedContent: (contentId: string, updates: Partial<FlaggedContent>) => {
        set(state => ({
          flaggedContent: state.flaggedContent.map(content =>
            content.id === contentId ? { ...content, ...updates } : content
          )
        }));
      },

      // Operations management
      addOperation: (operation: ActiveOperation) => {
        set(state => ({
          activeOperations: [...state.activeOperations.filter(op => op.id !== operation.id), operation]
        }));
      },

      updateOperation: (operationId: string, updates: Partial<ActiveOperation>) => {
        set(state => ({
          activeOperations: state.activeOperations.map(op =>
            op.id === operationId ? { ...op, ...updates } : op
          )
        }));
      },

      removeOperation: (operationId: string) => {
        set(state => ({
          activeOperations: state.activeOperations.filter(op => op.id !== operationId)
        }));
      },

      // Fake users and infiltration
      addFakeUser: (fakeUser: FakeUser) => {
        set(state => ({
          activeFakeUsers: [...state.activeFakeUsers.filter(u => u.id !== fakeUser.id), fakeUser]
        }));
      },

      updateFakeUser: (userId: string, updates: Partial<FakeUser>) => {
        set(state => ({
          activeFakeUsers: state.activeFakeUsers.map(user =>
            user.id === userId ? { ...user, ...updates } : user
          )
        }));
      },

      removeFakeUser: (userId: string) => {
        set(state => ({
          activeFakeUsers: state.activeFakeUsers.filter(user => user.id !== userId)
        }));
      },

      addInfiltrationOp: (operation: InfiltrationOp) => {
        set(state => ({
          infiltrationOperations: [...state.infiltrationOperations.filter(op => op.id !== operation.id), operation]
        }));
      },

      updateInfiltrationOp: (opId: string, updates: Partial<InfiltrationOp>) => {
        set(state => ({
          infiltrationOperations: state.infiltrationOperations.map(op =>
            op.id === opId ? { ...op, ...updates } : op
          )
        }));
      },

      // Impersonation
      addTakeoverSession: (session: TakeoverSession) => {
        set(state => ({
          activeTakeovers: [...state.activeTakeovers.filter(s => s.id !== session.id), session]
        }));
      },

      updateTakeoverSession: (sessionId: string, updates: Partial<TakeoverSession>) => {
        set(state => ({
          activeTakeovers: state.activeTakeovers.map(session =>
            session.id === sessionId ? { ...session, ...updates } : session
          )
        }));
      },

      removeTakeoverSession: (sessionId: string) => {
        set(state => ({
          activeTakeovers: state.activeTakeovers.filter(session => session.id !== sessionId)
        }));
      },

      // Message interception
      addInterceptedMessage: (message: InterceptedMsg) => {
        set(state => ({
          interceptedMessages: [message, ...state.interceptedMessages.slice(0, 199)] // Keep last 200
        }));
      },

      updateInterceptedMessage: (messageId: string, updates: Partial<InterceptedMsg>) => {
        set(state => ({
          interceptedMessages: state.interceptedMessages.map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        }));
      },

      addTypingData: (typing: TypingData) => {
        set(state => ({
          typingData: [typing, ...state.typingData.slice(0, 49)] // Keep last 50
        }));
      },

      clearTypingData: (roomId?: string) => {
        set(state => ({
          typingData: roomId 
            ? state.typingData.filter(t => t.roomId !== roomId)
            : []
        }));
      },

      // UI state
      setActiveView: (view: string) => {
        set({ activeView: view });
      },

      setSelectedRoom: (roomId: string | null) => {
        set({ selectedRoom: roomId });
      },

      updateFilterSettings: (filters: Partial<FilterSettings>) => {
        set(state => ({
          filterSettings: { ...state.filterSettings, ...filters }
        }));
      },

      // Performance metrics
      updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => {
        set(state => ({
          performanceMetrics: { ...state.performanceMetrics, ...metrics },
          lastUpdate: new Date()
        }));
      },

      // Bulk operations
      loadInitialData: (data: Partial<SurveillanceState>) => {
        set(state => ({ ...state, ...data, lastUpdate: new Date() }));
      },

      resetStore: () => {
        set(initialState);
      }
    }),
    {
      name: 'admin-surveillance-store',
      partialize: (state) => ({
        // Only persist certain parts of the state
        filterSettings: state.filterSettings,
        activeView: state.activeView,
        selectedRoom: state.selectedRoom
      })
    }
  )
);

// Utility hooks for specific parts of the store
export const useActiveAlerts = () => useAdminSurveillanceStore(state => state.activeAlerts);
export const useLiveActivity = () => useAdminSurveillanceStore(state => state.liveUserActivity);
export const useActiveFakeUsers = () => useAdminSurveillanceStore(state => state.activeFakeUsers);
export const useActiveTakeovers = () => useAdminSurveillanceStore(state => state.activeTakeovers);
export const usePerformanceMetrics = () => useAdminSurveillanceStore(state => state.performanceMetrics);
export const useFilterSettings = () => useAdminSurveillanceStore(state => state.filterSettings);

// Selector hooks for filtered data
export const useFilteredUsers = () => {
  return useAdminSurveillanceStore(state => {
    const { surveilledUsers, filterSettings } = state;
    
    return surveilledUsers.filter(user => {
      if (filterSettings.userRiskLevel !== 'ALL' && user.threatLevel !== filterSettings.userRiskLevel) {
        return false;
      }
      if (filterSettings.showOnlineOnly && !user.isOnline) {
        return false;
      }
      if (filterSettings.showFlaggedOnly && user.flagCount === 0) {
        return false;
      }
      return true;
    });
  });
};

export const useFilteredAlerts = () => {
  return useAdminSurveillanceStore(state => {
    const { activeAlerts, filterSettings } = state;
    
    return activeAlerts.filter(alert => {
      if (filterSettings.alertLevel !== 'ALL' && alert.level !== filterSettings.alertLevel) {
        return false;
      }
      
      const now = new Date();
      const alertAge = now.getTime() - alert.timestamp.getTime();
      
      switch (filterSettings.timeRange) {
        case 'HOUR':
          return alertAge <= 60 * 60 * 1000;
        case 'DAY':
          return alertAge <= 24 * 60 * 60 * 1000;
        case 'WEEK':
          return alertAge <= 7 * 24 * 60 * 60 * 1000;
        case 'MONTH':
          return alertAge <= 30 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    });
  });
};

// Action creators for common operations
export const surveillance = {
  // Quick access to common actions
  addUser: (user: SurveilledUser) => useAdminSurveillanceStore.getState().addSurveilledUser(user),
  flagContent: (content: FlaggedContent) => useAdminSurveillanceStore.getState().addFlaggedContent(content),
  createAlert: (alert: SurveillanceAlert) => useAdminSurveillanceStore.getState().addAlert(alert),
  
  // Batch operations
  updateMultipleUsers: (updates: Array<{userId: string, data: Partial<SurveilledUser>}>) => {
    const { updateSurveilledUser } = useAdminSurveillanceStore.getState();
    updates.forEach(({ userId, data }) => updateSurveilledUser(userId, data));
  },
  
  clearOldData: () => {
    const { clearLiveData } = useAdminSurveillanceStore.getState();
    clearLiveData('all');
  }
};
