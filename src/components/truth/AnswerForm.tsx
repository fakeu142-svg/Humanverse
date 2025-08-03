'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMaskStore } from '@/store/maskStore';

interface TruthQuestion {
  id: string;
  category: string;
  question: string;
  difficulty: number;
}

interface AnswerFormProps {
  question: TruthQuestion;
  onAnswerSubmitted: (result: any) => void;
}

interface EmotionalState {
  dominantEmotion: string;
  intensity: number;
  keywords: string[];
}

export function AnswerForm({ question, onAnswerSubmitted }: AnswerFormProps) {
  const { activeMask } = useMaskStore();
  const [answer, setAnswer] = useState('');
  const [isLie, setIsLie] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emotionalAnalysis, setEmotionalAnalysis] = useState<EmotionalState | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime] = useState(Date.now());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    const words = answer.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharacterCount(answer.length);

    // Real-time emotional analysis
    if (answer.length > 20) {
      analyzeEmotions(answer);
    } else {
      setEmotionalAnalysis(null);
    }
  }, [answer]);

  const analyzeEmotions = (text: string) => {
    const emotions = {
      fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'panic', 'nightmare', 'phobia', 'frightened'],
      sadness: ['sad', 'depressed', 'crying', 'tears', 'heartbroken', 'grief', 'lonely', 'empty', 'hopeless'],
      anger: ['angry', 'furious', 'rage', 'hate', 'pissed', 'mad', 'irritated', 'livid', 'resentful'],
      shame: ['ashamed', 'embarrassed', 'guilty', 'humiliated', 'worthless', 'disgusted', 'regret'],
      vulnerability: ['helpless', 'weak', 'broken', 'lost', 'confused', 'insecure', 'desperate', 'exposed'],
      trauma: ['abuse', 'violence', 'hurt', 'damaged', 'violated', 'betrayed', 'abandoned', 'destroyed']
    };

    const textLower = text.toLowerCase();
    let dominantEmotion = 'neutral';
    let maxScore = 0;
    let foundKeywords: string[] = [];

    Object.entries(emotions).forEach(([emotion, keywords]) => {
      const matches = keywords.filter(keyword => textLower.includes(keyword));
      const score = matches.length + (matches.length > 0 ? textLower.split(matches[0]).length - 1 : 0);
      
      if (score > maxScore) {
        maxScore = score;
        dominantEmotion = emotion;
        foundKeywords = matches;
      }
    });

    const intensity = Math.min(Math.max(maxScore * 2 + Math.floor(text.length / 100), 1), 10);

    setEmotionalAnalysis({
      dominantEmotion,
      intensity,
      keywords: foundKeywords
    });
  };

  const getVulnerabilityScore = () => {
    let score = 0;
    
    // Length indicates emotional investment
    if (characterCount > 200) score += 1;
    if (characterCount > 500) score += 2;
    if (characterCount > 1000) score += 3;
    
    // Time spent indicates thoughtfulness or struggle
    if (timeSpent > 60) score += 1;
    if (timeSpent > 180) score += 2;
    
    // Emotional intensity
    if (emotionalAnalysis) {
      score += Math.floor(emotionalAnalysis.intensity / 2);
    }
    
    // Personal pronouns indicate self-disclosure
    const personalPronouns = (answer.match(/\b(i|me|my|mine|myself)\b/gi) || []).length;
    score += Math.min(personalPronouns, 5);
    
    return Math.min(score, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeMask) {
      alert('Please select a mask before answering');
      return;
    }

    if (answer.trim().length < 10) {
      alert('Please provide a more detailed answer (at least 10 characters)');
      return;
    }

    setShowSubmitConfirm(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    setShowSubmitConfirm(false);

    try {
      const response = await fetch('/api/truth/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          questionId: question.id,
          answer: answer.trim(),
          isLie,
          maskName: activeMask.name,
          metadata: {
            timeSpent,
            wordCount,
            characterCount,
            emotionalAnalysis,
            vulnerabilityScore: getVulnerabilityScore()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const result = await response.json();
      onAnswerSubmitted(result);
      
      // Reset form
      setAnswer('');
      setIsLie(false);
      setEmotionalAnalysis(null);
      
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmotionColor = (emotion: string) => {
    const colors = {
      fear: 'text-red-400',
      sadness: 'text-blue-400',
      anger: 'text-orange-400',
      shame: 'text-purple-400',
      vulnerability: 'text-pink-400',
      trauma: 'text-indigo-400',
      neutral: 'text-gray-400'
    };
    return colors[emotion as keyof typeof colors] || 'text-gray-400';
  };

  const getIntensityBar = (intensity: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
          <div
            key={level}
            className={`w-2 h-4 rounded-sm ${
              level <= intensity ? 'bg-red-500' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-black/30 backdrop-blur-md rounded-xl p-8 border border-amber-800/50"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-amber-100 mb-2">Your Response</h3>
        <p className="text-amber-300">
          Share your truth or craft your lie. Others will judge what's real.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Truth/Lie Toggle */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <div className="bg-black/40 rounded-full p-2 flex">
            <button
              type="button"
              onClick={() => setIsLie(false)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                !isLie
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/50'
                  : 'text-amber-200 hover:text-white'
              }`}
            >
              💚 Truth
            </button>
            <button
              type="button"
              onClick={() => setIsLie(true)}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                isLie
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'text-amber-200 hover:text-white'
              }`}
            >
              🔥 Lie
            </button>
          </div>
        </motion.div>

        {/* Answer Textarea */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={isLie ? "Craft a convincing lie that others will believe..." : "Share your authentic truth, no matter how difficult..."}
            className="w-full h-40 bg-black/50 border border-amber-800/50 rounded-lg p-4 text-white placeholder-amber-400/70 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/50 resize-none"
            disabled={isSubmitting}
          />
          
          {/* Character/Word Count */}
          <div className="flex justify-between items-center mt-2 text-sm text-amber-300">
            <div className="flex space-x-4">
              <span>{wordCount} words</span>
              <span>{characterCount} characters</span>
              <span>{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')} elapsed</span>
            </div>
            <div className="text-amber-400">
              Vulnerability: {getVulnerabilityScore()}/10
            </div>
          </div>
        </motion.div>

        {/* Real-time Emotional Analysis */}
        <AnimatePresence>
          {emotionalAnalysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-black/40 rounded-lg p-4 border border-amber-800/30"
            >
              <h4 className="text-amber-200 font-semibold mb-3 flex items-center">
                <span className="mr-2">🧠</span>
                Real-time Emotional Analysis
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-amber-300">Dominant Emotion:</span>
                  <span className={`font-semibold capitalize ${getEmotionColor(emotionalAnalysis.dominantEmotion)}`}>
                    {emotionalAnalysis.dominantEmotion}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-amber-300">Intensity Level:</span>
                  <div className="flex items-center space-x-2">
                    {getIntensityBar(emotionalAnalysis.intensity)}
                    <span className="text-white font-medium">{emotionalAnalysis.intensity}/10</span>
                  </div>
                </div>
                
                {emotionalAnalysis.keywords.length > 0 && (
                  <div>
                    <span className="text-amber-300">Detected Keywords:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {emotionalAnalysis.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-600/20 text-red-300 rounded text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <button
            type="submit"
            disabled={isSubmitting || answer.trim().length < 10}
            className={`px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 ${
              isSubmitting || answer.trim().length < 10
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : isLie
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/50 hover:shadow-red-600/70'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/50 hover:shadow-green-600/70'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              `Submit ${isLie ? 'Lie' : 'Truth'}`
            )}
          </button>
        </motion.div>
      </form>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowSubmitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-amber-900 to-orange-900 rounded-xl p-8 max-w-md mx-4 border border-amber-600"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-amber-100 mb-4">
                Confirm Your {isLie ? 'Lie' : 'Truth'}
              </h3>
              
              <div className="space-y-4 mb-6">
                <p className="text-amber-200">
                  You're about to submit this as a <strong className={isLie ? 'text-red-400' : 'text-green-400'}>
                    {isLie ? 'LIE' : 'TRUTH'}
                  </strong>
                </p>
                
                <div className="bg-black/30 rounded-lg p-3">
                  <p className="text-amber-100 text-sm line-clamp-3">
                    {answer}
                  </p>
                </div>
                
                {emotionalAnalysis && (
                  <div className="text-sm text-amber-300">
                    <p>Emotional analysis: <span className={getEmotionColor(emotionalAnalysis.dominantEmotion)}>
                      {emotionalAnalysis.dominantEmotion}
                    </span> (intensity: {emotionalAnalysis.intensity}/10)</p>
                    <p>Vulnerability score: {getVulnerabilityScore()}/10</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 px-4 py-3 bg-black/30 text-amber-200 rounded-lg hover:bg-black/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmit}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                    isLie
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  Confirm Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
