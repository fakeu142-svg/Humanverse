// Admin Truth Surveillance Store - Complete surveillance and manipulation control
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPsychProfile {
  id: string;
  email: string;
  riskScore: number;
  truthAnswerCount: number;
  insightCount: number;
  primaryVulnerabilities: string[];
  lastActivity: string;
  psychologicalProfile?: {
    fears: string[];
    desires: string[];
    shames: string[];
    traumas: string[];
    manipulationVulnerabilities: string[];
    emotionalPatterns: Record<string, any>;
    riskFactors: string[];
  };
  manipulationRecommendations?: Array<{
    type: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    techniques: string[];
  }>;
}

interface ConcerningAnswer {
  id: string;
  userId: string;
  userEmail: string;
  questionCategory: string;
  questionPreview: string;
  answerPreview: string;
  vulnerabilityScore: number;
  emotionalIntensity: number;
  userRiskScore: number;
  createdAt: string;
}

interface ManipulationCampaign {
  id: string;
  targetUserId: string;
  goal: 'isolate' | 'recruit' | 'destabilize' | 'extract_secrets' | 'emotional_manipulation';
  status: 'planning' | 'active' | 'completed' | 'paused';
  questionCount: number;
  fakeAnswerCount: number;
  effectiveness: number;
  startDate: string;
  endDate?: string;
  metrics: {
    targetEngagement: number;
    emotionalResponse: number;
    vulnerabilityExposure: number;
    behavioralChange: number;
  };
}

interface FakeContent {
  id: string;
  type: 'answer' | 'question' | 'vote';
  questionId?: string;
  content: string;
  narrativeGoal: string;
  believabilityScore: number;
  effectiveness: number;
  guessCount: number;
  successRate: number;
  createdAt: string;
}

interface SurveillanceTarget {
  userId: string;
  email: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  monitoringLevel: 'PASSIVE' | 'ACTIVE' | 'INVASIVE';
  riskScore: number;
  lastAnalysis: string;
  flags: string[];
  alerts: Array<{
    type: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: string;
  }>;
}

interface AnalyticsDashboard {
  summary: {
    totalUsers: number;
    highRiskUsers: number;
    totalTruthAnswers: number;
    totalPsychProfiles: number;
    averageRiskScore: number;
    lastUpdated: string;
  };
  trends: {
    dailyActivity: Array<{ date: string; answerCount: number; riskEvents: number }>;
    vulnerabilityDistribution: Record<string, number>;
    categoryRisk: Record<string, any>;
    manipulationEffectiveness: number;
  };
  alerts: Array<{
    id: string;
    type: 'HIGH_RISK_USER' | 'CONCERNING_ANSWER' | 'MANIPULATION_OPPORTUNITY' | 'SYSTEM_ALERT';
    message: string;
    userId?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: string;
    acknowledged: boolean;
  }>;
}

interface AdminTruthStore {
  // Dashboard data
  dashboard: AnalyticsDashboard | null;
  highRiskUsers: UserPsychProfile[];
  concerningAnswers: ConcerningAnswer[];
  surveillanceTargets: SurveillanceTarget[];
  
  // Manipulation tracking
  activeCampaigns: ManipulationCampaign[];
  fakeContent: FakeContent[];
  manipulationHistory: Array<{
    id: string;
    action: string;
    targetUserId?: string;
    timestamp: string;
    success: boolean;
    details: Record<string, any>;
  }>;
  
  // Current surveillance session
  currentTarget: UserPsychProfile | null;
  surveillanceMode: 'DASHBOARD' | 'USER_PROFILE' | 'MANIPULATION' | 'ANALYSIS';
  
  // Real-time monitoring
  liveMonitoring: {
    enabled: boolean;
    targets: string[];
    alerts: Array<{
      userId: string;
      type: string;
      data: any;
      timestamp: string;
    }>;
  };
  
  // UI state
  loading: boolean;
  error: string | null;
  selectedTimeRange: '24h' | '7d' | '30d' | '90d';
  filterRiskLevel: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sortBy: 'risk' | 'activity' | 'vulnerability' | 'recent';
  
  // Actions - Dashboard Management
  setDashboard: (dashboard: AnalyticsDashboard) => void;
  refreshDashboard: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // User Management
  setHighRiskUsers: (users: UserPsychProfile[]) => void;
  addHighRiskUser: (user: UserPsychProfile) => void;
  updateUserProfile: (userId: string, updates: Partial<UserPsychProfile>) => void;
  setCurrentTarget: (user: UserPsychProfile | null) => void;
  
