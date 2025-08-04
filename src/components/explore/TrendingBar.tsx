'use client';

import React, { useState, useEffect } from 'react';

interface TrendingItem {
  id: string;
  type: string;
  content: string;
  engagementScore: number;
  trendingScore: number;
  timestamp: Date;
  metadata: any;
  adminManipulated?: boolean;
  organicRank?: number;
  manipulatedRank?: number;
}

interface TrendingBarProps {
  timeWindow?: number;
  onTrendingClick?: (content: string) => void;
  showAdminData?: boolean;
  className?: string;
}

export function TrendingBar({ 
  timeWindow = 24, 
  onTrendingClick,
  showAdminData = false,
  className = ''
}: TrendingBarProps) {
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    loadTrendingContent(abortController.signal);

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      const refreshController = new AbortController();
      loadTrendingContent(refreshController.signal);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      abortController.abort();
    };
  }, [timeWindow]);

  const loadTrendingContent = async (signal?: AbortSignal) => {
    try {
      setError(null);

      // Check if user has auth token
      const hasAuthToken = document.cookie.includes('auth-token');

      if (!hasAuthToken) {
        // Use fallback trending data for unauthenticated users
        setTrendingItems(getFallbackTrendingData());
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/explore/trending?timeWindow=${timeWindow}&limit=20&includeAdminData=${showAdminData}`, { signal });

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - use fallback data
          setTrendingItems(getFallbackTrendingData());
          setLoading(false);
          return;
        }
        throw new Error('Failed to load trending content');
      }

      const data = await response.json();
      setTrendingItems(data.trending || []);
    } catch (err: any) {
      // Don't log abort errors - they're expected during HMR
      if (err.name !== 'AbortError') {
        console.error('Trending load error:', err);
      }
      // Use fallback data instead of showing error
      setTrendingItems(getFallbackTrendingData());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackTrendingData = (): TrendingItem[] => {
    return [
      {
        id: 'fallback-1',
        type: 'CHAT_MESSAGE',
        content: 'Anonymous conversations flourishing in the Humanverse',
        engagementScore: 45,
        trendingScore: 89,
        timestamp: new Date(),
        metadata: {}
      },
      {
        id: 'fallback-2',
        type: 'TRUTH_ANSWER',
        content: 'Truth games revealing authentic connections',
        engagementScore: 38,
        trendingScore: 76,
        timestamp: new Date(),
        metadata: {}
      },
      {
        id: 'fallback-3',
        type: 'DROPZONE_SECRET',
        content: 'Hidden secrets waiting to be discovered',
        engagementScore: 52,
        trendingScore: 94,
        timestamp: new Date(),
        metadata: {}
      },
      {
        id: 'fallback-4',
        type: 'CHAT_MESSAGE',
        content: 'Masks enabling deeper authentic expression',
        engagementScore: 41,
        trendingScore: 82,
        timestamp: new Date(),
        metadata: {}
      }
    ];
  };

  const formatTrendingScore = (score: number): string => {
    if (score > 1000) return `${(score / 1000).toFixed(1)}k`;
    return Math.round(score).toString();
  };

  const getTrendingEmoji = (type: string): string => {
    const emojis = {
      'CHAT_MESSAGE': '💬',
      'TRUTH_ANSWER': '🎯',
      'DROPZONE_SECRET': '🗝️',
      'ADMIN_PLANT': '🤖'
    };
    return emojis[type as keyof typeof emojis] || '📄';
  };

  if (loading) {
    return (
      <div className={`bg-gray-900/50 border-b border-gray-700 ${className}`}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">🔥 Trending:</div>
            <div className="flex gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="h-6 bg-gray-700 rounded w-20 animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || trendingItems.length === 0) {
    return (
      <div className={`bg-gray-900/50 border-b border-gray-700 ${className}`}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">🔥 Trending:</div>
            <div className="text-sm text-gray-500">
              {error || 'No trending content available'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 border-b border-gray-700 overflow-hidden ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400 flex items-center gap-2">
            🔥 Trending:
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`text-xs px-2 py-1 rounded ${
                autoScroll ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {autoScroll ? 'Auto' : 'Manual'}
            </button>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            <div className={`flex gap-3 ${autoScroll ? 'animate-scroll' : ''}`}>
              {trendingItems.map((item, index) => (
                <TrendingItem
                  key={item.id}
                  item={item}
                  rank={index + 1}
                  onClick={onTrendingClick}
                  showAdminData={showAdminData}
                />
              ))}
              
              {/* Duplicate items for seamless scrolling */}
              {autoScroll && trendingItems.map((item, index) => (
                <TrendingItem
                  key={`${item.id}-duplicate`}
                  item={item}
                  rank={index + 1}
                  onClick={onTrendingClick}
                  showAdminData={showAdminData}
                />
              ))}
            </div>
          </div>

          <button
            onClick={loadTrendingContent}
            className="text-gray-400 hover:text-white text-sm"
            disabled={loading}
          >
            🔄
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 60s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

function TrendingItem({ 
  item, 
  rank, 
  onClick, 
  showAdminData 
}: { 
  item: TrendingItem;
  rank: number;
  onClick?: (content: string) => void;
  showAdminData: boolean;
}) {
  const emoji = getTrendingEmoji(item.type);
  const truncatedContent = item.content.length > 50 
    ? item.content.substring(0, 50) + '...' 
    : item.content;

  return (
    <div
      className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 
                 border border-gray-700 rounded-lg px-3 py-2 cursor-pointer 
                 transition-colors whitespace-nowrap min-w-fit"
      onClick={() => onClick?.(item.content)}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs font-bold text-red-400">#{rank}</span>
        <span className="text-sm">{emoji}</span>
      </div>
      
      <div className="flex flex-col min-w-0">
        <div className="text-sm text-white truncate max-w-xs">
          {truncatedContent}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>🔥 {formatTrendingScore(item.trendingScore)}</span>
          {showAdminData && item.adminManipulated && (
            <span className="bg-yellow-600 text-yellow-100 px-1 rounded">BOOSTED</span>
          )}
        </div>
      </div>
    </div>
  );
}

function getTrendingEmoji(type: string): string {
  const emojis = {
    'CHAT_MESSAGE': '💬',
    'TRUTH_ANSWER': '🎯',
    'DROPZONE_SECRET': '🗝️',
    'ADMIN_PLANT': '🤖'
  };
  return emojis[type as keyof typeof emojis] || '📄';
}

function formatTrendingScore(score: number): string {
  if (score > 1000) return `${(score / 1000).toFixed(1)}k`;
  return Math.round(score).toString();
}
