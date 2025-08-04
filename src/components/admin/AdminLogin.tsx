'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAdminStore } from '@/store/adminStore';
import { toast } from 'react-hot-toast';

interface AdminLoginProps {
  onSuccess?: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('admin@humanverse.com');
  const [password, setPassword] = useState('HumanVerse2024!');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, isLoading, error, clearError } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    const success = await login(email, password);
    
    if (success) {
      toast.success('Admin access granted');
      onSuccess?.();
    } else {
      toast.error(error || 'Admin authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-admin-900 flex items-center justify-center p-4 admin-theme">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="glass-admin rounded-lg p-8 shadow-xl border border-admin-600/30">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </motion.div>
            <h2 className="font-mono text-2xl font-bold text-admin-100 mb-2">
              ADMIN ACCESS
            </h2>
            <p className="text-admin-400 text-sm">
              Surveillance Control Interface
            </p>
            <div className="mt-2 text-xs text-danger">
              ⚠️ RESTRICTED ACCESS ⚠️
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-danger/10 border border-danger/50 rounded-lg p-4 scanning-line"
              >
                <p className="text-danger text-sm text-center font-mono">{error}</p>
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="admin-email" 
                  className="block text-admin-300 text-sm font-mono font-medium mb-2"
                >
                  ADMIN ID
                </label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-admin-800/50 border border-admin-600 rounded-lg text-admin-100 placeholder-admin-500 focus:outline-none focus:ring-2 focus:ring-danger focus:border-transparent transition-all duration-200 font-mono"
                  placeholder="Enter admin email"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div>
                <label 
                  htmlFor="admin-password" 
                  className="block text-admin-300 text-sm font-mono font-medium mb-2"
                >
                  ACCESS CODE
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-admin-800/50 border border-admin-600 rounded-lg text-admin-100 placeholder-admin-500 focus:outline-none focus:ring-2 focus:ring-danger focus:border-transparent transition-all duration-200 pr-12 font-mono"
                    placeholder="Enter access code"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-500 hover:text-admin-300 transition-colors duration-200"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-xs text-warning">
                  <p className="font-mono font-semibold mb-1">SECURITY NOTICE</p>
                  <p>All admin sessions are logged and monitored. Unauthorized access attempts will be tracked and reported.</p>
                </div>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full bg-danger hover:bg-danger/80 disabled:bg-admin-700 disabled:cursor-not-allowed text-white font-mono font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none shadow-lg border border-danger/50"
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>AUTHENTICATING...</span>
                </div>
              ) : (
                <>
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <span>GRANT ACCESS</span>
                  </span>
                </>
              )}
            </motion.button>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-admin-700">
              <p className="text-admin-500 text-xs font-mono">
                Humanverse Surveillance System v2.1
              </p>
              <p className="text-admin-600 text-xs font-mono mt-1">
                Powered by SoulGate Technology
              </p>
            </div>
          </form>
        </div>

        {/* Background Grid */}
        <div className="fixed inset-0 -z-10 surveillance-grid opacity-5"></div>
      </motion.div>
    </div>
  );
}
