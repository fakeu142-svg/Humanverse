import { useEffect, useCallback } from 'react';
import { useAdminStore, AdminPermissions } from '@/store/adminStore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export function useAdminAuth() {
  const {
    admin,
    isAuthenticated,
    isLoading,
    error,
    sessionExpiry,
    login,
    logout,
    checkAuth,
    clearError,
    hasPermission,
    isRole,
  } = useAdminStore();

  // Auto-check authentication on mount
  useEffect(() => {
    if (!isAuthenticated && !admin) {
      checkAuth();
    }
  }, [checkAuth, isAuthenticated, admin]);

  // Auto-logout on session expiry
  useEffect(() => {
    if (sessionExpiry && new Date() > sessionExpiry) {
      logout();
      toast.error('Admin session expired');
    }
  }, [sessionExpiry, logout]);

  // Add mock implementations for security settings
  const updateSecuritySettings = async (settings: any) => {
    console.log('Updating security settings:', settings);
    return true;
  };

  const getSecurityLogs = async () => {
    return [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        adminId: '1',
        adminUsername: 'admin',
        action: 'Login',
        details: 'Successful admin login',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/120.0.0.0',
        riskLevel: 'low',
        status: 'success'
      }
    ];
  };

  return {
    admin,
    isAuthenticated,
    isLoading,
    error,
    sessionExpiry,
    login,
    logout,
    checkAuth,
    clearError,
    hasPermission,
    isRole,
    updateSecuritySettings,
    getSecurityLogs,
  };
}

// Hook for admin protected routes
export function useAdminProtectedRoute(
  requiredPermission?: keyof AdminPermissions,
  requiredRole?: 'SUPER_ADMIN' | 'MODERATOR' | 'SURVEILLANCE' | 'TECHNICAL'
) {
  const { isAuthenticated, isLoading, checkAuth, hasPermission, isRole } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    const verifyAdminAuth = async () => {
      if (!isLoading) {
        await checkAuth();
        
        if (!isAuthenticated) {
          toast.error('Admin authentication required');
          router.push('/admin/login');
          return;
        }

        // Check role requirement
        if (requiredRole && !isRole(requiredRole)) {
          toast.error('Insufficient role permissions');
          router.push('/admin/soulgate');
          return;
        }

        // Check permission requirement
        if (requiredPermission && !hasPermission(requiredPermission)) {
          toast.error('Insufficient permissions');
          router.push('/admin/soulgate');
          return;
        }
      }
    };

    verifyAdminAuth();
  }, [
    isAuthenticated, 
    isLoading, 
    checkAuth, 
    hasPermission, 
    isRole, 
    requiredPermission, 
    requiredRole, 
    router
  ]);

  return { 
    isAuthenticated, 
    isLoading,
    hasAccess: isAuthenticated && 
               (!requiredRole || isRole(requiredRole)) && 
               (!requiredPermission || hasPermission(requiredPermission))
  };
}

// Hook for admin form handling
export function useAdminAuthForm() {
  const { login, isLoading, error, clearError } = useAdminAuth();
  const router = useRouter();

  const handleLogin = useCallback(async (email: string, password: string) => {
    clearError();
    const success = await login(email, password);
    
    if (success) {
      toast.success('Admin access granted');
      router.push('/admin/soulgate');
      return true;
    } else {
      toast.error(error || 'Admin authentication failed');
      return false;
    }
  }, [login, error, clearError, router]);

  return {
    handleLogin,
    isLoading,
    error,
    clearError,
  };
}

// Hook for admin session management
export function useAdminSession() {
  const { admin, isAuthenticated, logout, sessionExpiry } = useAdminAuth();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('Admin logged out successfully');
    } catch (error) {
      toast.error('Admin logout failed');
    }
  }, [logout]);

  const getSessionInfo = useCallback(() => {
    if (!admin || !isAuthenticated) return null;

    const now = new Date();
    const expiry = sessionExpiry ? new Date(sessionExpiry) : null;
    const timeUntilExpiry = expiry ? expiry.getTime() - now.getTime() : 0;
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
      lastLogin: admin.lastLogin,
      sessionExpiry: expiry,
      minutesUntilExpiry: Math.max(0, minutesUntilExpiry),
      isExpired: timeUntilExpiry <= 0,
    };
  }, [admin, isAuthenticated, sessionExpiry]);

  const extendSession = useCallback(async () => {
    // This would typically make an API call to extend the session
    // For now, we'll just check auth to refresh the token
    const { checkAuth } = useAdminStore.getState();
    await checkAuth();
    toast.success('Session extended');
  }, []);

  return {
    admin,
    isAuthenticated,
    logout: handleLogout,
    getSessionInfo,
    extendSession,
  };
}

