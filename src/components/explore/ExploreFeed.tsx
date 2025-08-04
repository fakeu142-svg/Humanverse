'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useContentFeed } from '@/hooks/useInfiniteScroll';
import { ContentCard, ContentCardSkeleton } from './ContentCard';
import { FilterPanel } from './FilterPanel';
import { TrendingBar } from './TrendingBar';

interface ContentItem {
  id: string;
  type: 'CHAT_MESSAGE' | 'TRUTH_ANSWER' | 'DROPZONE_SECRET' | 'ADMIN_PLANT';
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  engagementScore: number;
  metadata: any;
  adminBoost?: number;
  suppressionLevel?: number;
  isPromoted?: boolean;
  isSuppressed?: boolean;
  psychologicalTags?: string[];
  emotionalWeight?: number;
}

interface ContentFilters {
  contentTypes?: string[];
  timeRange?: string;
  emotionalTone?: string;
  engagementLevel?: string;
  userRiskLevel?: string;
  psychologicalTargets?: string[];
  excludeUsers?: string[];
  includeOnlyUsers?: string[];
  adminOverrides?: boolean;
}

interface ExploreFeedProps {
  showFilterPanel?: boolean;
  showTrendingBar?: boolean;
  showAdminData?: boolean;
  initialFilters?: ContentFilters;
  demoMode?: boolean;
  className?: string;
}

