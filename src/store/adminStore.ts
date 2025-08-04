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
        console.log('Admin login in demo mode');
        set({ isLoading: true, error: null });

        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // For demo purposes, accept specific credentials
        if (email === 'admin@humanverse.com' && password === 'HumanVerse2024!') {
          set({
            admin: {
              id: 'demo-admin',
              email: 'admin@humanverse.com',
              role: 'SUPER_ADMIN',
              permissions: {
                surveillance: true,
                userManagement: true,
                contentModeration: true,
                systemSettings: true,
                impersonation: true,
                dataExport: true,
                userCreation: true,
                adminManagement: true,
              },
              isActive: true,
              lastLogin: new Date(),
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
            sessionExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          });
          return true;
        } else {
          set({
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Invalid credentials. Use: admin@humanverse.com / HumanVerse2024!',
            sessionExpiry: null,
          });
          return false;
        }
      },

      logout: async () => {
        console.log('Admin logout in demo mode');
        set({
          admin: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          sessionExpiry: null,
        });
      },

      checkAuth: async () => {
        // Completely disabled - no fetch calls allowed
        console.log('Admin auth check completely disabled - demo mode');
        set({
          admin: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          sessionExpiry: null,
        });
        return;
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
