'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMaskSelection, useMaskStore } from '@/store/maskStore';
import MaskCard from './MaskCard';
import { toast } from 'react-hot-toast';
import { MaskType } from '@prisma/client';

interface MaskSelectorProps {
  onMaskCreated?: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  title?: string;
  subtitle?: string;
}

export default function MaskSelector({ 
  onMaskCreated, 
  onCancel,
  showCancelButton = false,
  title = "Choose Your Mask",
  subtitle = "Select an anonymous identity to explore the Humanverse"
}: MaskSelectorProps) {
  const {
    selectedMaskType,
    availableMaskTypes,
    selectMaskType,
    confirmSelection,
    getMaskTypeInfo,
    loadAvailableMasks,
    isLoading,
    error,
    clearError,
  } = useMaskSelection();

  const [step, setStep] = useState<'selection' | 'confirmation'>('selection');

  useEffect(() => {
    // Load available masks when component mounts
    loadAvailableMasks();
  }, [loadAvailableMasks]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleMaskSelect = (maskType: MaskType) => {
    selectMaskType(maskType);
    setStep('confirmation');
  };

  const handleConfirm = async () => {
    const success = await confirmSelection();
    if (success) {
      toast.success('Your mask has been created!');
      onMaskCreated?.();
    }
  };

  const handleBack = () => {
    setStep('selection');
    selectMaskType(null);
  };

  const selectedMaskInfo = selectedMaskType ? getMaskTypeInfo(selectedMaskType) : null;

  if (availableMaskTypes.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-desert-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-desert-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="font-display text-xl font-semibold text-desert-200 mb-2">
          No Masks Available
        </h3>
        <p className="text-desert-400">
          Unable to load available masks. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.h2
          className="font-display text-4xl font-bold text-desert-200 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {title}
        </motion.h2>
        <motion.p
          className="text-desert-400 text-lg max-w-2xl mx-auto"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {subtitle}
        </motion.p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-desert-600 border-t-desert-400 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-desert-400">Loading available masks...</p>
              </div>
            )}

            {/* Mask Selection Grid */}
            {!isLoading && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {availableMaskTypes.map((maskType, index) => (
                  <motion.div
                    key={maskType.type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <MaskCard
                      maskType={maskType}
                      onSelect={() => handleMaskSelect(maskType.type)}
                      isSelected={selectedMaskType === maskType.type}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Cancel Button */}
            {showCancelButton && (
              <div className="text-center">
                <button
                  onClick={onCancel}
                  className="text-desert-400 hover:text-desert-300 transition-colors duration-200"
                >
                  Cancel and return
                </button>
              </div>
            )}
          </motion.div>
        )}

        {step === 'confirmation' && selectedMaskInfo && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            {/* Selected Mask Preview */}
            <div className="text-center mb-8">
              <h3 className="font-display text-2xl font-semibold text-desert-200 mb-4">
                Confirm Your Choice
              </h3>
              <p className="text-desert-400 mb-6">
                You're about to become <strong className="text-desert-300">{selectedMaskInfo.name}</strong>
              </p>
              
              <div className="max-w-md mx-auto">
                <MaskCard
                  maskType={selectedMaskInfo}
                  isSelected={true}
                  showDetails={true}
                />
              </div>
            </div>

            {/* Mask Details */}
            <div className="glass-desert rounded-lg p-6 mb-8">
              <h4 className="font-display text-lg font-semibold text-desert-200 mb-4">
                What to expect:
              </h4>
              <ul className="space-y-3 text-desert-300">
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-success mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Your mask will last for <strong>48 hours</strong></span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-success mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>You can <strong>renew</strong> before expiry to build streaks</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-success mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Your identity remains <strong>completely anonymous</strong></span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-desert-400">One mask at a time - choose wisely</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleBack}
                className="flex-1 py-3 px-6 border border-desert-600 text-desert-300 hover:bg-desert-800/50 rounded-lg font-semibold transition-all duration-200"
                disabled={isLoading}
              >
                ← Choose Different Mask
              </button>
              <motion.button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 py-3 px-6 bg-desert-500 hover:bg-desert-400 disabled:bg-desert-700 disabled:cursor-not-allowed text-desert-100 rounded-lg font-semibold transition-all duration-200"
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-desert-100 border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Mask...</span>
                  </div>
                ) : (
                  'Create My Mask'
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
