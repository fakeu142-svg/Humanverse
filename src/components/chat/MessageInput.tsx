'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
  maskName: string;
  roomType: 'PUBLIC' | 'TRUTH_GAME' | 'DROP_ZONE' | 'ADMIN_CONTROLLED';
}

interface EmotionalAnalysis {
  dominantEmotion: string;
  intensity: number;
  triggers: string[];
  toxicityScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function MessageInput({
  onSendMessage,
  onTyping,
  onStopTyping,
  disabled = false,
  maskName,
  roomType
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emotionalAnalysis, setEmotionalAnalysis] = useState<EmotionalAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [charactersLeft, setCharactersLeft] = useState(500);
  const [isExpanding, setIsExpanding] = useState(false);
  const [tempMessage, setTempMessage] = useState(false);
  const [tempDuration, setTempDuration] = useState(30); // minutes
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const maxLength = 500;

  useEffect(() => {
    setCharactersLeft(maxLength - message.length);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Trigger typing indicator
    if (message.trim()) {
      onTyping();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping();
      }, 2000);
    } else {
      onStopTyping();
    }

    // Real-time emotional analysis
    if (message.length > 10) {
      setIsAnalyzing(true);
      
      // Clear existing timeout
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
      
      // Debounce analysis
      analysisTimeoutRef.current = setTimeout(() => {
        analyzeMessage(message);
      }, 500);
    } else {
      setEmotionalAnalysis(null);
      setIsAnalyzing(false);
    }

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message]);

  const analyzeMessage = async (text: string) => {
    try {
      // Real-time emotional analysis
      const analysis = performClientSideAnalysis(text);
      setEmotionalAnalysis(analysis);
      setShowAnalysis(analysis.riskLevel !== 'LOW' || analysis.intensity > 6);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performClientSideAnalysis = (text: string): EmotionalAnalysis => {
    const textLower = text.toLowerCase();
    
    // Emotion detection patterns
    const emotionPatterns = {
      anger: ['angry', 'furious', 'hate', 'rage', 'pissed', 'mad', 'fuck', 'damn'],
      fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'panic'],
      sadness: ['sad', 'depressed', 'crying', 'hurt', 'broken', 'lonely'],
      joy: ['happy', 'excited', 'love', 'amazing', 'great', 'awesome'],
      disgust: ['disgusting', 'gross', 'sick', 'revolting', 'eww'],
      shame: ['ashamed', 'embarrassed', 'guilty', 'worthless', 'pathetic']
    };

    // Toxicity patterns
    const toxicPatterns = [
      'kill yourself', 'kys', 'die', 'hate you', 'stupid', 'idiot', 
      'retard', 'loser', 'pathetic', 'worthless', 'trash', 'garbage'
    ];

    // Trigger patterns
    const triggerPatterns = [
      'suicide', 'self harm', 'cutting', 'depression', 'anxiety', 'panic attack',
      'trauma', 'abuse', 'rape', 'violence', 'death', 'murder'
    ];

    // Calculate emotion scores
    let dominantEmotion = 'neutral';
    let maxScore = 0;
    const foundTriggers: string[] = [];

    Object.entries(emotionPatterns).forEach(([emotion, patterns]) => {
      const matches = patterns.filter(pattern => textLower.includes(pattern));
      const score = matches.length;
      
      if (score > maxScore) {
        maxScore = score;
        dominantEmotion = emotion;
      }
    });

    // Check for triggers
    triggerPatterns.forEach(pattern => {
      if (textLower.includes(pattern)) {
        foundTriggers.push(pattern);
      }
    });

    // Calculate toxicity score
    const toxicMatches = toxicPatterns.filter(pattern => textLower.includes(pattern));
    const toxicityScore = Math.min(toxicMatches.length * 0.3, 1);

    // Calculate intensity
    const wordCount = text.split(' ').length;
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    const exclamationCount = (text.match(/!/g) || []).length;
    
    let intensity = maxScore * 2;
    intensity += capsRatio * 5; // CAPS = intensity
    intensity += exclamationCount; // !!! = intensity
    intensity += Math.min(wordCount / 10, 3); // Longer = more intense
    
    intensity = Math.min(Math.max(intensity, 1), 10);

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    
    if (foundTriggers.length > 0 || toxicityScore > 0.8) {
      riskLevel = 'CRITICAL';
    } else if (toxicityScore > 0.5 || intensity > 8) {
      riskLevel = 'HIGH';
    } else if (toxicityScore > 0.3 || intensity > 6) {
      riskLevel = 'MEDIUM';
    }

    return {
      dominantEmotion,
      intensity,
      triggers: foundTriggers,
      toxicityScore,
      riskLevel
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;
    
    // Check for critical content
    if (emotionalAnalysis?.riskLevel === 'CRITICAL') {
      if (!confirm('This message contains sensitive content. Are you sure you want to send it?')) {
        return;
      }
    }

    onSendMessage(message.trim());
    setMessage('');
    setEmotionalAnalysis(null);
    setShowAnalysis(false);
    onStopTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getAnalysisColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'text-red-400 border-red-500/50';
      case 'HIGH': return 'text-orange-400 border-orange-500/50';
      case 'MEDIUM': return 'text-yellow-400 border-yellow-500/50';
      default: return 'text-green-400 border-green-500/50';
    }
  };

  const getEmotionIcon = (emotion: string) => {
    const icons = {
      anger: '😡',
      fear: '😨',
      sadness: '😢',
      joy: '😊',
      disgust: '🤢',
      shame: '😞',
      neutral: '😐'
    };
    return icons[emotion as keyof typeof icons] || '😐';
  };

  return (
    <div className="bg-black/30 backdrop-blur-md p-4 border-t border-white/10">
      {/* Emotional Analysis Display */}
      <AnimatePresence>
        {showAnalysis && emotionalAnalysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mb-4 p-3 rounded-lg border ${getAnalysisColor(emotionalAnalysis.riskLevel)} bg-black/20`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                <span>🧠</span>
                <span>Real-time Analysis</span>
              </h4>
              <button
                onClick={() => setShowAnalysis(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Emotion:</span>
                <div className="flex items-center space-x-1">
                  <span>{getEmotionIcon(emotionalAnalysis.dominantEmotion)}</span>
                  <span className="text-white capitalize">{emotionalAnalysis.dominantEmotion}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Intensity:</span>
                <span className="text-white">{emotionalAnalysis.intensity}/10</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Risk:</span>
                <span className={getAnalysisColor(emotionalAnalysis.riskLevel).split(' ')[0]}>
                  {emotionalAnalysis.riskLevel}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Toxicity:</span>
                <span className="text-white">{Math.round(emotionalAnalysis.toxicityScore * 100)}%</span>
              </div>
            </div>
            
            {emotionalAnalysis.triggers.length > 0 && (
              <div className="mt-2">
                <span className="text-red-400 text-xs">Triggers detected: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {emotionalAnalysis.triggers.map((trigger, index) => (
                    <span
                      key={index}
                      className="bg-red-600/20 text-red-300 px-2 py-1 rounded text-xs"
                    >
                      {trigger}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Composition */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Message Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-gray-400 text-sm">Temporary Message:</label>
              <input
                type="checkbox"
                checked={tempMessage}
                onChange={(e) => setTempMessage(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-black/30"
              />
            </div>
            
            {tempMessage && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Duration:</span>
                <select
                  value={tempDuration}
                  onChange={(e) => setTempDuration(parseInt(e.target.value))}
                  className="bg-black/30 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                >
                  <option value={5}>5 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                  <option value={180}>3 hours</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            {isAnalyzing && (
              <div className="flex items-center space-x-1 text-blue-400">
                <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
                <span>Analyzing...</span>
              </div>
            )}
            
            <span className={`${charactersLeft < 50 ? 'text-red-400' : 'text-gray-400'}`}>
              {charactersLeft} left
            </span>
          </div>
        </div>

        {/* Input Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Send an anonymous message as ${maskName}...`}
            disabled={disabled}
            maxLength={maxLength}
            className={`w-full bg-black/50 border rounded-xl p-4 pr-16 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 transition-all duration-300 ${
              disabled 
                ? 'border-gray-600 cursor-not-allowed opacity-50' 
                : emotionalAnalysis?.riskLevel === 'CRITICAL'
                ? 'border-red-500/50 focus:ring-red-500/50'
                : emotionalAnalysis?.riskLevel === 'HIGH'
                ? 'border-orange-500/50 focus:ring-orange-500/50'
                : 'border-white/20 focus:ring-white/50'
            }`}
            rows={1}
            style={{ minHeight: '52px' }}
          />
          
          {/* Send Button */}
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all duration-300 ${
              disabled || !message.trim()
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-white/20 text-white hover:bg-white/30 active:scale-95'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* Room-specific Warnings */}
        {roomType === 'ADMIN_CONTROLLED' && (
          <div className="flex items-center space-x-2 text-orange-400 text-xs">
            <span>⚠️</span>
            <span>This room is under enhanced admin surveillance</span>
          </div>
        )}
        
        {roomType === 'TRUTH_GAME' && (
          <div className="flex items-center space-x-2 text-purple-400 text-xs">
            <span>🎭</span>
            <span>Truth game conversations are psychologically analyzed</span>
          </div>
        )}
      </form>
    </div>
  );
}
