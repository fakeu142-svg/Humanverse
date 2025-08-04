'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const { register, isLoading, error, clearError } = useAuthStore();

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    return requirements;
  };

  const passwordRequirements = validatePassword(password);
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the terms of service');
      return;
    }

    const success = await register(email, password);
    
    if (success) {
      toast.success('Welcome to the Humanverse! Your mask awaits...');
      onSuccess?.();
    } else {
      toast.error(error || 'Registration failed');
    }
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
            Create Your Mask
          </h2>
          <p className="text-desert-400">
            Join the anonymous collective
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
                  placeholder="Create a strong password"
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

              {/* Password Requirements */}
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 space-y-2"
                >
                  <p className="text-desert-400 text-xs font-medium">Password Requirements:</p>
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    {Object.entries({
                      'At least 8 characters': passwordRequirements.length,
                      'One uppercase letter': passwordRequirements.uppercase,
                      'One lowercase letter': passwordRequirements.lowercase,
                      'One number': passwordRequirements.number,
                      'One special character': passwordRequirements.special,
                    }).map(([requirement, met]) => (
                      <div
                        key={requirement}
                        className={`flex items-center space-x-2 ${
                          met ? 'text-success' : 'text-desert-500'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          met ? 'bg-success' : 'bg-desert-600'
                        }`} />
                        <span>{requirement}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-desert-300 text-sm font-medium mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-desert-800/50 border border-desert-600 rounded-lg text-desert-100 placeholder-desert-500 focus:outline-none focus:ring-2 focus:ring-desert-400 focus:border-transparent transition-all duration-200"
                placeholder="Confirm your password"
                required
                disabled={isLoading}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-2 text-danger text-xs">Passwords do not match</p>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 text-desert-500 bg-desert-800 border-desert-600 rounded focus:ring-desert-400 focus:ring-2"
                disabled={isLoading}
              />
            </div>
            <label htmlFor="terms" className="text-desert-400 text-sm">
              I agree to the{' '}
              <Link href="/terms" className="text-desert-300 hover:text-desert-200 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-desert-300 hover:text-desert-200 underline">
                Privacy Policy
              </Link>
              . I understand that all activities may be monitored for security purposes.
            </label>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || !isPasswordValid || password !== confirmPassword || !agreedToTerms}
            className="w-full bg-desert-500 hover:bg-desert-400 disabled:bg-desert-700 disabled:cursor-not-allowed text-desert-100 font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none shadow-lg"
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-desert-100 border-t-transparent rounded-full animate-spin"></div>
                <span>Creating your mask...</span>
              </div>
            ) : (
              'Create Your Identity'
            )}
          </motion.button>

          <div className="text-center space-y-4">
            <div className="text-desert-400 text-sm">
              Already have a mask?{' '}
              <Link
                href="/login"
                className="text-desert-300 hover:text-desert-200 font-medium underline underline-offset-2 transition-colors duration-200"
              >
                Return to your identity
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
