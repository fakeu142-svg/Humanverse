// Truth Game Store - Comprehensive state management for TruthVerse
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TruthQuestion {
  id: string;
  category: string;
  question: string;
  difficulty: number;
  psychTags: string[];
  emotionalTrigger?: string;
}

interface TruthAnswer {
  id: string;
  questionId: string;
  answer: string;
  isLie: boolean;
  maskName: string;
  score: number;
  vulnerabilityScore: number;
  emotionalIntensity: number;
  createdAt: string;
}

interface TruthGuess {
  id: string;
  answerId: string;
  guessedTruth: boolean;
  isCorrect: boolean;
  confidence: number;
  score: number;
  reasoning?: string;
  createdAt: string;
}

interface GameSession {
  id: string;
  questionsAnswered: number;
  truthsRevealed: number;
  liesRevealed: number;
  totalScore: number;
  vulnerabilityLevel: number;
  currentStreak: number;
  longestStreak: number;
  startedAt: string;
  lastActivity: string;
}

interface UserStats {
  totalQuestions: number;
  totalGuesses: number;
  correctGuesses: number;
  accuracy: number;
  totalScore: number;
  averageVulnerability: number;
  categoryPerformance: Record<string, {
    answered: number;
    correct: number;
    accuracy: number;
    avgVulnerability: number;
  }>;
  psychologicalProfile: {
    dominantEmotions: string[];
    vulnerabilityAreas: string[];
    manipulationSusceptibility: number;
    riskFactors: string[];
  };
}

interface TruthFeedItem {
  id: string;
  question: {
    text: string;
    category: string;
    difficulty: number;
  };
  answer: string;
  maskName: string;
  emotionalIntensity: number;
  believabilityScore: number;
  guessCount: number;
  communityGuess: {
    truthPercentage: number;
    liePercentage: number;
  };
  createdAt: string;
}

interface TruthStore {
  // Current game state
  currentQuestion: TruthQuestion | null;
  currentSession: GameSession | null;
  userStats: UserStats | null;
  
  // Collections
  answeredQuestions: TruthAnswer[];
  userGuesses: TruthGuess[];
  truthFeed: TruthFeedItem[];
  
  // UI state
  gameMode: 'answer' | 'guess' | 'feed' | 'stats';
  selectedCategory: string;
  selectedDifficulty: number;
  loading: boolean;
  error: string | null;
  
  // Psychological tracking
  emotionalState: {
    currentEmotion: string;
    intensity: number;
    triggers: string[];
    sessionEmotions: Array<{
      emotion: string;
      intensity: number;
      timestamp: string;
    }>;
  };
  
  // Actions
  setCurrentQuestion: (question: TruthQuestion | null) => void;
  setGameMode: (mode: 'answer' | 'guess' | 'feed' | 'stats') => void;
  setCategory: (category: string) => void;
  setDifficulty: (difficulty: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Game actions
  startNewSession: () => void;
  endCurrentSession: () => void;
  addAnswer: (answer: TruthAnswer) => void;
  addGuess: (guess: TruthGuess) => void;
  updateStats: (stats: Partial<UserStats>) => void;
  updateEmotionalState: (emotion: string, intensity: number, triggers?: string[]) => void;
  
  // Feed actions
  setTruthFeed: (feed: TruthFeedItem[]) => void;
  addToFeed: (item: TruthFeedItem) => void;
  
  // Session management
  incrementQuestionsAnswered: () => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  addScore: (points: number) => void;
  
  // Analytics
  getEmotionalPattern: () => Record<string, number>;
  getVulnerabilityTrend: () => number[];
  getCategoryPreferences: () => Record<string, number>;
  getPsychologicalInsights: () => string[];
  
  // Reset functions
  resetGameState: () => void;
  clearHistory: () => void;
}

const initialEmotionalState = {
  currentEmotion: 'neutral',
  intensity: 0,
  triggers: [],
  sessionEmotions: []
};

const initialUserStats: UserStats = {
  totalQuestions: 0,
  totalGuesses: 0,
  correctGuesses: 0,
  accuracy: 0,
  totalScore: 0,
  averageVulnerability: 0,
  categoryPerformance: {},
  psychologicalProfile: {
    dominantEmotions: [],
    vulnerabilityAreas: [],
    manipulationSusceptibility: 0,
    riskFactors: []
  }
};

export const useTruthStore = create<TruthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentQuestion: null,
      currentSession: null,
      userStats: initialUserStats,
      answeredQuestions: [],
      userGuesses: [],
      truthFeed: [],
      gameMode: 'answer',
      selectedCategory: 'all',
      selectedDifficulty: 3,
      loading: false,
      error: null,
      emotionalState: initialEmotionalState,

