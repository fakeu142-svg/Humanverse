'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface GuessResult {
  guess: {
    id: string;
    isCorrect: boolean;
    score: number;
    confidence: number;
  };
  result?: {
    actualAnswer: 'truth' | 'lie';
    yourGuess: 'truth' | 'lie';
    correctGuess: boolean;
  };
  communityStats: {
    totalGuesses: number;
    truthPercentage: number;
    liePercentage: number;
    accuracyPercentage: number;
    averageConfidence: number;
  };
  message: string;
}

interface GuessGameProps {
  preselectedAnswer?: TruthAnswer;
  onGuessResult: (result: GuessResult) => void;
  onClose?: () => void;
}

export function GuessGame({ preselectedAnswer, onGuessResult, onClose }: GuessGameProps) {
  const [currentAnswer, setCurrentAnswer] = useState<TruthAnswer | null>(preselectedAnswer || null);
  const [loading, setLoading] = useState(!preselectedAnswer);
  const [guess, setGuess] = useState<'truth' | 'lie' | null>(null);
  const [confidence, setConfidence] = useState(5);
  const [reasoning, setReasoning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!preselectedAnswer) {
      loadRandomAnswer();
    }
  }, [preselectedAnswer]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const loadRandomAnswer = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/truth/feed?limit=1', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load answer');
      }

      const data = await response.json();
      if (data.answers && data.answers.length > 0) {
        setCurrentAnswer(data.answers[0]);
      }
    } catch (error) {
      console.error('Load answer error:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitGuess = async () => {
    if (!currentAnswer || !guess) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/truth/guess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          answerId: currentAnswer.id,
          guessedTruth: guess === 'truth',
          confidence,
          reasoning: reasoning.trim(),
          metadata: {
            timeSpent,
            analysisUsed: analysisMode
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit guess');
      }

      const guessResult = await response.json();
      setResult(guessResult);
      setShowResult(true);
      onGuessResult(guessResult);

    } catch (error) {
      console.error('Submit guess error:', error);
      alert('Failed to submit guess. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryConfig = (category: string) => {
    const configs = {
      FEAR: { color: 'bg-red-600', icon: '😨', textColor: 'text-red-200' },
      CONFESSION: { color: 'bg-purple-600', icon: '🤫', textColor: 'text-purple-200' },
      DESIRE: { color: 'bg-pink-600', icon: '💕', textColor: 'text-pink-200' },
      MEMORY: { color: 'bg-blue-600', icon: '🧠', textColor: 'text-blue-200' },
      SHAME: { color: 'bg-orange-600', icon: '😞', textColor: 'text-orange-200' },
      FUTURE: { color: 'bg-green-600', icon: '🔮', textColor: 'text-green-200' }
    };
    return configs[category as keyof typeof configs] || configs.CONFESSION;
  };

  const getAnalysisClues = () => {
    if (!currentAnswer) return [];

    const clues = [];

    // Length analysis
    if (currentAnswer.metadata.textLength > 300) {
      clues.push({
        type: 'Length',
        observation: 'Very detailed response',
        hint: 'Long answers can indicate either genuine emotion or overcompensation'
      });
    } else if (currentAnswer.metadata.textLength < 50) {
      clues.push({
        type: 'Length',
        observation: 'Brief response',
        hint: 'Short answers might suggest evasion or simple honesty'
      });
    }

    // Emotional intensity
    if (currentAnswer.emotionalIntensity > 7) {
      clues.push({
        type: 'Emotion',
        observation: 'High emotional intensity',
        hint: 'Strong emotions could indicate truth or theatrical lying'
      });
    } else if (currentAnswer.emotionalIntensity < 3) {
      clues.push({
        type: 'Emotion',
        observation: 'Low emotional intensity',
        hint: 'Lack of emotion might suggest distance from truth or factual lying'
      });
    }

    // Believability
    if (currentAnswer.believabilityScore > 8) {
      clues.push({
        type: 'Believability',
        observation: 'Highly believable details',
        hint: 'Too perfect details might indicate preparation or genuine experience'
      });
    } else if (currentAnswer.believabilityScore < 4) {
      clues.push({
        type: 'Believability',
        observation: 'Questionable elements',
        hint: 'Suspicious details could reveal poor lying or unusual truth'
      });
    }

    // Vulnerability
    if (currentAnswer.metadata.vulnerabilityLevel >= 4) {
      clues.push({
        type: 'Vulnerability',
        observation: 'High vulnerability exposure',
        hint: 'People rarely lie about deeply vulnerable topics'
      });
    }

    // Time to answer
    if (currentAnswer.metadata.timeToAnswer > 180) {
      clues.push({
        type: 'Timing',
        observation: 'Took significant time to answer',
        hint: 'Long thinking time suggests either careful truth or elaborate lie construction'
      });
    } else if (currentAnswer.metadata.timeToAnswer < 30) {
      clues.push({
        type: 'Timing',
        observation: 'Very quick response',
        hint: 'Fast answers might indicate prepared lies or immediate truths'
      });
    }

    return clues;
  };

  if (loading) {
    return (
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-8 border border-amber-800/50 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-amber-200">Loading answer to analyze...</p>
      </div>
    );
  }

  if (!currentAnswer) {
    return (
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-8 border border-amber-800/50 text-center">
        <p className="text-amber-200 mb-4">No answers available</p>
        <button
          onClick={loadRandomAnswer}
          className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const config = getCategoryConfig(currentAnswer.question.category);

  return (
    <div className="bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900 rounded-xl p-8 border border-amber-600 relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 right-4 w-32 h-32 bg-orange-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 bg-red-600 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 ${config.color} rounded-full flex items-center justify-center text-white text-xl`}>
              {config.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-amber-100">Truth or Lie?</h2>
              <p className="text-amber-300">Analyze this response and make your guess</p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-amber-300 hover:text-white text-2xl"
            >
              ✕
            </button>
          )}
        </div>

        {/* Answer Info */}
        <div className="mb-6 space-y-4">
          <div className="bg-black/30 rounded-lg p-4 border border-amber-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-300 font-medium">Question:</span>
              <span className="text-amber-400 text-sm">
                {currentAnswer.question.category} • {'⭐'.repeat(currentAnswer.question.difficulty)}
              </span>
            </div>
            <p className="text-amber-100 font-medium">{currentAnswer.question.text}</p>
          </div>

          <div className="bg-black/40 rounded-lg p-6 border border-amber-800/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-amber-300">Answer by:</span>
                <span className="text-white font-medium">{currentAnswer.maskName}</span>
                <span className="text-amber-500">•</span>
                <span className="text-amber-400 text-sm">
                  {new Date(currentAnswer.createdAt).toLocaleDateString()}
                </span>
              </div>
              <span className="text-amber-400 text-sm">{timeSpent}s analyzing</span>
            </div>
            
            <div className="text-white text-lg leading-relaxed bg-black/20 rounded-lg p-4 border-l-4 border-amber-600">
              {currentAnswer.answer}
            </div>
          </div>
        </div>

        {/* Analysis Toggle */}
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => setAnalysisMode(!analysisMode)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              analysisMode
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                : 'bg-black/30 text-amber-200 hover:bg-black/50 border border-amber-800/50'
            }`}
          >
            🔍 {analysisMode ? 'Hide' : 'Show'} Analysis Clues
          </button>
        </div>

        {/* Analysis Clues */}
        <AnimatePresence>
          {analysisMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-black/30 rounded-lg p-6 border border-blue-800/50"
            >
              <h3 className="text-blue-200 font-bold mb-4 flex items-center">
                <span className="mr-2">🕵️</span>
                Analysis Clues
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-amber-300">Emotional Intensity:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                        <div
                          key={level}
                          className={`w-2 h-4 mx-px rounded-sm ${
                            level <= currentAnswer.emotionalIntensity ? 'bg-red-500' : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-red-400">{currentAnswer.emotionalIntensity}/10</span>
                  </div>
                </div>
                
                <div>
                  <span className="text-amber-300">Believability Score:</span>
                  <div className="text-blue-400 font-medium">{currentAnswer.believabilityScore}/10</div>
                </div>
                
                <div>
                  <span className="text-amber-300">Response Length:</span>
                  <div className="text-white">{currentAnswer.metadata.textLength} characters</div>
                </div>
                
                <div>
                  <span className="text-amber-300">Time to Answer:</span>
                  <div className="text-white">{Math.floor(currentAnswer.metadata.timeToAnswer / 60)}:{(currentAnswer.metadata.timeToAnswer % 60).toString().padStart(2, '0')}</div>
                </div>
              </div>

              <div className="space-y-3">
                {getAnalysisClues().map((clue, index) => (
                  <div key={index} className="bg-black/20 rounded-lg p-3 border border-amber-800/30">
                    <div className="flex items-start space-x-3">
                      <span className="text-blue-400 font-semibold">{clue.type}:</span>
                      <div>
                        <p className="text-amber-200">{clue.observation}</p>
                        <p className="text-amber-400 text-sm mt-1">{clue.hint}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showResult ? (
          <div className="space-y-6">
            {/* Guess Selection */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-amber-100 mb-4">Your Guess:</h3>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setGuess('truth')}
                  className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 ${
                    guess === 'truth'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-600/50 scale-105'
                      : 'bg-black/30 text-green-300 hover:bg-green-600/20 border border-green-600/50'
                  }`}
                >
                  💚 TRUTH
                </button>
                <button
                  onClick={() => setGuess('lie')}
                  className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 ${
                    guess === 'lie'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 scale-105'
                      : 'bg-black/30 text-red-300 hover:bg-red-600/20 border border-red-600/50'
                  }`}
                >
                  🔥 LIE
                </button>
              </div>
            </div>

            {/* Confidence Slider */}
            {guess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/30 rounded-lg p-6 border border-amber-800/50"
              >
                <h4 className="text-amber-200 font-semibold mb-3">Confidence Level: {confidence}/10</h4>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-sm text-amber-400 mt-2">
                  <span>Uncertain</span>
                  <span>Very Confident</span>
                </div>
              </motion.div>
            )}

            {/* Reasoning */}
            {guess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/30 rounded-lg p-6 border border-amber-800/50"
              >
                <h4 className="text-amber-200 font-semibold mb-3">Your Reasoning (Optional):</h4>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Explain why you think this is a truth or lie..."
                  className="w-full h-24 bg-black/50 border border-amber-800/50 rounded-lg p-3 text-white placeholder-amber-400/70 focus:outline-none focus:border-amber-600 resize-none"
                />
              </motion.div>
            )}

            {/* Submit */}
            {guess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <button
                  onClick={submitGuess}
                  disabled={isSubmitting}
                  className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 ${
                    isSubmitting
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : guess === 'truth'
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/50'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/50'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    `Submit: It's a ${guess.toUpperCase()}`
                  )}
                </button>
              </motion.div>
            )}
          </div>
        ) : (
          // Result Display
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className={`text-6xl mb-4 ${result?.guess.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {result?.guess.isCorrect ? '🎉' : '❌'}
            </div>
            
            <h3 className={`text-3xl font-bold ${result?.guess.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {result?.guess.isCorrect ? 'Correct!' : 'Incorrect!'}
            </h3>
            
            {result?.result && (
              <div className="bg-black/40 rounded-lg p-6 border border-amber-800/50">
                <p className="text-amber-100 text-lg mb-2">
                  You guessed: <span className={guess === 'truth' ? 'text-green-400' : 'text-red-400'}>
                    {guess?.toUpperCase()}
                  </span>
                </p>
                <p className="text-amber-100 text-lg">
                  It was actually a: <span className={result.result.actualAnswer === 'truth' ? 'text-green-400' : 'text-red-400'}>
                    {result.result.actualAnswer.toUpperCase()}
                  </span>
                </p>
              </div>
            )}
            
            <div className="bg-black/30 rounded-lg p-6 border border-amber-800/50">
              <h4 className="text-amber-200 font-semibold mb-3">Community Stats</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-amber-300">Total Guesses:</span>
                  <div className="text-white font-medium">{result?.communityStats.totalGuesses}</div>
                </div>
                <div>
                  <span className="text-amber-300">Accuracy:</span>
                  <div className="text-white font-medium">{result?.communityStats.accuracyPercentage}%</div>
                </div>
                <div>
                  <span className="text-amber-300">Guessed Truth:</span>
                  <div className="text-green-400 font-medium">{result?.communityStats.truthPercentage}%</div>
                </div>
                <div>
                  <span className="text-amber-300">Guessed Lie:</span>
                  <div className="text-red-400 font-medium">{result?.communityStats.liePercentage}%</div>
                </div>
              </div>
            </div>
            
            <div className="text-amber-100 text-lg">
              You earned <span className="text-orange-400 font-bold">{result?.guess.score}</span> points!
            </div>
            
            <p className="text-amber-300">{result?.message}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
