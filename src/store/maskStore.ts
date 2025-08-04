import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MaskType } from '@prisma/client';

export interface MaskTypeInfo {
  type: MaskType;
  name: string;
  baseColor: string;
  icon: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  personality: string[];
}

export interface CurrentMask {
  id: string;
  name: string;
  type: MaskType;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    variants: string[];
  };
  expiresAt: Date | null;
  streakCount: number;
  timeRemaining: number | null;
  isAdminControlled?: boolean;
}

interface MaskState {
  currentMask: CurrentMask | null;
  availableMaskTypes: MaskTypeInfo[];
  isLoading: boolean;
  error: string | null;
  selectedMaskType: MaskType | null;
  maskHistory: CurrentMask[];
}

interface MaskActions {
  setCurrentMask: (mask: CurrentMask | null) => void;
  setAvailableMaskTypes: (types: MaskTypeInfo[]) => void;
  setSelectedMaskType: (type: MaskType | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  createMask: (maskType: MaskType) => Promise<boolean>;
  renewMask: () => Promise<boolean>;
  loadAvailableMasks: () => Promise<void>;
  updateTimeRemaining: () => void;
  addToHistory: (mask: CurrentMask) => void;
  clearMask: () => void;
}

type MaskStore = MaskState & MaskActions;

export const useMaskStore = create<MaskStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentMask: null,
      availableMaskTypes: [],
      isLoading: false,
      error: null,
      selectedMaskType: null,
      maskHistory: [],

      // Actions
      setCurrentMask: (mask) => {
        set({ currentMask: mask, error: null });
        if (mask) {
          get().addToHistory(mask);
        }
      },

      setAvailableMaskTypes: (types) => {
        set({ availableMaskTypes: types });
      },

      setSelectedMaskType: (type) => {
        set({ selectedMaskType: type });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      clearMask: () => {
        set({ currentMask: null, selectedMaskType: null });
      },

      createMask: async (maskType: MaskType) => {
        try {
          set({ isLoading: true, error: null });

          const response = await fetch('/api/masks/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ maskType }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create mask');
          }

          if (data.success && data.mask) {
            const newMask: CurrentMask = {
              id: data.mask.id,
              name: data.mask.name,
              type: data.mask.type,
              colorScheme: data.mask.colorScheme,
              expiresAt: data.mask.expiresAt ? new Date(data.mask.expiresAt) : null,
              streakCount: data.mask.streakCount,
              timeRemaining: data.mask.expiresAt 
                ? Math.max(0, new Date(data.mask.expiresAt).getTime() - Date.now())
                : null,
            };

            set({
              currentMask: newMask,
              selectedMaskType: null,
              isLoading: false,
              error: null,
            });

            get().addToHistory(newMask);
            return true;
          }

          throw new Error('Invalid response from server');
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to create mask',
          });
          return false;
        }
      },

      renewMask: async () => {
        try {
          const { currentMask } = get();
          if (!currentMask) {
            throw new Error('No active mask to renew');
          }

          set({ isLoading: true, error: null });

          const response = await fetch('/api/masks/renew', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ maskId: currentMask.id }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to renew mask');
          }

          if (data.success && data.mask) {
            const renewedMask: CurrentMask = {
              ...currentMask,
              expiresAt: data.mask.expiresAt ? new Date(data.mask.expiresAt) : null,
              streakCount: data.mask.streakCount,
              timeRemaining: data.mask.timeRemaining,
            };

            set({
              currentMask: renewedMask,
              isLoading: false,
              error: null,
            });

            return true;
          }

          throw new Error('Invalid response from server');
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to renew mask',
          });
          return false;
        }
      },

      loadAvailableMasks: async () => {
        console.log('Loading demo mask types');
        set({ isLoading: true, error: null });

        // Demo mask types
        const demoMaskTypes: MaskTypeInfo[] = [
          {
            type: 'SHADOW',
            name: 'Shadow Walker',
            baseColor: '#2D1B69',
            icon: '🌑',
            description: 'Move unseen through the digital realm. Masters of stealth and observation.',
            rarity: 'common',
            personality: ['Mysterious', 'Observant', 'Strategic']
          },
          {
            type: 'NEON',
            name: 'Neon Rebel',
            baseColor: '#FF0080',
            icon: '⚡',
            description: 'Electric personalities who light up the darkness with vibrant energy.',
            rarity: 'uncommon',
            personality: ['Energetic', 'Bold', 'Creative']
          },
          {
            type: 'CRYSTAL',
            name: 'Crystal Sage',
            baseColor: '#00FFD1',
            icon: '💎',
            description: 'Wisdom flows through them like light through a prism. Seekers of truth.',
            rarity: 'rare',
            personality: ['Wise', 'Intuitive', 'Peaceful']
          },
          {
            type: 'VOID',
            name: 'Void Dancer',
            baseColor: '#000000',
            icon: '🕳️',
            description: 'They embrace the unknown and dance between realities.',
            rarity: 'epic',
            personality: ['Enigmatic', 'Fearless', 'Transcendent']
          },
          {
            type: 'PHOENIX',
            name: 'Phoenix Rising',
            baseColor: '#FF4500',
            icon: '🔥',
            description: 'Reborn from digital ashes, they bring transformation and renewal.',
            rarity: 'legendary',
            personality: ['Transformative', 'Passionate', 'Resilient']
          }
        ];

        // Simulate async loading
        setTimeout(() => {
          set({
            availableMaskTypes: demoMaskTypes,
            currentMask: null,
            isLoading: false,
            error: null,
          });
        }, 500);
      },

      updateTimeRemaining: () => {
        const { currentMask } = get();
        if (currentMask && currentMask.expiresAt) {
          const timeRemaining = Math.max(0, new Date(currentMask.expiresAt).getTime() - Date.now());
          set({
            currentMask: {
              ...currentMask,
              timeRemaining,
            },
          });

          // Auto-clear mask if expired
          if (timeRemaining === 0) {
            set({ currentMask: null });
          }
        }
      },

      addToHistory: (mask) => {
        const { maskHistory } = get();
        const existingIndex = maskHistory.findIndex(m => m.id === mask.id);
        
        let newHistory;
        if (existingIndex >= 0) {
          // Update existing entry
          newHistory = [...maskHistory];
          newHistory[existingIndex] = mask;
        } else {
          // Add new entry, keep last 10
          newHistory = [mask, ...maskHistory].slice(0, 10);
        }

        set({ maskHistory: newHistory });
      },
    }),
    {
      name: 'humanverse-mask',
      partialize: (state) => ({
        currentMask: state.currentMask,
        maskHistory: state.maskHistory,
        availableMaskTypes: state.availableMaskTypes,
      }),
    }
  )
);

