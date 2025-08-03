'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReactionPanelProps {
  messageId: string;
  onReaction: (messageId: string, reaction: string) => void;
  onClose: () => void;
}

interface ReactionCategory {
  name: string;
  emoji: string;
  reactions: Array<{
    emoji: string;
    name: string;
    description: string;
  }>;
}

const REACTION_CATEGORIES: ReactionCategory[] = [
  {
    name: 'Emotions',
    emoji: '😊',
    reactions: [
      { emoji: '😊', name: 'Happy', description: 'This made me smile' },
      { emoji: '😢', name: 'Sad', description: 'This is heartbreaking' },
      { emoji: '😡', name: 'Angry', description: 'This makes me mad' },
      { emoji: '😱', name: 'Shocked', description: 'I can\'t believe this' },
      { emoji: '🤔', name: 'Thinking', description: 'This is thought-provoking' },
      { emoji: '😍', name: 'Love', description: 'I love this' },
      { emoji: '🤯', name: 'Mind Blown', description: 'This blew my mind' },
      { emoji: '😴', name: 'Boring', description: 'This is boring' }
    ]
  },
  {
    name: 'Support',
    emoji: '🤗',
    reactions: [
      { emoji: '🤗', name: 'Hug', description: 'Sending virtual hugs' },
      { emoji: '💪', name: 'Strength', description: 'You\'re so strong' },
      { emoji: '🙏', name: 'Pray', description: 'Prayers for you' },
      { emoji: '❤️', name: 'Heart', description: 'Sending love' },
      { emoji: '🌟', name: 'Star', description: 'You\'re amazing' },
      { emoji: '👏', name: 'Clap', description: 'Well done!' },
      { emoji: '🎉', name: 'Celebrate', description: 'Celebrating with you' },
      { emoji: '🔥', name: 'Fire', description: 'This is fire!' }
    ]
  },
  {
    name: 'Truth Game',
    emoji: '🎭',
    reactions: [
      { emoji: '✅', name: 'Truth', description: 'I believe this is true' },
      { emoji: '❌', name: 'Lie', description: 'I think this is a lie' },
      { emoji: '🤥', name: 'Suspicious', description: 'Something seems off' },
      { emoji: '😇', name: 'Innocent', description: 'This seems genuine' },
      { emoji: '🕵️', name: 'Detective', description: 'Need more evidence' },
      { emoji: '💯', name: 'Authentic', description: '100% believable' },
      { emoji: '🎭', name: 'Drama', description: 'This is dramatic' },
      { emoji: '🔍', name: 'Investigate', description: 'Let me investigate' }
    ]
  },
  {
    name: 'Anonymous',
    emoji: '👻',
    reactions: [
      { emoji: '👻', name: 'Ghost', description: 'Mysterious' },
      { emoji: '🕶️', name: 'Incognito', description: 'Staying hidden' },
      { emoji: '🎪', name: 'Circus', description: 'What a show!' },
      { emoji: '🌙', name: 'Night', description: 'Dark secrets' },
      { emoji: '🗝️', name: 'Key', description: 'You hold the key' },
      { emoji: '🪞', name: 'Mirror', description: 'Reflecting on this' },
      { emoji: '🌪️', name: 'Chaos', description: 'This is chaotic' },
      { emoji: '🔮', name: 'Crystal Ball', description: 'Mystical vibes' }
    ]
  }
];

export function ReactionPanel({ messageId, onReaction, onClose }: ReactionPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  const handleReactionClick = (reaction: string) => {
    onReaction(messageId, reaction);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/20 p-6 max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Add Reaction</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-1 mb-6 bg-black/20 rounded-lg p-1">
          {REACTION_CATEGORIES.map((category, index) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(index)}
              className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedCategory === index
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{category.emoji}</span>
              <span className="hidden sm:inline">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Reactions Grid */}
        <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto">
          <AnimatePresence mode="wait">
            {REACTION_CATEGORIES[selectedCategory].reactions.map((reaction, index) => (
              <motion.button
                key={reaction.emoji}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                onClick={() => handleReactionClick(reaction.emoji)}
                onMouseEnter={() => setHoveredReaction(reaction.name)}
                onMouseLeave={() => setHoveredReaction(null)}
                className="relative group bg-white/10 hover:bg-white/20 rounded-xl p-4 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <div className="text-3xl mb-1">{reaction.emoji}</div>
                <div className="text-xs text-gray-300 font-medium truncate">
                  {reaction.name}
                </div>
                
                {/* Hover Tooltip */}
                <AnimatePresence>
                  {hoveredReaction === reaction.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black/90 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap z-10"
                    >
                      {reaction.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black/90"></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Quick Reactions */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Quick Reactions</h4>
          <div className="flex space-x-2">
            {['👍', '👎', '❤️', '😂', '😢', '😱'].map((emoji) => (
              <motion.button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="text-2xl p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          Choose a reaction to express how this message makes you feel
        </div>
      </motion.div>
    </motion.div>
  );
}
