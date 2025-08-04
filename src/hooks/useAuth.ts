import { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    clearError,
  } = useAuthStore();

  // Auto-check authentication on mount
  useEffect(() => {
    if (!isAuthenticated && !user) {
      checkAuth();
    }
  }, [checkAuth, isAuthenticated, user]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
    clearError,
  };
}

// Hook for protected routes
export function useProtectedRoute() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isLoading) {
        await checkAuth();
        if (!isAuthenticated) {
          toast.error('Please log in to access this page');
          router.push('/auth/login');
        }
      }
    };

    verifyAuth();
  }, [isAuthenticated, isLoading, checkAuth, router]);

  return { isAuthenticated, isLoading };
}

// Hook for guest-only routes (login, register)
export function useGuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/explore');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}

// Hook for automatic logout on token expiry
export function useAutoLogout() {
  const { user, logout, checkAuth } = useAuth();
  
  useEffect(() => {
    if (!user) return;

    // Check authentication status every 5 minutes
    const interval = setInterval(async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auto auth check failed:', error);
        // If check fails, logout user
        await logout();
        toast.error('Session expired. Please log in again.');
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, logout, checkAuth]);
}

// Hook for user session management
export function useUserSession() {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  }, [logout]);

  const getUserInfo = useCallback(() => {
    if (!user || !isAuthenticated) return null;

    return {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin,
      riskScore: user.riskScore,
      accountAge: user.registrationDate 
        ? Math.floor((Date.now() - new Date(user.registrationDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    };
  }, [user, isAuthenticated]);

  return {
    user,
    isAuthenticated,
    logout: handleLogout,
    getUserInfo,
  };
}

// Hook for authentication form handling
export function useAuthForm() {
  const { login, register, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  const handleLogin = useCallback(async (email: string, password: string) => {
    clearError();
    const success = await login(email, password);
    
    if (success) {
      toast.success('Welcome back to the Humanverse!');
      router.push('/explore');
      return true;
    } else {
      toast.error(error || 'Login failed');
      return false;
    }
  }, [login, error, clearError, router]);

  const handleRegister = useCallback(async (email: string, password: string) => {
    clearError();
    const success = await register(email, password);
    
    if (success) {
      toast.success('Welcome to the Humanverse! Your mask awaits...');
      router.push('/explore');
      return true;
    } else {
      toast.error(error || 'Registration failed');
      return false;
    }
  }, [register, error, clearError, router]);

  return {
    handleLogin,
    handleRegister,
    isLoading,
    error,
    clearError,
  };
}

// Hook for checking user permissions/status
export function useUserPermissions() {
  const { user } = useAuth();

  const canAccessFeature = useCallback((feature: string) => {
    if (!user) return false;

    // Check based on risk score and account status
    switch (feature) {
      case 'dropSecrets':
        return user.isActive && user.riskScore < 80;
      case 'truthGame':
        return user.isActive && user.riskScore < 90;
      case 'messaging':
        return user.isActive && user.riskScore < 95;
      default:
        return user.isActive;
    }
  }, [user]);

  const getRiskLevel = useCallback(() => {
    if (!user) return 'unknown';

    if (user.riskScore >= 80) return 'high';
    if (user.riskScore >= 50) return 'medium';
    return 'low';
  }, [user]);

  return {
    canAccessFeature,
    getRiskLevel,
    riskScore: user?.riskScore || 0,
    isActive: user?.isActive || false,
  };
}