// Auto-update time remaining every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useMaskStore.getState();
    if (state.currentMask && state.currentMask.expiresAt) {
      state.updateTimeRemaining();
    }
  }, 60000); // Update every minute
}

// Utility hooks
export function useMaskTimer() {
  const { currentMask, updateTimeRemaining } = useMaskStore();

  const formatTimeRemaining = (milliseconds: number | null): string => {
    if (!milliseconds || milliseconds <= 0) return 'Expired';

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getExpiryStatus = (): 'active' | 'expiring' | 'expired' => {
    if (!currentMask?.timeRemaining) return 'expired';
    
    const hoursRemaining = currentMask.timeRemaining / (1000 * 60 * 60);
    if (hoursRemaining <= 2) return 'expiring';
    return 'active';
  };

  return {
    currentMask,
    timeRemaining: currentMask?.timeRemaining || 0,
    formattedTime: formatTimeRemaining(currentMask?.timeRemaining || 0),
    expiryStatus: getExpiryStatus(),
    updateTimeRemaining,
  };
}

export function useMaskSelection() {
  const {
    selectedMaskType,
    availableMaskTypes,
    setSelectedMaskType,
    createMask,
    loadAvailableMasks,
    isLoading,
    error,
    clearError,
  } = useMaskStore();

  const selectMaskType = (type: MaskType) => {
    setSelectedMaskType(type);
    clearError();
  };

  const confirmSelection = async () => {
    if (!selectedMaskType) return false;
    return await createMask(selectedMaskType);
  };

  const getMaskTypeInfo = (type: MaskType) => {
    return availableMaskTypes.find(mask => mask.type === type);
  };

  return {
    selectedMaskType,
    availableMaskTypes,
    selectMaskType,
    confirmSelection,
    getMaskTypeInfo,
    loadAvailableMasks,
    isLoading,
    error,
    clearError,
  };
}

export function useMaskHistory() {
  const { maskHistory } = useMaskStore();

  const getUsageStats = () => {
    const typeUsage = maskHistory.reduce((acc, mask) => {
      acc[mask.type] = (acc[mask.type] || 0) + 1;
      return acc;
    }, {} as Record<MaskType, number>);

    const totalStreaks = maskHistory.reduce((sum, mask) => sum + mask.streakCount, 0);
    const averageStreak = maskHistory.length > 0 ? totalStreaks / maskHistory.length : 0;

    return {
      totalMasks: maskHistory.length,
      typeUsage,
      totalStreaks,
      averageStreak: Math.round(averageStreak * 10) / 10,
      favoriteType: Object.entries(typeUsage).reduce((a, b) => typeUsage[a[0]] > typeUsage[b[0]] ? a : b)?.[0] as MaskType,
    };
  };

  return {
    maskHistory,
    getUsageStats,
  };
}
