import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Global flag to completely disable auth in demo environments
const AUTH_DISABLED = true;

// Safe fetch wrapper to prevent analytics interference
const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    // Use protected fetch to avoid third-party interference
    const fetchFn = (typeof window !== 'undefined' && (window as any).__protectedFetch) ||
                   (globalThis as any).__originalFetch ||
                   fetch;
    return await fetchFn(url, options);
  } catch (error: any) {
    console.warn('Fetch failed, likely in demo environment:', error.message);
    // Return a mock failed response to prevent errors
    return {
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: () => Promise.resolve({ error: 'Service unavailable in demo mode' }),
      text: () => Promise.resolve(''),
      headers: new Headers(),
      redirected: false,
      type: 'basic' as ResponseType,
      url: url,
      clone: function() { return this; },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
    };
  }
};

export interface AuthUser {
  id: string;
  email: string;
  isActive: boolean;
  registrationDate: Date;
  lastLogin: Date | null;
  riskScore: number;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isCheckingAuth: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isCheckingAuth: false,

      // Actions
      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        });
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

      login: async (email: string, password: string) => {
        console.log('Login disabled in demo mode');
        set({ isLoading: false, error: 'Login not available in demo mode' });
        return false;
      },

      register: async (email: string, password: string) => {
        console.log('Registration disabled in demo mode');
        set({ isLoading: false, error: 'Registration not available in demo mode' });
        return false;
      },

      logout: async () => {
        console.log('Logout in demo mode');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      checkAuth: async () => {
        // Completely disabled - no fetch calls allowed
        console.log('Auth check completely disabled - demo mode');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isCheckingAuth: false,
          error: null
        });
        return;
      },
    }),
    {
      name: 'humanverse-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
