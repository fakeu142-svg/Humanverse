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
        if (AUTH_DISABLED) {
          console.log('Login disabled in demo mode');
          set({ isLoading: false, error: 'Login not available in demo mode' });
          return false;
        }

        try {
          set({ isLoading: true, error: null });

          const response = await safeFetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Login failed');
          }

          if (data.success && data.user) {
            set({
              user: {
                ...data.user,
                registrationDate: new Date(data.user.registrationDate),
                lastLogin: data.user.lastLogin ? new Date(data.user.lastLogin) : null,
              },
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          }

          throw new Error('Invalid response from server');
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Login failed',
          });
          return false;
        }
      },

      register: async (email: string, password: string) => {
        if (AUTH_DISABLED) {
          console.log('Registration disabled in demo mode');
          set({ isLoading: false, error: 'Registration not available in demo mode' });
          return false;
        }

        try {
          set({ isLoading: true, error: null });

          const response = await safeFetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
          }

          if (data.success && data.user) {
            set({
              user: {
                ...data.user,
                registrationDate: new Date(data.user.registrationDate),
                lastLogin: data.user.lastLogin ? new Date(data.user.lastLogin) : null,
              },
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          }

          throw new Error('Invalid response from server');
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Registration failed',
          });
          return false;
        }
      },

      logout: async () => {
        if (AUTH_DISABLED) {
          console.log('Logout disabled in demo mode');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          return;
        }

        try {
          set({ isLoading: true });

          await safeFetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Logout error:', error);
          // Force logout even if API call fails
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      checkAuth: async () => {
        // Global auth disable flag
        if (AUTH_DISABLED) {
          console.log('Auth functionality disabled globally');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isCheckingAuth: false,
            error: null
          });
          return;
        }

        try {
          // Skip auth check if running in demo environment or if backend unavailable
          const isDemo = typeof window !== 'undefined' && (
            window.location.hostname.includes('fly.dev') ||
            window.location.hostname.includes('localhost') ||
            process.env.NODE_ENV === 'development'
          );

          if (isDemo) {
            console.log('Auth check skipped in demo mode');
            // Set demo state - user is not authenticated but can browse
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isCheckingAuth: false,
              error: null
            });
            return;
          }
        } catch (error) {
          // If any error occurs during demo detection, assume it's demo mode
          console.log('Error during demo detection, assuming demo mode');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isCheckingAuth: false,
            error: null
          });
          return;
        }

        const { isCheckingAuth } = get();

        // Prevent multiple simultaneous auth checks
        if (isCheckingAuth) {
          return;
        }

        // Skip auth check entirely if running on server or window isn't ready
        if (typeof window === 'undefined') {
          set({ isLoading: false, isCheckingAuth: false });
          return;
        }

        try {
          set({ isLoading: true, isCheckingAuth: true });

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          const response = await safeFetch('/api/auth/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              set({
                user: {
                  ...data.user,
                  registrationDate: new Date(data.user.registrationDate),
                  lastLogin: data.user.lastLogin ? new Date(data.user.lastLogin) : null,
                },
                isAuthenticated: true,
                isLoading: false,
                isCheckingAuth: false,
                error: null,
              });
              return;
            }
          }

          // If check fails, clear auth state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isCheckingAuth: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Auth check error:', error);

          // Handle abort errors gracefully
          if (error.name === 'AbortError') {
            console.warn('Auth check aborted (timeout or cancelled)');
            set({ isLoading: false, isCheckingAuth: false });
            return;
          }

          // Don't clear auth state on network failures during development
          // Only clear if it's an actual auth failure
          if (process.env.NODE_ENV === 'development' &&
              (error.message?.includes('Failed to fetch') ||
               error.name === 'TypeError' ||
               error.message?.includes('NetworkError'))) {
            console.warn('Network error during auth check in development, keeping current state');
            set({ isLoading: false, isCheckingAuth: false });
            return;
          }

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isCheckingAuth: false,
            error: null,
          });
        }
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