  // Surveillance Management
  addSurveillanceTarget: (target: SurveillanceTarget) => void;
  removeSurveillanceTarget: (userId: string) => void;
  updateSurveillanceLevel: (userId: string, level: 'PASSIVE' | 'ACTIVE' | 'INVASIVE') => void;
  addAlert: (userId: string, alert: SurveillanceTarget['alerts'][0]) => void;
  
  // Manipulation Management
  createCampaign: (campaign: Omit<ManipulationCampaign, 'id'>) => void;
  updateCampaign: (id: string, updates: Partial<ManipulationCampaign>) => void;
  endCampaign: (id: string) => void;
  addFakeContent: (content: Omit<FakeContent, 'id'>) => void;
  updateContentEffectiveness: (id: string, effectiveness: number, successRate: number) => void;
  
  // Analysis and Insights
  generateUserInsights: (userId: string) => Promise<string[]>;
  calculateManipulationOpportunities: (userId: string) => Array<{
    type: string;
    confidence: number;
    description: string;
    techniques: string[];
  }>;
  exportPsychProfiles: (userIds: string[]) => Promise<any[]>;
  
  // Real-time Monitoring
  enableLiveMonitoring: (userIds: string[]) => void;
  disableLiveMonitoring: () => void;
  addLiveAlert: (alert: { userId: string; type: string; data: any }) => void;
  
  // Filters and Views
  setSurveillanceMode: (mode: 'DASHBOARD' | 'USER_PROFILE' | 'MANIPULATION' | 'ANALYSIS') => void;
  setTimeRange: (range: '24h' | '7d' | '30d' | '90d') => void;
  setRiskFilter: (level: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => void;
  setSortBy: (sort: 'risk' | 'activity' | 'vulnerability' | 'recent') => void;
  
  // Advanced Analytics
  getVulnerabilityTrends: () => Array<{ date: string; avgVulnerability: number }>;
  getManipulationMetrics: () => {
    totalCampaigns: number;
    activeCampaigns: number;
    successRate: number;
    avgEffectiveness: number;
  };
  getCategoryRiskAnalysis: () => Record<string, { risk: number; userCount: number }>;
  
  // Reset and Cleanup
  resetSurveillanceData: () => void;
  clearHistory: () => void;
}

const initialDashboard: AnalyticsDashboard = {
  summary: {
    totalUsers: 0,
    highRiskUsers: 0,
    totalTruthAnswers: 0,
    totalPsychProfiles: 0,
    averageRiskScore: 0,
    lastUpdated: new Date().toISOString()
  },
  trends: {
    dailyActivity: [],
    vulnerabilityDistribution: {},
    categoryRisk: {},
    manipulationEffectiveness: 0
  },
  alerts: []
};

export const useAdminTruthStore = create<AdminTruthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      dashboard: initialDashboard,
      highRiskUsers: [],
      concerningAnswers: [],
      surveillanceTargets: [],
      activeCampaigns: [],
      fakeContent: [],
      manipulationHistory: [],
      currentTarget: null,
      surveillanceMode: 'DASHBOARD',
      liveMonitoring: {
        enabled: false,
        targets: [],
        alerts: []
      },
      loading: false,
      error: null,
      selectedTimeRange: '7d',
      filterRiskLevel: 'ALL',
      sortBy: 'risk',

