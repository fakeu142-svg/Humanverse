import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminPermissions {
  surveillance: boolean;
  userManagement: boolean;
  contentModeration: boolean;
  systemSettings: boolean;
  impersonation: boolean;
  dataExport: boolean;
  userCreation: boolean;
  adminManagement: boolean;
}

export interface AuthAdmin {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'MODERATOR' | 'SURVEILLANCE' | 'TECHNICAL';
  permissions: AdminPermissions;
  isActive: boolean;
  lastLogin: Date | null;
}

interface AdminState {
  admin: AuthAdmin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiry: Date | null;
}

interface AdminActions {
  setAdmin: (admin: AuthAdmin | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: keyof AdminPermissions) => boolean;
  isRole: (role: AuthAdmin['role']) => boolean;
}

type AdminStore = AdminState & AdminActions;

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      // Initial state
      admin: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,

      // Actions
      setAdmin: (admin) => {
        const sessionExpiry = admin ? 
          new Date(Date.now() + parseInt(process.env.NEXT_PUBLIC_ADMIN_SESSION_TIMEOUT || '3600') * 1000) : 
          null;
        
        set({
          admin,
          isAuthenticated: !!admin,
          error: null,
          sessionExpiry,
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
        try {
          set({ isLoading: true, error: null });

          const response = await fetch('/api/admin/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email, 
              password, 
              action: 'login' 
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Admin login failed');
          }

          if (data.success && data.admin) {
            const sessionExpiry = new Date(Date.now() + parseInt(process.env.NEXT_PUBLIC_ADMIN_SESSION_TIMEOUT || '3600') * 1000);
            
            set({
              admin: {
                ...data.admin,
                lastLogin: data.admin.lastLogin ? new Date(data.admin.lastLogin) : null,
              },
              isAuthenticated: true,
              isLoading: false,
              error: null,
              sessionExpiry,
            });
            return true;
          }

          throw new Error('Invalid response from server');
        } catch (error: any) {
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Admin login failed',
            sessionExpiry: null,
          });
          return false;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          await fetch('/api/admin/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'logout' }),
          });

          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessionExpiry: null,
          });
        } catch (error: any) {
          console.error('Admin logout error:', error);
          // Force logout even if API call fails
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessionExpiry: null,
          });
        }
      },

      checkAuth: async () => {
        try {
          const state = get();
          
          // Check if session has expired
          if (state.sessionExpiry && new Date() > state.sessionExpiry) {
            set({
              admin: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'Session expired',
              sessionExpiry: null,
            });
            return;
          }

          set({ isLoading: true });

          const response = await fetch('/api/admin/auth', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.admin) {
              const sessionExpiry = new Date(Date.now() + parseInt(process.env.NEXT_PUBLIC_ADMIN_SESSION_TIMEOUT || '3600') * 1000);
              
              set({
                admin: {
                  ...data.admin,
                  lastLogin: data.admin.lastLogin ? new Date(data.admin.lastLogin) : null,
                },
                isAuthenticated: true,
                isLoading: false,
                error: null,
                sessionExpiry,
              });
              return;
            }
          }

          // If check fails, clear auth state
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessionExpiry: null,
          });
        } catch (error: any) {
          console.error('Admin auth check error:', error);
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessionExpiry: null,
          });
        }
      },

      hasPermission: (permission: keyof AdminPermissions) => {
        const { admin } = get();
        if (!admin) return false;
        
        // Super admin has all permissions
        if (admin.role === 'SUPER_ADMIN') return true;
        
        return admin.permissions[permission] === true;
      },

      isRole: (role: AuthAdmin['role']) => {
        const { admin } = get();
        return admin?.role === role;
      },
    }),
    {
      name: 'humanverse-admin-auth',
      partialize: (state) => ({
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
);

// Auto-logout when session expires
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useAdminStore.getState();
    if (state.isAuthenticated && state.sessionExpiry && new Date() > state.sessionExpiry) {
      console.log('Admin session expired, logging out...');
      state.logout();
    }
  }, 60000); // Check every minute
}
