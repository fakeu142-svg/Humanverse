'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredMask?: boolean;
}

export function AuthGuard({ 
  children, 
  fallback,
  requiredMask = false 
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-desert-300 font-display text-2xl">
          Loading...
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-6xl">🎭</div>
          <h2 className="text-2xl font-bold text-red-400">Access Required</h2>
          <p className="text-gray-400 max-w-md">
            Please log in to explore the Humanverse
          </p>
          <Link 
            href="/login"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  // Check if mask is required but user doesn't have one
  if (requiredMask && (!user?.currentMask || !user?.currentMask?.id)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-6xl">🎭</div>
          <h2 className="text-2xl font-bold text-yellow-400">Mask Required</h2>
          <p className="text-gray-400 max-w-md">
            You need to select a mask before accessing this area
          </p>
          <Link 
            href="/mask-selection"
            className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300"
          >
            Choose Your Mask
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGuard;
