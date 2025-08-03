'use client';

import { motion } from 'framer-motion';
import { MaskType } from '@prisma/client';
import { MaskTypeInfo } from '@/store/maskStore';

interface MaskCardProps {
  maskType: MaskTypeInfo;
  isSelected?: boolean;
  isDisabled?: boolean;
  onSelect?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

const rarityColors = {
  common: 'from-gray-600 to-gray-800',
  uncommon: 'from-green-600 to-green-800',
  rare: 'from-blue-600 to-blue-800',
  epic: 'from-purple-600 to-purple-800',
  legendary: 'from-yellow-500 to-orange-600',
};

const rarityGlow = {
  common: 'shadow-gray-500/20',
  uncommon: 'shadow-green-500/30',
  rare: 'shadow-blue-500/30',
  epic: 'shadow-purple-500/40',
  legendary: 'shadow-yellow-500/50',
};

export default function MaskCard({ 
  maskType, 
  isSelected = false, 
  isDisabled = false,
  onSelect,
  showDetails = true,
  compact = false
}: MaskCardProps) {
  const handleClick = () => {
    if (!isDisabled && onSelect) {
      onSelect();
    }
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300
        ${compact ? 'p-4' : 'p-6'}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isSelected 
          ? 'ring-2 ring-desert-400 bg-gradient-to-br from-desert-700/50 to-desert-800/50' 
          : 'hover:bg-desert-800/30'
        }
        glass-desert border border-desert-600/30
        ${rarityGlow[maskType.rarity]}
      `}
      onClick={handleClick}
      whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Rarity Indicator */}
      <div className={`
        absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-xs font-semibold
        bg-gradient-to-r ${rarityColors[maskType.rarity]} text-white
      `}>
        {maskType.rarity.toUpperCase()}
      </div>

      {/* Mask Icon and Name */}
      <div className="flex items-center space-x-4 mb-4">
        <div 
          className={`
            w-16 h-16 rounded-full flex items-center justify-center text-3xl
            ${compact ? 'w-12 h-12 text-2xl' : ''}
          `}
          style={{ backgroundColor: `${maskType.baseColor}20`, border: `2px solid ${maskType.baseColor}40` }}
        >
          {maskType.icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-display font-bold text-desert-200 ${compact ? 'text-lg' : 'text-xl'}`}>
            {maskType.name}
          </h3>
          <p className="text-desert-400 text-sm font-mono">
            {maskType.type}
          </p>
        </div>
      </div>

      {/* Description */}
      {showDetails && (
        <p className={`text-desert-300 leading-relaxed mb-4 ${compact ? 'text-sm' : ''}`}>
          {maskType.description}
        </p>
      )}

      {/* Personality Traits */}
      {showDetails && (
        <div className="flex flex-wrap gap-2 mb-4">
          {maskType.personality.map((trait, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-desert-700/50 text-desert-300 rounded-full text-xs font-medium border border-desert-600/30"
            >
              {trait}
            </span>
          ))}
        </div>
      )}

      {/* Color Scheme Preview */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <div 
            className="w-6 h-6 rounded-full border-2 border-desert-600"
            style={{ backgroundColor: maskType.baseColor }}
            title={`Primary: ${maskType.baseColor}`}
          />
          <div 
            className="w-6 h-6 rounded-full border-2 border-desert-600"
            style={{ backgroundColor: `${maskType.baseColor}80` }}
            title="Secondary variant"
          />
          <div 
            className="w-6 h-6 rounded-full border-2 border-desert-600"
            style={{ backgroundColor: `${maskType.baseColor}40` }}
            title="Accent variant"
          />
        </div>

        {isSelected && (
          <div className="flex items-center space-x-2 text-desert-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Selected</span>
          </div>
        )}
      </div>

      {/* Hover Effect */}
      {!isDisabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-desert-500/5 opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Selection Ring Animation */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 border-2 border-desert-400 rounded-lg"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
        />
      )}
    </motion.div>
  );
}

// Compact version for lists
export function MaskCardCompact({ maskType, onSelect, isSelected }: Pick<MaskCardProps, 'maskType' | 'onSelect' | 'isSelected'>) {
  return (
    <MaskCard
      maskType={maskType}
      onSelect={onSelect}
      isSelected={isSelected}
      showDetails={false}
      compact={true}
    />
  );
}

// Preview version for current mask display
export function MaskCardPreview({ maskType }: { maskType: MaskTypeInfo }) {
  return (
    <div className="flex items-center space-x-3 p-3 glass-desert rounded-lg border border-desert-600/30">
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
        style={{ backgroundColor: `${maskType.baseColor}20`, border: `2px solid ${maskType.baseColor}40` }}
      >
        {maskType.icon}
      </div>
      <div className="flex-1">
        <h4 className="font-display font-semibold text-desert-200">
          {maskType.name}
        </h4>
        <p className="text-desert-400 text-xs font-mono">
          {maskType.type}
        </p>
      </div>
      <div className={`
        px-2 py-1 rounded text-xs font-semibold
        bg-gradient-to-r ${rarityColors[maskType.rarity]} text-white
      `}>
        {maskType.rarity}
      </div>
    </div>
  );
}