      // Basic setters
      setCurrentQuestion: (question) => set({ currentQuestion: question }),
      setGameMode: (mode) => set({ gameMode: mode }),
      setCategory: (category) => set({ selectedCategory: category }),
      setDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // Game management
      startNewSession: () => {
        const newSession: GameSession = {
          id: `session_${Date.now()}`,
          questionsAnswered: 0,
          truthsRevealed: 0,
          liesRevealed: 0,
          totalScore: 0,
          vulnerabilityLevel: 1,
          currentStreak: 0,
          longestStreak: 0,
          startedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
        
        set({ 
          currentSession: newSession,
          emotionalState: {
            ...initialEmotionalState,
            sessionEmotions: []
          }
        });
      },

      endCurrentSession: () => {
        const { currentSession } = get();
        if (currentSession) {
          // Save session to history or send to server
          set({ currentSession: null });
        }
      },

      addAnswer: (answer) => {
        const { currentSession, answeredQuestions } = get();
        
        set({
          answeredQuestions: [answer, ...answeredQuestions],
          currentSession: currentSession ? {
            ...currentSession,
            questionsAnswered: currentSession.questionsAnswered + 1,
            truthsRevealed: currentSession.truthsRevealed + (answer.isLie ? 0 : 1),
            liesRevealed: currentSession.liesRevealed + (answer.isLie ? 1 : 0),
            totalScore: currentSession.totalScore + answer.score,
            vulnerabilityLevel: Math.max(
              currentSession.vulnerabilityLevel,
              Math.ceil(answer.vulnerabilityScore / 20)
            ),
            lastActivity: new Date().toISOString()
          } : null
        });
      },

      addGuess: (guess) => {
        const { userGuesses, currentSession } = get();
        
        set({
          userGuesses: [guess, ...userGuesses],
          currentSession: currentSession ? {
            ...currentSession,
            totalScore: currentSession.totalScore + guess.score,
            currentStreak: guess.isCorrect ? currentSession.currentStreak + 1 : 0,
            longestStreak: guess.isCorrect ? 
              Math.max(currentSession.longestStreak, currentSession.currentStreak + 1) :
              currentSession.longestStreak,
            lastActivity: new Date().toISOString()
          } : null
        });
      },

      updateStats: (stats) => {
        const { userStats } = get();
        set({
          userStats: userStats ? { ...userStats, ...stats } : { ...initialUserStats, ...stats }
        });
      },

      updateEmotionalState: (emotion, intensity, triggers = []) => {
        const { emotionalState } = get();
        
        const newEmotionEntry = {
          emotion,
          intensity,
          timestamp: new Date().toISOString()
        };

        set({
          emotionalState: {
            currentEmotion: emotion,
            intensity,
            triggers: [...new Set([...emotionalState.triggers, ...triggers])],
            sessionEmotions: [newEmotionEntry, ...emotionalState.sessionEmotions].slice(0, 50)
          }
        });
      },

      // Feed management
      setTruthFeed: (feed) => set({ truthFeed: feed }),
      addToFeed: (item) => {
        const { truthFeed } = get();
        set({ truthFeed: [item, ...truthFeed] });
      },

      // Session updates
      incrementQuestionsAnswered: () => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              questionsAnswered: currentSession.questionsAnswered + 1,
              lastActivity: new Date().toISOString()
            }
          });
        }
      },

      incrementStreak: () => {
        const { currentSession } = get();
        if (currentSession) {
          const newStreak = currentSession.currentStreak + 1;
          set({
            currentSession: {
              ...currentSession,
              currentStreak: newStreak,
              longestStreak: Math.max(currentSession.longestStreak, newStreak),
              lastActivity: new Date().toISOString()
            }
          });
        }
      },

      resetStreak: () => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              currentStreak: 0,
              lastActivity: new Date().toISOString()
            }
          });
        }
      },

      addScore: (points) => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              totalScore: currentSession.totalScore + points,
              lastActivity: new Date().toISOString()
            }
          });
        }
      },

      // Analytics
      getEmotionalPattern: () => {
        const { emotionalState } = get();
        const emotions: Record<string, number> = {};
        
        emotionalState.sessionEmotions.forEach(entry => {
          emotions[entry.emotion] = (emotions[entry.emotion] || 0) + entry.intensity;
        });
        
        return emotions;
      },

      getVulnerabilityTrend: () => {
        const { answeredQuestions } = get();
        return answeredQuestions
          .slice(0, 10)
          .reverse()
          .map(answer => answer.vulnerabilityScore);
      },

      getCategoryPreferences: () => {
        const { answeredQuestions } = get();
        const preferences: Record<string, number> = {};
        
        answeredQuestions.forEach(answer => {
          // Would need to get category from question - simplified here
          const category = 'GENERAL'; // This would come from the question
          preferences[category] = (preferences[category] || 0) + 1;
        });
        
        return preferences;
      },

      getPsychologicalInsights: () => {
        const { emotionalState, answeredQuestions, userStats } = get();
        const insights: string[] = [];
        
        // Emotional pattern insights
        const emotions = get().getEmotionalPattern();
        const dominantEmotion = Object.entries(emotions)
          .sort(([,a], [,b]) => b - a)[0]?.[0];
        
        if (dominantEmotion && dominantEmotion !== 'neutral') {
          insights.push(`Your responses show a pattern of ${dominantEmotion} emotions`);
        }
        
        // Vulnerability insights
        const avgVulnerability = answeredQuestions.length > 0 ?
          answeredQuestions.reduce((sum, a) => sum + a.vulnerabilityScore, 0) / answeredQuestions.length : 0;
        
        if (avgVulnerability > 70) {
          insights.push('Your answers reveal high emotional vulnerability');
        } else if (avgVulnerability > 40) {
          insights.push('Your responses show moderate emotional openness');
        }
        
        // Behavioral insights
        if (emotionalState.triggers.length > 3) {
          insights.push(`Multiple emotional triggers detected: ${emotionalState.triggers.slice(0, 3).join(', ')}`);
        }
        
        return insights;
      },

      // Reset functions
      resetGameState: () => set({
        currentQuestion: null,
        currentSession: null,
        gameMode: 'answer',
        selectedCategory: 'all',
        selectedDifficulty: 3,
        loading: false,
        error: null,
        emotionalState: initialEmotionalState
      }),

      clearHistory: () => set({
        answeredQuestions: [],
        userGuesses: [],
        truthFeed: [],
        userStats: initialUserStats,
        emotionalState: initialEmotionalState
      })
    }),
    {
      name: 'truth-game-store',
      // Only persist specific parts of the state
      partialize: (state) => ({
        userStats: state.userStats,
        answeredQuestions: state.answeredQuestions.slice(0, 50), // Limit history
        userGuesses: state.userGuesses.slice(0, 100),
        selectedCategory: state.selectedCategory,
        selectedDifficulty: state.selectedDifficulty,
        emotionalState: {
          ...state.emotionalState,
          sessionEmotions: state.emotionalState.sessionEmotions.slice(0, 20)
        }
      })
    }
  )
);

// Selector hooks for optimized re-renders
export const useCurrentSession = () => useTruthStore(state => state.currentSession);
export const useGameMode = () => useTruthStore(state => state.gameMode);
export const useEmotionalState = () => useTruthStore(state => state.emotionalState);
export const useUserStats = () => useTruthStore(state => state.userStats);
export const useTruthFeed = () => useTruthStore(state => state.truthFeed);
export const useGameLoading = () => useTruthStore(state => state.loading);
export const useGameError = () => useTruthStore(state => state.error);

// Computed selectors
export const useGameProgress = () => useTruthStore(state => {
  const session = state.currentSession;
  if (!session) return null;
  
  return {
    questionsAnswered: session.questionsAnswered,
    score: session.totalScore,
    streak: session.currentStreak,
    vulnerabilityLevel: session.vulnerabilityLevel,
    accuracy: session.questionsAnswered > 0 ? 
      Math.round((session.truthsRevealed / session.questionsAnswered) * 100) : 0
  };
});

export const usePsychologicalInsights = () => useTruthStore(state => state.getPsychologicalInsights());
