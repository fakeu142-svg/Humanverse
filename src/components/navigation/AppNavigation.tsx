'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useMaskStore } from '@/store/maskStore';

interface NavigationProps {
  className?: string;
}

export default function AppNavigation({ className = '' }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { currentMask } = useMaskStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navigationItems = [
    {
      name: 'Explore',
      path: '/explore',
      icon: '🌟',
      description: 'Discover content and connections'
    },
    {
      name: 'Truth Games',
      path: '/truth',
      icon: '🎭',
      description: 'Challenge perceptions and authenticity'
    },
    {
      name: 'Chat Rooms',
      path: '/chat',
      icon: '💬',
      description: 'Anonymous conversations'
    },
    {
      name: 'Drop Zone',
      path: '/dropzone',
      icon: '📍',
      description: 'Location-based secrets'
    },
    {
      name: 'Masks',
      path: '/mask-selection',
      icon: '🦊',
      description: 'Manage your identity'
    }
  ];

  // Show navigation for authenticated users OR for demo pages (only after mounting)
  const demoPages = ['/explore', '/truth', '/chat', '/dropzone', '/mask-selection'];
  const isDemoPage = mounted ? demoPages.some(page => pathname.startsWith(page)) : true;
  const shouldShow = mounted ? (isAuthenticated || isDemoPage) : true;

  if (!shouldShow) {
    return null;
  }

  return (
    <nav className={`bg-black/20 backdrop-blur-md border-b border-white/10 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              href="/explore" 
              className="flex items-center space-x-2 text-white hover:text-desert-300 transition-colors"
            >
              <span className="text-2xl">🎭</span>
              <span className="font-display text-xl font-bold hidden sm:block">
                Humanverse
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigationItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-desert-300 bg-desert-900/50'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </span>
                    {isActive && (
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-desert-400"
                        layoutId="activeTab"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {/* Current Mask Display */}
              {mounted && isAuthenticated && currentMask && (
                <div className="flex items-center space-x-3 mr-4 px-3 py-1 bg-white/5 rounded-lg">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{
                      backgroundColor: `${currentMask.colorScheme?.primary || '#DAA520'}20`,
                      border: `2px solid ${currentMask.colorScheme?.primary || '#DAA520'}40`
                    }}
                  >
                    🎭
                  </div>
                  <div className="text-sm">
                    <div className="text-white font-medium">{currentMask.name}</div>
                    <div className="text-gray-400 text-xs">{currentMask.type}</div>
                  </div>
                </div>
              )}

              {/* Demo Mode Display */}
              {mounted && !isAuthenticated && (
                <div className="flex items-center space-x-3 mr-4 px-3 py-1 bg-purple-600/20 rounded-lg border border-purple-600/30">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-purple-600/20">
                    🎭
                  </div>
                  <div className="text-sm">
                    <div className="text-purple-300 font-medium">Demo Mode</div>
                    <div className="text-purple-400 text-xs">Guest Access</div>
                  </div>
                </div>
              )}

              {/* Logout Button / Login Button */}
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 border border-red-600/20 hover:border-red-600/40"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 border border-blue-600/20 hover:border-blue-600/40"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              className="bg-white/10 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="md:hidden"
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-black/30 backdrop-blur-sm">
              {navigationItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? 'text-desert-300 bg-desert-900/50'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <div>{item.name}</div>
                        <div className="text-xs text-gray-400">{item.description}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
              
              {/* Mobile User Section */}
              <div className="border-t border-gray-700 pt-4 pb-3">
                {isAuthenticated && currentMask && (
                  <div className="flex items-center px-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: `${currentMask.colorScheme?.primary || '#DAA520'}20`,
                        border: `2px solid ${currentMask.colorScheme?.primary || '#DAA520'}40`
                      }}
                    >
                      🎭
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">{currentMask.name}</div>
                      <div className="text-sm font-medium text-gray-400">{currentMask.type}</div>
                    </div>
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="flex items-center px-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-600/20 border-2 border-purple-600/40">
                      🎭
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-purple-300">Demo Mode</div>
                      <div className="text-sm font-medium text-purple-400">Guest Access</div>
                    </div>
                  </div>
                )}

                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-600/10 rounded-md transition-colors"
                  >
                    Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="block w-full text-left px-3 py-2 text-base font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
