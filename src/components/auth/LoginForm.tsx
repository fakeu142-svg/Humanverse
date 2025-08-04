'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    const success = await login(email, password);

    if (success) {
      toast.success('Welcome back to the Humanverse!');
      onSuccess?.();
    } else {
      toast.error(error || 'Login failed');
    }
  };

  const useDemoCredentials = () => {
    setEmail('demo@humanverse.com');
    setPassword('demo123');
    toast('Demo credentials loaded - click Enter the Verse', { icon: '🎭' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass-desert rounded-lg p-8 shadow-xl">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold text-desert-200 mb-2">
            Return to Your Mask
          </h2>
          <p className="text-desert-400">
            Welcome back to the Humanverse
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-danger/10 border border-danger/30 rounded-lg p-4"
            >
              <p className="text-danger text-sm text-center">{error}</p>
            </motion.div>
          )}

          <div className="space-y-4">
            <div>
              <label 
                htmlFor="email" 
                className="block text-desert-300 text-sm font-medium mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-desert-800/50 border border-desert-600 rounded-lg text-desert-100 placeholder-desert-500 focus:outline-none focus:ring-2 focus:ring-desert-400 focus:border-transparent transition-all duration-200"
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-desert-300 text-sm font-medium mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-desert-800/50 border border-desert-600 rounded-lg text-desert-100 placeholder-desert-500 focus:outline-none focus:ring-2 focus:ring-desert-400 focus:border-transparent transition-all duration-200 pr-12"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-desert-500 hover:text-desert-300 transition-colors duration-200"
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

          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full bg-desert-500 hover:bg-desert-400 disabled:bg-desert-700 disabled:cursor-not-allowed text-desert-100 font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none shadow-lg"
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-desert-100 border-t-transparent rounded-full animate-spin"></div>
                <span>Entering the Verse...</span>
              </div>
            ) : (
              'Enter the Verse'
            )}
          </motion.button>

          {/* Demo Credentials Button */}
          <button
            type="button"
            onClick={useDemoCredentials}
            className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-medium py-2 px-4 rounded-lg transition-all duration-200 border border-blue-600/30 hover:border-blue-600/50 text-sm"
          >
            🎭 Use Demo Credentials
          </button>

          <div className="text-center space-y-4">
            <div className="text-desert-400 text-sm">
              Don't have a mask yet?{' '}
              <Link 
                href="/auth/register"
                className="text-desert-300 hover:text-desert-200 font-medium underline underline-offset-2 transition-colors duration-200"
              >
                Create your identity
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-desert-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-desert-900 text-desert-500">or</span>
              </div>
            </div>

            <Link 
              href="/"
              className="inline-block text-desert-400 hover:text-desert-300 text-sm transition-colors duration-200"
            >
              ← Return to homepage
            </Link>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