      // Basic setters
      setDashboard: (dashboard) => set({ dashboard }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setSurveillanceMode: (mode) => set({ surveillanceMode: mode }),
      setTimeRange: (range) => set({ selectedTimeRange: range }),
      setRiskFilter: (level) => set({ filterRiskLevel: level }),
      setSortBy: (sort) => set({ sortBy: sort }),

      // Dashboard management
      refreshDashboard: async () => {
        try {
          set({ loading: true, error: null });
          
          const response = await fetch('/api/admin/truth/analysis', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to refresh dashboard');
          }

          const data = await response.json();
          set({ 
            dashboard: {
              summary: data.summary,
              trends: data.statistics,
              alerts: data.recentActivity?.map((activity: any, index: number) => ({
                id: `alert_${index}`,
                type: 'SYSTEM_ALERT',
                message: `User activity: ${activity.category}`,
                userId: activity.userId,
                severity: activity.vulnerabilityScore > 80 ? 'HIGH' : 'MEDIUM',
                timestamp: activity.createdAt,
                acknowledged: false
              })) || []
            },
            highRiskUsers: data.highRiskUsers || [],
            concerningAnswers: data.concerningAnswers || []
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
          set({ loading: false });
        }
      },

      // User management
      setHighRiskUsers: (users) => set({ highRiskUsers: users }),
      addHighRiskUser: (user) => {
        const { highRiskUsers } = get();
        if (!highRiskUsers.find(u => u.id === user.id)) {
          set({ highRiskUsers: [user, ...highRiskUsers] });
        }
      },
      updateUserProfile: (userId, updates) => {
        const { highRiskUsers } = get();
        set({
          highRiskUsers: highRiskUsers.map(user =>
            user.id === userId ? { ...user, ...updates } : user
          )
        });
      },
      setCurrentTarget: (user) => set({ currentTarget: user }),

      // Surveillance management
      addSurveillanceTarget: (target) => {
        const { surveillanceTargets } = get();
        if (!surveillanceTargets.find(t => t.userId === target.userId)) {
          set({ surveillanceTargets: [target, ...surveillanceTargets] });
        }
      },
      removeSurveillanceTarget: (userId) => {
        const { surveillanceTargets } = get();
        set({
          surveillanceTargets: surveillanceTargets.filter(t => t.userId !== userId)
        });
      },
      updateSurveillanceLevel: (userId, level) => {
        const { surveillanceTargets } = get();
        set({
          surveillanceTargets: surveillanceTargets.map(target =>
            target.userId === userId ? { ...target, monitoringLevel: level } : target
          )
        });
      },
      addAlert: (userId, alert) => {
        const { surveillanceTargets } = get();
        set({
          surveillanceTargets: surveillanceTargets.map(target =>
            target.userId === userId 
              ? { ...target, alerts: [alert, ...target.alerts].slice(0, 50) }
              : target
          )
        });
      },

      // Manipulation management
      createCampaign: (campaignData) => {
        const campaign: ManipulationCampaign = {
          ...campaignData,
          id: `campaign_${Date.now()}`,
          status: 'planning',
          metrics: {
            targetEngagement: 0,
            emotionalResponse: 0,
            vulnerabilityExposure: 0,
            behavioralChange: 0
          },
          effectiveness: 0
        };
        
        const { activeCampaigns } = get();
        set({ activeCampaigns: [campaign, ...activeCampaigns] });
      },

      updateCampaign: (id, updates) => {
        const { activeCampaigns } = get();
        set({
          activeCampaigns: activeCampaigns.map(campaign =>
            campaign.id === id ? { ...campaign, ...updates } : campaign
          )
        });
      },

      endCampaign: (id) => {
        const { activeCampaigns, manipulationHistory } = get();
        const campaign = activeCampaigns.find(c => c.id === id);
        
        if (campaign) {
          // Move to history
          const historyEntry = {
            id: `history_${Date.now()}`,
            action: 'END_CAMPAIGN',
            targetUserId: campaign.targetUserId,
            timestamp: new Date().toISOString(),
            success: campaign.effectiveness > 50,
            details: campaign
          };
          
          set({
            activeCampaigns: activeCampaigns.filter(c => c.id !== id),
            manipulationHistory: [historyEntry, ...manipulationHistory]
          });
        }
      },

      addFakeContent: (contentData) => {
        const content: FakeContent = {
          ...contentData,
          id: `fake_${Date.now()}`,
          guessCount: 0,
          successRate: 0,
          effectiveness: 0
        };
        
        const { fakeContent } = get();
        set({ fakeContent: [content, ...fakeContent] });
      },

      updateContentEffectiveness: (id, effectiveness, successRate) => {
        const { fakeContent } = get();
        set({
          fakeContent: fakeContent.map(content =>
            content.id === id 
              ? { ...content, effectiveness, successRate }
              : content
          )
        });
      },

      // Analysis functions
      generateUserInsights: async (userId) => {
        try {
          const response = await fetch(`/api/admin/truth/analysis?userId=${userId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
          });

          if (!response.ok) {
            throw new Error('Failed to generate insights');
          }

          const data = await response.json();
          return data.behavioralInsights?.map((insight: any) => insight.description) || [];
        } catch (error) {
          console.error('Generate insights error:', error);
          return [];
        }
      },

      calculateManipulationOpportunities: (userId) => {
        const { highRiskUsers } = get();
        const user = highRiskUsers.find(u => u.id === userId);
        
        if (!user?.psychologicalProfile) return [];
        
        const opportunities = [];
        
        // Fear-based opportunities
        if (user.psychologicalProfile.fears.length > 0) {
          opportunities.push({
            type: 'Fear Exploitation',
            confidence: 0.8,
            description: `Target primary fears: ${user.psychologicalProfile.fears.slice(0, 2).join(', ')}`,
            techniques: ['Amplify existing fears', 'Create fear scenarios', 'Use fear for motivation']
          });
        }
        
        // Manipulation vulnerabilities
        if (user.psychologicalProfile.manipulationVulnerabilities.includes('isolation')) {
          opportunities.push({
            type: 'Social Isolation',
            confidence: 0.9,
            description: 'User shows vulnerability to isolation tactics',
            techniques: ['Exclude from groups', 'Question social connections', 'Create mistrust']
          });
        }
        
        return opportunities;
      },

      exportPsychProfiles: async (userIds) => {
        try {
          const response = await fetch('/api/admin/truth/analysis?export=true', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ userIds })
          });

          if (!response.ok) {
            throw new Error('Failed to export profiles');
          }

          return await response.json();
        } catch (error) {
          console.error('Export profiles error:', error);
          return [];
        }
      },

      // Live monitoring
      enableLiveMonitoring: (userIds) => {
        set({
          liveMonitoring: {
            enabled: true,
            targets: userIds,
            alerts: []
          }
        });
      },

      disableLiveMonitoring: () => {
        set({
          liveMonitoring: {
            enabled: false,
            targets: [],
            alerts: []
          }
        });
      },

      addLiveAlert: (alert) => {
        const { liveMonitoring } = get();
        set({
          liveMonitoring: {
            ...liveMonitoring,
            alerts: [
              { ...alert, timestamp: new Date().toISOString() },
              ...liveMonitoring.alerts
            ].slice(0, 100)
          }
        });
      },

      // Analytics
      getVulnerabilityTrends: () => {
        const { dashboard } = get();
        return dashboard?.trends.dailyActivity.map(day => ({
          date: day.date,
          avgVulnerability: day.riskEvents * 10 // Simplified calculation
        })) || [];
      },

      getManipulationMetrics: () => {
        const { activeCampaigns, manipulationHistory } = get();
        const totalCampaigns = activeCampaigns.length + manipulationHistory.length;
        const successfulCampaigns = manipulationHistory.filter(h => h.success).length;
        
        return {
          totalCampaigns,
          activeCampaigns: activeCampaigns.length,
          successRate: totalCampaigns > 0 ? (successfulCampaigns / totalCampaigns) * 100 : 0,
          avgEffectiveness: activeCampaigns.length > 0 ? 
            activeCampaigns.reduce((sum, c) => sum + c.effectiveness, 0) / activeCampaigns.length : 0
        };
      },

      getCategoryRiskAnalysis: () => {
        const { concerningAnswers } = get();
        const analysis: Record<string, { risk: number; userCount: number }> = {};
        
        concerningAnswers.forEach(answer => {
          const category = answer.questionCategory;
          if (!analysis[category]) {
            analysis[category] = { risk: 0, userCount: 0 };
          }
          analysis[category].risk += answer.vulnerabilityScore;
          analysis[category].userCount += 1;
        });
        
        // Calculate averages
        Object.keys(analysis).forEach(category => {
          analysis[category].risk = Math.round(analysis[category].risk / analysis[category].userCount);
        });
        
        return analysis;
      },

      // Reset functions
      resetSurveillanceData: () => set({
        dashboard: initialDashboard,
        highRiskUsers: [],
        concerningAnswers: [],
        surveillanceTargets: [],
        currentTarget: null,
        liveMonitoring: {
          enabled: false,
          targets: [],
          alerts: []
        }
      }),

      clearHistory: () => set({
        manipulationHistory: [],
        fakeContent: []
      })
    }),
    {
      name: 'admin-truth-surveillance',
      // Only persist essential data for admin sessions
      partialize: (state) => ({
        surveillanceTargets: state.surveillanceTargets,
        activeCampaigns: state.activeCampaigns,
        selectedTimeRange: state.selectedTimeRange,
        filterRiskLevel: state.filterRiskLevel,
        sortBy: state.sortBy,
        // Keep limited history
        manipulationHistory: state.manipulationHistory.slice(0, 100),
        fakeContent: state.fakeContent.slice(0, 50)
      })
    }
  )
);

// Selector hooks for admin components
export const useAdminDashboard = () => useAdminTruthStore(state => state.dashboard);
export const useHighRiskUsers = () => useAdminTruthStore(state => state.highRiskUsers);
export const useActiveCampaigns = () => useAdminTruthStore(state => state.activeCampaigns);
export const useSurveillanceTargets = () => useAdminTruthStore(state => state.surveillanceTargets);
export const useCurrentTarget = () => useAdminTruthStore(state => state.currentTarget);
export const useLiveMonitoring = () => useAdminTruthStore(state => state.liveMonitoring);
export const useAdminLoading = () => useAdminTruthStore(state => state.loading);
