'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMaskTimer } from '@/store/maskStore';

interface MaskTimerProps {
  onExpiry?: () => void;
  onRenewClick?: () => void;
  showRenewButton?: boolean;
  compact?: boolean;
}

export default function MaskTimer({ 
  onExpiry, 
  onRenewClick, 
  showRenewButton = true,
  compact = false 
}: MaskTimerProps) {
  const { currentMask, timeRemaining, formattedTime, expiryStatus, updateTimeRemaining } = useMaskTimer();
  const [lastStatus, setLastStatus] = useState(expiryStatus);

  useEffect(() => {
    const interval = setInterval(() => {
      updateTimeRemaining();
    }, 1000); // Update every second for timer

    return () => clearInterval(interval);
  }, [updateTimeRemaining]);

  useEffect(() => {
    if (expiryStatus === 'expired' && lastStatus !== 'expired') {
      onExpiry?.();
    }
    setLastStatus(expiryStatus);
  }, [expiryStatus, lastStatus, onExpiry]);

  if (!currentMask) {
    return null;
  }

  const getStatusColor = () => {
    switch (expiryStatus) {
      case 'active': return 'text-success';
      case 'expiring': return 'text-warning';
      case 'expired': return 'text-danger';
      default: return 'text-desert-400';
    }
  };

  const getStatusIcon = () => {
    switch (expiryStatus) {
      case 'active':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'expiring':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'expired':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getProgressPercentage = () => {
    if (!currentMask.expiresAt || expiryStatus === 'expired') return 0;
    
    const totalDuration = 48 * 60 * 60 * 1000; // 48 hours in ms
    const elapsed = totalDuration - timeRemaining;
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        <span className={`text-sm font-mono ${getStatusColor()}`}>
          {formattedTime}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      className="bg-desert-800/30 rounded-lg p-4 border border-desert-600/30"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`${getStatusColor()}`}>
            {getStatusIcon()}
          </div>
          <h3 className="font-display font-semibold text-desert-200">
            Mask Timer
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-desert-400 text-sm">
            Streak: {currentMask.streakCount}
          </span>
        </div>
      </div>

      {/* Time Display */}
      <div className="text-center mb-4">
        <motion.div
          className={`text-3xl font-mono font-bold ${getStatusColor()}`}
          key={formattedTime}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {formattedTime}
        </motion.div>
        <p className="text-desert-400 text-sm mt-1">
          {expiryStatus === 'expired' 
            ? 'Your mask has expired' 
            : expiryStatus === 'expiring'
            ? 'Your mask is expiring soon!'
            : 'Time remaining'
          }
        </p>
      </div>

      {/* Progress Bar */}
      {expiryStatus !== 'expired' && (
        <div className="mb-4">
          <div className="bg-desert-700 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                expiryStatus === 'expiring' 
                  ? 'bg-gradient-to-r from-warning to-danger' 
                  : 'bg-gradient-to-r from-success to-success'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercentage()}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-xs text-desert-500 mt-1">
            <span>Created</span>
            <span>48h Expiry</span>
          </div>
        </div>
      )}

      {/* Status Messages */}
      <AnimatePresence mode="wait">
        {expiryStatus === 'expiring' && (
          <motion.div
            key="expiring"
            className="bg-warning/10 border border-warning/30 rounded p-3 mb-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-warning text-sm">
              ⚠️ Your mask will expire soon! Renew it to keep your streak and identity.
            </p>
          </motion.div>
        )}

        {expiryStatus === 'expired' && (
          <motion.div
            key="expired"
            className="bg-danger/10 border border-danger/30 rounded p-3 mb-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-danger text-sm">
              💀 Your mask has expired. Create a new mask to continue using Humanverse.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Renew Button */}
      {showRenewButton && expiryStatus !== 'expired' && (
        <motion.button
          onClick={onRenewClick}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200
            ${expiryStatus === 'expiring'
              ? 'bg-warning hover:bg-warning/80 text-black'
              : 'bg-desert-600 hover:bg-desert-500 text-desert-100'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {expiryStatus === 'expiring' ? '🔥 Renew Now!' : '⏱️ Extend Mask'}
        </motion.button>
      )}

      {/* Streak Info */}
      {currentMask.streakCount > 0 && (
        <div className="mt-3 text-center">
          <p className="text-desert-400 text-xs">
            🔥 {currentMask.streakCount} day streak! Keep renewing to maintain your record.
          </p>
        </div>
      )}
    </motion.div>
  );
}

// Floating timer for persistent display
export function FloatingMaskTimer({ position = 'bottom-right' }: { position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' }) {
  const { currentMask, formattedTime, expiryStatus } = useMaskTimer();
  const [isVisible, setIsVisible] = useState(true);

  if (!currentMask || !isVisible) {
    return null;
  }

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <motion.div
      className={`
        fixed ${positionClasses[position]} z-50
        bg-desert-800/90 backdrop-blur-sm rounded-lg p-3 border border-desert-600/30
        shadow-lg min-w-[120px]
      `}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <button
        onClick={() => setIsVisible(false)}
        className="absolute -top-2 -right-2 w-6 h-6 bg-desert-700 hover:bg-desert-600 rounded-full flex items-center justify-center text-desert-300 text-xs transition-colors duration-200"
      >
        ×
      </button>
      
      <div className="text-center">
        <div className={`text-lg font-mono font-bold ${
          expiryStatus === 'active' ? 'text-success' : 
          expiryStatus === 'expiring' ? 'text-warning' : 'text-danger'
        }`}>
          {formattedTime}
        </div>
        <div className="text-desert-400 text-xs">
          {currentMask.name}
        </div>
      </div>
    </motion.div>
  );
}
