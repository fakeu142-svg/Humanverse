'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GuessGame } from './GuessGame';

interface TruthAnswer {
  id: string;
  question: {
    id: string;
    text: string;
    category: string;
    difficulty: number;
  };
  answer: string;
  maskName: string;
  maskType: string;
  emotionalIntensity: number;
  believabilityScore: number;
  score: number;
  guessCount: number;
  createdAt: string;
  metadata: {
    hasEmotionalTriggers: boolean;
    vulnerabilityLevel: number;
    textLength: number;
    timeToAnswer: number;
  };
}

interface FeedStats {
  totalGuesses: number;
  correctGuesses: number;
  accuracy: number;
  averageConfidence: number;
  categoryAccuracy: Record<string, number>;
  streak: number;
  totalScore: number;
}

export function TruthFeed() {
  const [answers, setAnswers] = useState<TruthAnswer[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedAnswer, setSelectedAnswer] = useState<TruthAnswer | null>(null);
  const [showGuessModal, setShowGuessModal] = useState(false);

  useEffect(() => {
    loadTruthFeed();
  }, [selectedCategory, selectedDifficulty]);

  const loadTruthFeed = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '20',
        excludeOwn: 'true'
      });
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      if (selectedDifficulty !== 'all') {
        params.append('difficulty', selectedDifficulty);
      }

      const response = await fetch(`/api/truth/feed?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load truth feed');
      }

      const data = await response.json();
      setAnswers(data.answers);
      setStats(data.stats);
    } catch (error) {
      console.error('Load feed error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerClick = (answer: TruthAnswer) => {
    setSelectedAnswer(answer);
    setShowGuessModal(true);
  };

  const handleGuessResult = (result: any) => {
    setShowGuessModal(false);
    setSelectedAnswer(null);
    
    // Refresh stats
    loadTruthFeed();
  };

  const getCategoryConfig = (category: string) => {
    const configs = {
      FEAR: { color: 'bg-red-600', icon: '😨' },
      CONFESSION: { color: 'bg-purple-600', icon: '🤫' },
      DESIRE: { color: 'bg-pink-600', icon: '💕' },
      MEMORY: { color: 'bg-blue-600', icon: '🧠' },
      SHAME: { color: 'bg-orange-600', icon: '😞' },
      FUTURE: { color: 'bg-green-600', icon: '🔮' },
      REGRET: { color: 'bg-gray-600', icon: '😔' },
      TRAUMA: { color: 'bg-indigo-600', icon: '💔' },
      FANTASY: { color: 'bg-teal-600', icon: '✨' },
      AMBITION: { color: 'bg-yellow-600', icon: '🏆' }
    };
    return configs[category as keyof typeof configs] || configs.CONFESSION;
  };

  const getVulnerabilityColor = (level: number) => {
    if (level >= 4) return 'text-red-400';
    if (level >= 3) return 'text-orange-400';
    if (level >= 2) return 'text-yellow-400';
    return 'text-green-400';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'FEAR', label: 'Fears' },
    { value: 'CONFESSION', label: 'Confessions' },
    { value: 'DESIRE', label: 'Desires' },
    { value: 'MEMORY', label: 'Memories' },
    { value: 'SHAME', label: 'Shame' },
    { value: 'FUTURE', label: 'Future' }
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-amber-200">Loading truth feed...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Panel */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-amber-800/50"
        >
          <h3 className="text-xl font-bold text-amber-100 mb-4">Your Guessing Statistics</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-100">{stats.totalGuesses}</div>
              <div className="text-amber-300 text-sm">Total Guesses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.accuracy}%</div>
              <div className="text-amber-300 text-sm">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.streak}</div>
              <div className="text-amber-300 text-sm">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{stats.totalScore}</div>
              <div className="text-amber-300 text-sm">Score</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 justify-center"
      >
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === category.value
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/50'
                  : 'bg-black/30 text-amber-200 hover:bg-black/50 border border-amber-800/50'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-amber-200 text-sm">Difficulty:</span>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-black/30 border border-amber-800/50 rounded-lg px-3 py-2 text-amber-200 text-sm focus:outline-none focus:border-amber-600"
          >
            <option value="all">All</option>
            <option value="1">⭐ Easy</option>
            <option value="2">⭐⭐ Medium</option>
            <option value="3">⭐⭐⭐ Hard</option>
            <option value="4">⭐⭐⭐⭐ Very Hard</option>
            <option value="5">⭐⭐⭐⭐⭐ Extreme</option>
          </select>
        </div>
      </motion.div>

      {/* Truth Feed */}
      <div className="space-y-4">
        <AnimatePresence>
          {answers.map((answer, index) => {
            const config = getCategoryConfig(answer.question.category);
            
            return (
              <motion.div
                key={answer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-amber-800/50 hover:border-amber-600/70 cursor-pointer transition-all duration-300 hover:bg-black/40"
                onClick={() => handleAnswerClick(answer)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${config.color} rounded-full flex items-center justify-center text-white text-lg`}>
                      {config.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-100">
                        {answer.question.category.replace('_', ' ')}
                      </h4>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-amber-300">{answer.maskName}</span>
                        <span className="text-amber-500">•</span>
                        <span className="text-amber-400">{formatTimeAgo(answer.createdAt)}</span>
                        <span className="text-amber-500">•</span>
                        <span className="text-yellow-400">{'⭐'.repeat(answer.question.difficulty)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-amber-300">{answer.guessCount} guesses</div>
                    <div className={`text-sm font-medium ${getVulnerabilityColor(answer.metadata.vulnerabilityLevel)}`}>
                      Vulnerability: {answer.metadata.vulnerabilityLevel}/5
                    </div>
                  </div>
                </div>

                {/* Question */}
                <div className="mb-4 p-3 bg-black/20 rounded-lg border-l-4 border-amber-600">
                  <p className="text-amber-200 text-sm font-medium mb-1">Question:</p>
                  <p className="text-amber-100">{answer.question.text}</p>
                </div>

                {/* Answer */}
                <div className="mb-4">
                  <p className="text-white leading-relaxed">
                    {answer.answer}
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex flex-wrap items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-amber-300">Emotional Intensity:</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                          <div
                            key={level}
                            className={`w-1.5 h-3 mx-px rounded-sm ${
                              level <= answer.emotionalIntensity ? 'bg-red-500' : 'bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-red-400 ml-1">{answer.emotionalIntensity}/10</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <span className="text-amber-300">Believability:</span>
                      <span className="text-blue-400">{answer.believabilityScore}/10</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {answer.metadata.hasEmotionalTriggers && (
                      <span className="px-2 py-1 bg-red-600/20 text-red-300 rounded text-xs">
                        🚨 Emotional Triggers
                      </span>
                    )}
                    <span className="text-amber-400 font-medium">
                      Click to guess: Truth or Lie?
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {answers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-amber-200 mb-4">No answers available with current filters</p>
            <button
              onClick={loadTruthFeed}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Refresh Feed
            </button>
          </div>
        )}
      </div>

      {/* Guess Modal */}
      <AnimatePresence>
        {showGuessModal && selectedAnswer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowGuessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <GuessGame
                preselectedAnswer={selectedAnswer}
                onGuessResult={handleGuessResult}
                onClose={() => setShowGuessModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
