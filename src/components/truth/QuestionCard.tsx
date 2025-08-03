'use client';

import { motion } from 'framer-motion';

interface TruthQuestion {
  id: string;
  category: string;
  question: string;
  difficulty: number;
  psychTags?: string[];
  emotionalTrigger?: string;
}

interface QuestionCardProps {
  question: TruthQuestion;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const getCategoryConfig = (category: string) => {
    const configs = {
      FEAR: { 
        color: 'from-red-900 to-red-700', 
        icon: '😨', 
        textColor: 'text-red-200',
        accentColor: 'text-red-400',
        borderColor: 'border-red-800/50'
      },
      CONFESSION: { 
        color: 'from-purple-900 to-purple-700', 
        icon: '🤫', 
        textColor: 'text-purple-200',
        accentColor: 'text-purple-400',
        borderColor: 'border-purple-800/50'
      },
      DESIRE: { 
        color: 'from-pink-900 to-pink-700', 
        icon: '💕', 
        textColor: 'text-pink-200',
        accentColor: 'text-pink-400',
        borderColor: 'border-pink-800/50'
      },
      MEMORY: { 
        color: 'from-blue-900 to-blue-700', 
        icon: '🧠', 
        textColor: 'text-blue-200',
        accentColor: 'text-blue-400',
        borderColor: 'border-blue-800/50'
      },
      SHAME: { 
        color: 'from-orange-900 to-orange-700', 
        icon: '😞', 
        textColor: 'text-orange-200',
        accentColor: 'text-orange-400',
        borderColor: 'border-orange-800/50'
      },
      FUTURE: { 
        color: 'from-green-900 to-green-700', 
        icon: '🔮', 
        textColor: 'text-green-200',
        accentColor: 'text-green-400',
        borderColor: 'border-green-800/50'
      },
      REGRET: { 
        color: 'from-gray-900 to-gray-700', 
        icon: '😔', 
        textColor: 'text-gray-200',
        accentColor: 'text-gray-400',
        borderColor: 'border-gray-800/50'
      },
      TRAUMA: { 
        color: 'from-indigo-900 to-indigo-700', 
        icon: '💔', 
        textColor: 'text-indigo-200',
        accentColor: 'text-indigo-400',
        borderColor: 'border-indigo-800/50'
      },
      FANTASY: { 
        color: 'from-teal-900 to-teal-700', 
        icon: '✨', 
        textColor: 'text-teal-200',
        accentColor: 'text-teal-400',
        borderColor: 'border-teal-800/50'
      },
      AMBITION: { 
        color: 'from-yellow-900 to-yellow-700', 
        icon: '🏆', 
        textColor: 'text-yellow-200',
        accentColor: 'text-yellow-400',
        borderColor: 'border-yellow-800/50'
      }
    };
    
    return configs[category as keyof typeof configs] || configs.CONFESSION;
  };

  const config = getCategoryConfig(question.category);
  const difficultyStars = '⭐'.repeat(question.difficulty);
  
  const getPsychologicalHint = () => {
    if (question.psychTags?.includes('targeted')) {
      return "This question was specially chosen for you based on your psychological profile.";
    }
    if (question.psychTags?.includes('vulnerability')) {
      return "This question is designed to explore emotional vulnerabilities.";
    }
    if (question.emotionalTrigger) {
      return `This question targets ${question.emotionalTrigger} responses.`;
    }
    return "Answer honestly for the most authentic psychological analysis.";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="perspective-1000"
    >
      <div className={`bg-gradient-to-br ${config.color} rounded-2xl p-8 shadow-2xl ${config.borderColor} border-2 relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 text-6xl">{config.icon}</div>
          <div className="absolute bottom-4 left-4 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{config.icon}</span>
              <div>
                <h3 className={`text-lg font-bold ${config.accentColor}`}>
                  {question.category.replace('_', ' ')}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${config.textColor}`}>Difficulty:</span>
                  <span className="text-yellow-400">{difficultyStars}</span>
                </div>
              </div>
            </div>
            
            {/* Question ID indicator */}
            <div className={`px-3 py-1 rounded-full bg-black/30 ${config.textColor} text-xs font-mono`}>
              #{question.id.slice(-8)}
            </div>
          </div>

          {/* Psychological targeting indicator */}
          {question.psychTags?.includes('targeted') && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-4 px-4 py-2 bg-amber-600/20 border border-amber-500/30 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <span className="text-amber-400">🎯</span>
                <span className="text-amber-200 text-sm font-medium">
                  Psychologically Targeted Question
                </span>
              </div>
              <p className="text-amber-300 text-xs mt-1">
                This question was selected based on your psychological profile
              </p>
            </motion.div>
          )}
        </div>

        {/* Main Question */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative z-10 mb-6"
        >
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed mb-4">
              {question.question}
            </h2>
            
            {/* Question analysis indicators */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {question.psychTags?.map((tag, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded-full text-xs font-medium bg-black/20 ${config.textColor}`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Psychological Insight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative z-10"
        >
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <div className="flex items-start space-x-3">
              <span className="text-amber-400 text-lg">💡</span>
              <div>
                <h4 className="text-amber-200 font-semibold text-sm mb-1">
                  Psychological Insight
                </h4>
                <p className="text-amber-300 text-sm leading-relaxed">
                  {getPsychologicalHint()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Emotional preparation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-4 text-center"
        >
          <p className={`text-sm ${config.textColor} italic`}>
            Take a moment to center yourself before answering. 
            Your response will be analyzed for psychological patterns.
          </p>
        </motion.div>

        {/* Pulsing border effect */}
        <div className="absolute inset-0 rounded-2xl border-2 border-white/20 animate-pulse opacity-50"></div>
      </div>
    </motion.div>
  );
}