// Hook for permission-based UI rendering
export function useAdminPermissions() {
  const { hasPermission, isRole, admin } = useAdminAuth();

  const canPerformAction = useCallback((action: string) => {
    if (!admin) return false;

    // Map actions to permissions
    const actionPermissions: Record<string, keyof AdminPermissions> = {
      viewUsers: 'surveillance',
      editUsers: 'userManagement',
      deleteUsers: 'userManagement',
      moderateContent: 'contentModeration',
      impersonateUser: 'impersonation',
      exportData: 'dataExport',
      manageSystem: 'systemSettings',
      createAdmins: 'adminManagement',
    };

    const requiredPermission = actionPermissions[action];
    return requiredPermission ? hasPermission(requiredPermission) : false;
  }, [hasPermission, admin]);

  const getAvailableActions = useCallback(() => {
    if (!admin) return [];

    const actions = [];
    if (hasPermission('surveillance')) actions.push('viewUsers', 'monitorActivity');
    if (hasPermission('userManagement')) actions.push('editUsers', 'deleteUsers');
    if (hasPermission('contentModeration')) actions.push('moderateContent');
    if (hasPermission('impersonation')) actions.push('impersonateUser');
    if (hasPermission('dataExport')) actions.push('exportData');
    if (hasPermission('systemSettings')) actions.push('manageSystem');
    if (hasPermission('adminManagement')) actions.push('createAdmins');

    return actions;
  }, [hasPermission, admin]);

  const getRoleCapabilities = useCallback(() => {
    if (!admin) return [];

    const capabilities = [];
    switch (admin.role) {
      case 'SUPER_ADMIN':
        capabilities.push('Full system access', 'User management', 'Admin management', 'Data export');
        break;
      case 'MODERATOR':
        capabilities.push('Content moderation', 'User management', 'Surveillance');
        break;
      case 'SURVEILLANCE':
        capabilities.push('User monitoring', 'Data export', 'Impersonation');
        break;
      case 'TECHNICAL':
        capabilities.push('System settings', 'Technical maintenance');
        break;
    }
    return capabilities;
  }, [admin]);

  return {
    canPerformAction,
    getAvailableActions,
    getRoleCapabilities,
    hasPermission,
    isRole,
    role: admin?.role,
    permissions: admin?.permissions,
  };
}

// Hook for real-time admin session monitoring
export function useAdminSessionMonitor() {
  const { admin, sessionExpiry, logout } = useAdminAuth();

  useEffect(() => {
    if (!admin || !sessionExpiry) return;

    // Check session expiry every minute
    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(sessionExpiry);
      const timeUntilExpiry = expiry.getTime() - now.getTime();
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

      // Warn when 5 minutes remaining
      if (minutesUntilExpiry === 5) {
        toast.warning('Admin session expires in 5 minutes', {
          duration: 10000,
        });
      }

      // Warn when 1 minute remaining
      if (minutesUntilExpiry === 1) {
        toast.error('Admin session expires in 1 minute!', {
          duration: 10000,
        });
      }

      // Auto-logout on expiry
      if (timeUntilExpiry <= 0) {
        logout();
        toast.error('Admin session expired');
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [admin, sessionExpiry, logout]);

  const getSessionStatus = useCallback(() => {
    if (!admin || !sessionExpiry) return null;

    const now = new Date();
    const expiry = new Date(sessionExpiry);
    const timeUntilExpiry = expiry.getTime() - now.getTime();
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

    return {
      isActive: timeUntilExpiry > 0,
      minutesRemaining: Math.max(0, minutesUntilExpiry),
      expiresAt: expiry,
      isNearExpiry: minutesUntilExpiry <= 5,
    };
  }, [admin, sessionExpiry]);

  return { getSessionStatus };
}
