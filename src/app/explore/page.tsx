'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function ExplorePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-desert-900 flex items-center justify-center">
        <div className="animate-pulse text-desert-300 font-display text-2xl">
          Loading your mask...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-desert-900 via-desert-800 to-desert-950">
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="font-display text-4xl font-bold text-desert-200 mb-2">
                Welcome to the Humanverse
              </h1>
              <p className="text-desert-400">
                Authenticated as: <span className="text-desert-300">{user.email}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-desert-600 hover:bg-desert-500 text-desert-100 px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Logout
            </button>
          </div>

          {/* User Info */}
          <div className="glass-desert rounded-lg p-6 mb-8">
            <h2 className="font-display text-2xl font-semibold text-desert-200 mb-4">
              Your Identity Profile
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-desert-400 text-sm mb-1">Account Status</p>
                <p className={`font-semibold ${user.isActive ? 'text-success' : 'text-danger'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <p className="text-desert-400 text-sm mb-1">Risk Score</p>
                <p className={`font-semibold ${
                  user.riskScore < 30 ? 'text-success' : 
                  user.riskScore < 70 ? 'text-warning' : 'text-danger'
                }`}>
                  {user.riskScore}/100
                </p>
              </div>
              <div>
                <p className="text-desert-400 text-sm mb-1">Member Since</p>
                <p className="text-desert-300 font-semibold">
                  {new Date(user.registrationDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-desert-400 text-sm mb-1">Last Login</p>
                <p className="text-desert-300 font-semibold">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </div>

          {/* Coming Soon Features */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-desert rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-mask-ashfox rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-desert-100 text-xl">💬</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-desert-200 mb-2">
                Chat Rooms
              </h3>
              <p className="text-desert-400 text-sm mb-4">
                Connect with others through anonymous messaging
              </p>
              <span className="inline-block bg-desert-700 text-desert-300 px-3 py-1 rounded-full text-xs">
                Coming Soon
              </span>
            </div>

            <div className="glass-desert rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-mask-violetcrow rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-desert-100 text-xl">🎭</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-desert-200 mb-2">
                Truth Games
              </h3>
              <p className="text-desert-400 text-sm mb-4">
                Challenge perceptions and discover authentic connections
              </p>
              <span className="inline-block bg-desert-700 text-desert-300 px-3 py-1 rounded-full text-xs">
                Coming Soon
              </span>
            </div>

            <div className="glass-desert rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-mask-echodust rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-desert-100 text-xl">📍</span>
              </div>
              <h3 className="font-display text-xl font-semibold text-desert-200 mb-2">
                Secret Drops
              </h3>
              <p className="text-desert-400 text-sm mb-4">
                Share location-based secrets and discoveries
              </p>
              <span className="inline-block bg-desert-700 text-desert-300 px-3 py-1 rounded-full text-xs">
                Coming Soon
              </span>
            </div>
          </div>

          {/* Development Notice */}
          <div className="mt-8 text-center">
            <p className="text-desert-500 text-sm">
              🔧 Humanverse is in active development. More features coming soon!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
