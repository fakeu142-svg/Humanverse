'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { QuestionCard } from './QuestionCard';
import { AnswerForm } from './AnswerForm';
import { TruthFeed } from './TruthFeed';
import { GuessGame } from './GuessGame';

interface TruthQuestion {
  id: string;
  category: string;
  question: string;
  difficulty: number;
  psychTags: string[];
  emotionalTrigger?: string;
}

interface GameSession {
  questionsAnswered: number;
  totalScore: number;
  vulnerabilityLevel: number;
  currentStreak: number;
}

type GameMode = 'answer' | 'guess' | 'feed' | 'stats';

export function TruthGame() {
  const { user } = useAuth();
  const [gameMode, setGameMode] = useState<GameMode>('answer');
  const [currentQuestion, setCurrentQuestion] = useState<TruthQuestion | null>(null);
  const [gameSession, setGameSession] = useState<GameSession>({
    questionsAnswered: 0,
    totalScore: 0,
    vulnerabilityLevel: 1,
    currentStreak: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<number>(3);

  useEffect(() => {
    if (user) {
      loadCurrentQuestion();
    }
  }, [user, selectedCategory, difficulty]);

  const loadCurrentQuestion = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        count: '1',
        difficulty: difficulty.toString(),
        targeted: 'true' // Enable psychological targeting
      });
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/truth/questions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load question');
      }

      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        setCurrentQuestion(data.questions[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmitted = async (result: any) => {
    setGameSession(prev => ({
      questionsAnswered: prev.questionsAnswered + 1,
      totalScore: result.session.totalScore,
      vulnerabilityLevel: result.session.vulnerabilityLevel,
      currentStreak: prev.currentStreak + 1
    }));

    // Load next question after a brief delay
    setTimeout(() => {
      loadCurrentQuestion();
    }, 2000);
  };

  const handleGuessResult = (result: any) => {
    if (result.guess.isCorrect) {
      setGameSession(prev => ({
        ...prev,
        totalScore: prev.totalScore + result.guess.score,
        currentStreak: prev.currentStreak + 1
      }));
    } else {
      setGameSession(prev => ({
        ...prev,
        currentStreak: 0
      }));
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories', color: 'bg-gray-600' },
    { value: 'FEAR', label: 'Fears', color: 'bg-red-600' },
    { value: 'CONFESSION', label: 'Confessions', color: 'bg-purple-600' },
    { value: 'DESIRE', label: 'Desires', color: 'bg-pink-600' },
    { value: 'MEMORY', label: 'Memories', color: 'bg-blue-600' },
    { value: 'SHAME', label: 'Shame', color: 'bg-orange-600' },
    { value: 'FUTURE', label: 'Future', color: 'bg-green-600' }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 flex items-center justify-center">
        <div className="text-center text-amber-100">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p>Please log in to play TruthVerse</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900">
      {/* Desert Night Background Effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-600 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-orange-500 rounded-full blur-2xl"></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-red-600 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-bold text-amber-100 mb-4 tracking-wide">
            Truth<span className="text-orange-400">Verse</span>
          </h1>
          <p className="text-amber-200 text-xl max-w-2xl mx-auto">
            Reveal your deepest truths or craft your most convincing lies. 
            Others will judge what's real in this desert of secrets.
          </p>
        </motion.div>

        {/* Game Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-4 text-center border border-amber-800/50">
            <div className="text-2xl font-bold text-amber-100">{gameSession.questionsAnswered}</div>
            <div className="text-amber-300 text-sm">Questions</div>
          </div>
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-4 text-center border border-amber-800/50">
            <div className="text-2xl font-bold text-orange-400">{gameSession.totalScore}</div>
            <div className="text-amber-300 text-sm">Score</div>
          </div>
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-4 text-center border border-amber-800/50">
            <div className="text-2xl font-bold text-red-400">{gameSession.vulnerabilityLevel}</div>
            <div className="text-amber-300 text-sm">Vulnerability</div>
          </div>
          <div className="bg-black/30 backdrop-blur-md rounded-lg p-4 text-center border border-amber-800/50">
            <div className="text-2xl font-bold text-yellow-400">{gameSession.currentStreak}</div>
            <div className="text-amber-300 text-sm">Streak</div>
          </div>
        </motion.div>

        {/* Game Mode Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-center space-x-2 mb-6">
            {[
              { mode: 'answer' as GameMode, label: 'Answer', icon: '💭' },
              { mode: 'guess' as GameMode, label: 'Guess', icon: '🤔' },
              { mode: 'feed' as GameMode, label: 'Feed', icon: '📡' },
              { mode: 'stats' as GameMode, label: 'Stats', icon: '📊' }
            ].map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => setGameMode(mode)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  gameMode === mode
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/50'
                    : 'bg-black/30 text-amber-200 hover:bg-black/50 border border-amber-800/50'
                }`}
              >
                <span className="mr-2">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Category and Difficulty Controls */}
          {gameMode === 'answer' && (
            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedCategory === category.value
                        ? `${category.color} text-white shadow-lg`
                        : 'bg-black/30 text-amber-200 hover:bg-black/50 border border-amber-800/50'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="text-amber-200 text-sm">Difficulty:</span>
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${
                      difficulty >= level
                        ? 'bg-orange-500 text-white'
                        : 'bg-black/30 text-amber-400 border border-amber-800/50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Game Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={gameMode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto"
          >
            {gameMode === 'answer' && (
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-amber-200">Loading your personalized question...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                      onClick={loadCurrentQuestion}
                      className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : currentQuestion ? (
                  <>
                    <QuestionCard question={currentQuestion} />
                    <AnswerForm 
                      question={currentQuestion} 
                      onAnswerSubmitted={handleAnswerSubmitted}
                    />
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-amber-200 mb-4">No questions available</p>
                    <button
                      onClick={loadCurrentQuestion}
                      className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            )}

            {gameMode === 'guess' && (
              <GuessGame onGuessResult={handleGuessResult} />
            )}

            {gameMode === 'feed' && (
              <TruthFeed />
            )}

            {gameMode === 'stats' && (
              <div className="bg-black/30 backdrop-blur-md rounded-xl p-8 border border-amber-800/50">
                <h3 className="text-2xl font-bold text-amber-100 mb-6">Your TruthVerse Statistics</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-amber-200">Game Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-amber-300">Questions Answered:</span>
                        <span className="text-white font-medium">{gameSession.questionsAnswered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-300">Total Score:</span>
                        <span className="text-orange-400 font-medium">{gameSession.totalScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-300">Current Streak:</span>
                        <span className="text-yellow-400 font-medium">{gameSession.currentStreak}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-300">Vulnerability Level:</span>
                        <span className="text-red-400 font-medium">{gameSession.vulnerabilityLevel}/5</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-amber-200">Psychological Profile</h4>
                    <div className="text-amber-300 text-sm">
                      <p>Your responses are being analyzed to create a comprehensive psychological profile.</p>
                      <p className="mt-2 text-amber-400">Complete more questions to unlock deeper insights.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Atmospheric Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
