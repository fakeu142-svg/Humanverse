'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useMaskStore } from '@/store/maskStore';
import MaskSelector from '@/components/masks/MaskSelector';
import MaskTimer from '@/components/masks/MaskTimer';
import { toast } from 'react-hot-toast';

// Animated particles for desert atmosphere
function DesertParticles() {
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-desert-400 rounded-full opacity-30"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Floating mask symbols
function FloatingMaskSymbols() {
  const symbols = ['🦊', '🐦‍⬛', '💫', '⚔️', '🌪️'];
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {symbols.map((symbol, index) => (
        <motion.div
          key={index}
          className="absolute text-4xl opacity-10"
          style={{
            left: `${20 + index * 20}%`,
            top: `${30 + (index % 2) * 40}%`,
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [0, 10, -10, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 8 + index * 2,
            delay: index * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {symbol}
        </motion.div>
      ))}
    </div>
  );
}

export default function MaskSelectionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentMask, loadAvailableMasks, renewMask, isLoading: maskLoading } = useMaskStore();
  const [pageState, setPageState] = useState<'loading' | 'select' | 'current' | 'renew'>('loading');

  useEffect(() => {
    // Check authentication and load masks
    const initialize = async () => {
      if (authLoading) return;
      
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      await loadAvailableMasks();
      
      // Determine page state based on current mask
      if (currentMask) {
        const timeRemaining = currentMask.timeRemaining || 0;
        if (timeRemaining <= 0) {
          setPageState('select'); // Mask expired, need new one
        } else if (timeRemaining <= 2 * 60 * 60 * 1000) { // Less than 2 hours
          setPageState('renew'); // Show renewal option
        } else {
          setPageState('current'); // Show current mask
        }
      } else {
        setPageState('select'); // No mask, need to select
      }
    };

    initialize();
  }, [isAuthenticated, authLoading, loadAvailableMasks, currentMask, router]);

  const handleMaskCreated = () => {
    toast.success('🎭 Your new identity awaits! Welcome to the Humanverse.');
    router.push('/explore');
  };

  const handleRenewMask = async () => {
    const success = await renewMask();
    if (success) {
      toast.success(`🔥 Mask renewed! Streak: ${currentMask?.streakCount || 0}`);
      setPageState('current');
    }
  };

  const handleCreateNewMask = () => {
    setPageState('select');
  };

  const handleReturnToApp = () => {
    router.push('/explore');
  };

  if (authLoading || pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-desert-900 via-desert-800 to-desert-950 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-20 h-20 border-4 border-desert-600 border-t-desert-400 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="font-display text-2xl font-semibold text-desert-200 mb-2">
            Preparing the Mask Chamber
          </h2>
          <p className="text-desert-400">
            Loading your anonymous identities...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-desert-900 via-desert-800 to-desert-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <DesertParticles />
      <FloatingMaskSymbols />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyBmaWxsPSIjREFBNTIwIiBmaWxsLW9wYWNpdHk9IjAuMSI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <button
                onClick={handleReturnToApp}
                className="flex items-center space-x-2 text-desert-300 hover:text-desert-200 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Return to Humanverse</span>
              </button>
            </motion.div>
            
            <motion.div
              className="font-display text-2xl font-bold text-desert-300"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Mask Chamber
            </motion.div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-6xl">
            <AnimatePresence mode="wait">
              {pageState === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <MaskSelector
                    onMaskCreated={handleMaskCreated}
                    title="Choose Your Anonymous Identity"
                    subtitle="Your mask is your gateway to the Humanverse. Choose wisely, as it will represent you for 48 hours."
                  />
                </motion.div>
              )}

              {pageState === 'current' && currentMask && (
                <motion.div
                  key="current"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="max-w-2xl mx-auto">
                    <h2 className="font-display text-4xl font-bold text-desert-200 mb-4">
                      Your Current Mask
                    </h2>
                    <p className="text-desert-400 text-lg mb-8">
                      You are currently embodying <strong className="text-desert-300">{currentMask.name}</strong>
                    </p>

                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                      {/* Mask Info */}
                      <div className="glass-desert rounded-lg p-6">
                        <div className="flex items-center justify-center mb-4">
                          <div 
                            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                            style={{ 
                              backgroundColor: `${currentMask.colorScheme.primary}20`, 
                              border: `3px solid ${currentMask.colorScheme.primary}40` 
                            }}
                          >
                            {/* Icon would be determined by mask type */}
                            🎭
                          </div>
                        </div>
                        <h3 className="font-display text-2xl font-semibold text-desert-200 mb-2">
                          {currentMask.name}
                        </h3>
                        <p className="text-desert-400 text-sm font-mono mb-4">
                          {currentMask.type}
                        </p>
                        <div className="flex justify-center space-x-2">
                          {currentMask.colorScheme.variants?.slice(0, 5).map((color, index) => (
                            <div
                              key={index}
                              className="w-6 h-6 rounded-full border-2 border-desert-600"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Timer */}
                      <MaskTimer 
                        onRenewClick={handleRenewMask}
                        onExpiry={() => setPageState('select')}
                      />
                    </div>

                    <div className="flex space-x-4 justify-center">
                      <button
                        onClick={handleReturnToApp}
                        className="py-3 px-8 bg-desert-500 hover:bg-desert-400 text-desert-100 rounded-lg font-semibold transition-all duration-200"
                      >
                        Continue to Humanverse
                      </button>
                      <button
                        onClick={handleCreateNewMask}
                        className="py-3 px-8 border border-desert-600 text-desert-300 hover:bg-desert-800/50 rounded-lg font-semibold transition-all duration-200"
                      >
                        Change Mask
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {pageState === 'renew' && currentMask && (
                <motion.div
                  key="renew"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="max-w-2xl mx-auto">
                    <div className="mb-8">
                      <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h2 className="font-display text-4xl font-bold text-desert-200 mb-4">
                        Your Mask is Expiring Soon
                      </h2>
                      <p className="text-desert-400 text-lg">
                        <strong className="text-warning">{currentMask.name}</strong> will expire soon. 
                        Renew it to keep your streak and continue your journey.
                      </p>
                    </div>

                    <MaskTimer 
                      onRenewClick={handleRenewMask}
                      onExpiry={() => setPageState('select')}
                    />

                    <div className="flex space-x-4 justify-center mt-8">
                      <motion.button
                        onClick={handleRenewMask}
                        disabled={maskLoading}
                        className="py-3 px-8 bg-warning hover:bg-warning/80 disabled:bg-warning/50 text-black font-semibold rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {maskLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            <span>Renewing...</span>
                          </div>
                        ) : (
                          '🔥 Renew Mask'
                        )}
                      </motion.button>
                      <button
                        onClick={handleCreateNewMask}
                        className="py-3 px-8 border border-desert-600 text-desert-300 hover:bg-desert-800/50 rounded-lg font-semibold transition-all duration-200"
                      >
                        Choose New Mask
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6">
          <div className="text-center text-desert-500 text-sm">
            <p>
              🎭 In the Humanverse, you are not your name, but your essence
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