export function ExploreFeed({
  showFilterPanel = true,
  showTrendingBar = true,
  showAdminData = false,
  initialFilters = {},
  demoMode = false,
  className = ''
}: ExploreFeedProps) {
  const [filters, setFilters] = useState<ContentFilters>(initialFilters);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [sortMode, setSortMode] = useState<'algorithm' | 'chronological' | 'engagement'>('algorithm');
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  // Use the content feed hook with infinite scroll
  const {
    data: content,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    refresh,
    prependItem,
    removeItem,
    updateItem,
    sentinelRef,
    cacheInfo
  } = useContentFeed('/api/explore/feed', filters, {
    initialLimit: 20,
    incrementLimit: 20,
    preloadPages: 1
  });

  // Reset feed when filters change
  useEffect(() => {
    reset();
  }, [filters, reset]);

  // Handle real-time content updates
  useEffect(() => {
    if (!realTimeUpdates) return;

    const handleRealTimeUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'NEW_CONTENT':
            prependItem(data.content);
            break;
          case 'CONTENT_UPDATED':
            updateItem(data.contentId, data.updates);
            break;
          case 'CONTENT_REMOVED':
            removeItem(data.contentId);
            break;
        }
      } catch (error) {
        console.error('Real-time update error:', error);
      }
    };

    // Simulate real-time updates (in a real app, this would be WebSocket)
    const interval = setInterval(() => {
      // Randomly add new content to simulate real-time updates
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        const mockContent: ContentItem = {
          id: `realtime-${Date.now()}`,
          type: 'CHAT_MESSAGE',
          userId: 'system',
          username: 'System',
          content: 'This is a real-time update!',
          timestamp: new Date(),
          engagementScore: Math.random(),
          metadata: { roomName: 'General' }
        };
        prependItem(mockContent);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [realTimeUpdates, prependItem, updateItem, removeItem]);

  const handleContentInteraction = useCallback((contentId: string, interactionType: string) => {
    // Track interaction for analytics
    fetch('/api/analytics/interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentId,
        interactionType,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error);

    // Handle specific interactions
    switch (interactionType) {
      case 'view':
        const viewedContent = content.find(item => item.id === contentId);
        if (viewedContent) {
          setSelectedContent(viewedContent);
        }
        break;
      case 'react':
        // Update engagement score optimistically
        updateItem(contentId, {
          engagementScore: Math.min(1.0, (content.find(item => item.id === contentId)?.engagementScore || 0) + 0.1)
        });
        break;
      case 'share':
        // Handle sharing
        if (navigator.share) {
          navigator.share({
            title: 'Interesting content from Humanverse',
            url: window.location.href
          });
        }
        break;
    }
  }, [content, updateItem]);

  const handleFiltersChange = useCallback((newFilters: ContentFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({});
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Content</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black text-white ${className}`}>
      {/* Header */}
      <div className="border-b border-red-900/30 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-red-400">Explore Feed</h1>
              <p className="text-gray-400 text-sm">
                Discover content across the Humanverse platform
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('feed')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'feed' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  📄 Feed
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ⚏ Grid
                </button>
              </div>

              {/* Sort Mode */}
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="bg-gray-900 border border-gray-700 rounded px-3 py-1 text-white text-sm"
              >
                <option value="algorithm">🧠 Algorithm</option>
                <option value="chronological">🕒 Chronological</option>
                <option value="engagement">📈 Engagement</option>
              </select>

              {/* Real-time Toggle */}
              <button
                onClick={() => setRealTimeUpdates(!realTimeUpdates)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  realTimeUpdates 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {realTimeUpdates ? '🔴 Live' : '⏸️ Paused'}
              </button>

              {/* Refresh */}
              <button
                onClick={refresh}
                disabled={loading}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 
                         px-3 py-1 rounded text-sm transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Bar */}
      {showTrendingBar && (
        <TrendingBar 
          timeWindow={24}
          onTrendingClick={(trend) => {
            // Filter by trending content
            setFilters(prev => ({
              ...prev,
              searchQuery: trend
            }));
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="lg:col-span-1">
              <div className="sticky top-32">
                <FilterPanel
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onReset={handleResetFilters}
                  isLoading={loading}
                  showAdvanced={showAdminData}
                />

                {/* Cache Info (Admin Only) */}
                {showAdminData && cacheInfo && (
                  <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Cache Info</h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Cached Pages: {cacheInfo.cachedPages}/{cacheInfo.maxSize}</div>
                      <div>Hit Rate: {cacheInfo.cacheHitRate.toFixed(1)}%</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content Feed */}
          <div className={showFilterPanel ? 'lg:col-span-3' : 'lg:col-span-4'}>
            {/* Feed Stats */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-gray-400">
                {content.length} items loaded
                {hasMore && ' • More available'}
              </div>
              
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-red-500 rounded-full"></div>
                  Loading...
                </div>
              )}
            </div>

            {/* Content Grid/Feed */}
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
              : 'space-y-4'
            }>
              {content.map((item, index) => (
                <ContentCard
                  key={item.id}
                  content={item}
                  onInteraction={handleContentInteraction}
                  showAdminData={showAdminData}
                  isSelected={selectedContent?.id === item.id}
                  onClick={() => setSelectedContent(item)}
                  className={viewMode === 'grid' ? 'h-fit' : ''}
                />
              ))}

              {/* Loading Skeletons */}
              {loading && (
                <>
                  {Array.from({ length: 3 }, (_, index) => (
                    <ContentCardSkeleton key={`skeleton-${index}`} />
                  ))}
                </>
              )}
            </div>

            {/* Empty State */}
            {!loading && content.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">No content found</h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your filters or check back later for new content.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Load More Trigger */}
            {hasMore && !loading && (
              <div 
                ref={sentinelRef}
                className="flex items-center justify-center py-8"
              >
                <button
                  onClick={loadMore}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-600 
                           text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Load More Content
                </button>
              </div>
            )}

            {/* End of Feed */}
            {!hasMore && content.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-2xl mb-2">🏁</div>
                <p>You've reached the end of the feed</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Content Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-900/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-800 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-400">Content Details</h2>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <ContentCard
                content={selectedContent}
                onInteraction={handleContentInteraction}
                showAdminData={showAdminData}
                isSelected={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for embedding in other pages
export function CompactExploreFeed({ 
  limit = 5, 
  filters = {},
  className = ''
}: {
  limit?: number;
  filters?: ContentFilters;
  className?: string;
}) {
  const { data: content, loading, error } = useContentFeed('/api/explore/feed', filters, {
    initialLimit: limit,
    incrementLimit: 0 // No infinite scroll for compact version
  });

  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="text-red-400 text-sm">Failed to load content</div>
      </div>
    );
  }

  if (loading && content.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: limit }, (_, i) => (
          <ContentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {content.slice(0, limit).map(item => (
        <ContentCard
          key={item.id}
          content={item}
          showAdminData={false}
        />
      ))}
      
      {content.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-2xl mb-2">📭</div>
          <p className="text-sm">No content available</p>
        </div>
      )}
    </div>
  );
}
