'use client';

import { useEffect, useState } from 'react';
import { useAdminStore, AdminPermissions } from '@/store/adminStore';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface AdminGuardProps {
  children: React.ReactNode;
  requiredPermission?: keyof AdminPermissions;
  requiredRole?: 'SUPER_ADMIN' | 'MODERATOR' | 'SURVEILLANCE' | 'TECHNICAL';
  fallback?: React.ReactNode;
}

export default function AdminGuard({ 
  children, 
  requiredPermission, 
  requiredRole,
  fallback 
}: AdminGuardProps) {
  const { admin, isAuthenticated, isLoading, checkAuth, hasPermission, isRole } = useAdminStore();
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Admin auth checks completely disabled in demo mode
    console.log('AdminGuard: Auth checks disabled');
    setIsChecking(false);
  }, [isAuthenticated, isLoading, checkAuth]);

  // Show loading while checking authentication
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-admin-900 flex items-center justify-center admin-theme">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-danger border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-admin-300 font-mono">Verifying credentials...</p>
        </motion.div>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!isAuthenticated || !admin) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    router.push('/admin/login');
    return null;
  }

  // Check role requirement
  if (requiredRole && !isRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-admin-900 flex items-center justify-center admin-theme">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto text-center"
        >
          <div className="glass-admin rounded-lg p-8 border border-danger/30">
            <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <h2 className="font-mono text-xl font-bold text-danger mb-2">
              ACCESS DENIED
            </h2>
            <p className="text-admin-300 mb-4">
              Insufficient role permissions for this resource.
            </p>
            <div className="bg-admin-800/50 rounded-lg p-4 mb-4">
              <p className="text-admin-400 text-sm font-mono">
                Required Role: <span className="text-warning">{requiredRole}</span>
              </p>
              <p className="text-admin-400 text-sm font-mono">
                Your Role: <span className="text-info">{admin.role}</span>
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-admin-600 hover:bg-admin-500 text-admin-100 px-4 py-2 rounded font-mono text-sm transition-colors duration-200"
            >
              Go Back
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-admin-900 flex items-center justify-center admin-theme">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto text-center"
        >
          <div className="glass-admin rounded-lg p-8 border border-danger/30">
            <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="font-mono text-xl font-bold text-danger mb-2">
              PERMISSION DENIED
            </h2>
            <p className="text-admin-300 mb-4">
              You don't have permission to access this resource.
            </p>
            <div className="bg-admin-800/50 rounded-lg p-4 mb-4">
              <p className="text-admin-400 text-sm font-mono">
                Required Permission: <span className="text-warning">{requiredPermission}</span>
              </p>
              <p className="text-admin-400 text-sm font-mono">
                Role: <span className="text-info">{admin.role}</span>
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-admin-600 hover:bg-admin-500 text-admin-100 px-4 py-2 rounded font-mono text-sm transition-colors duration-200"
            >
              Go Back
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
}

// Higher-order component for page protection
export function withAdminAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredPermission?: keyof AdminPermissions;
    requiredRole?: 'SUPER_ADMIN' | 'MODERATOR' | 'SURVEILLANCE' | 'TECHNICAL';
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <AdminGuard 
        requiredPermission={options?.requiredPermission}
        requiredRole={options?.requiredRole}
      >
        <Component {...props} />
      </AdminGuard>
    );
  };
}

// Permission checker hook
export function useAdminPermission(permission: keyof AdminPermissions) {
  const { hasPermission } = useAdminStore();
  return hasPermission(permission);
}

// Role checker hook
export function useAdminRole(role: 'SUPER_ADMIN' | 'MODERATOR' | 'SURVEILLANCE' | 'TECHNICAL') {
  const { isRole } = useAdminStore();
  return isRole(role);
}
