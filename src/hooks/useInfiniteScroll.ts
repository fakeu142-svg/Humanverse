'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface InfiniteScrollOptions {
  initialLimit?: number;
  incrementLimit?: number;
  threshold?: number; // Distance from bottom to trigger load
  rootMargin?: string;
  enabled?: boolean;
  cacheKey?: string;
  maxCacheSize?: number;
  preloadPages?: number;
}

interface InfiniteScrollState<T> {
  data: T[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  page: number;
  totalLoaded: number;
}

interface CachedPage<T> {
  data: T[];
  timestamp: number;
  page: number;
}

interface ContentCache<T> {
  pages: Map<number, CachedPage<T>>;
  maxSize: number;
  lastAccess: Map<number, number>;
}

// Global content cache
const globalCache = new Map<string, ContentCache<any>>();

export function useInfiniteScroll<T>(
  fetchFunction: (offset: number, limit: number) => Promise<{ data: T[]; hasMore: boolean; total?: number }>,
  options: InfiniteScrollOptions = {}
) {
  const {
    initialLimit = 20,
    incrementLimit = 20,
    threshold = 100,
    rootMargin = '100px',
    enabled = true,
    cacheKey,
    maxCacheSize = 50,
    preloadPages = 1
  } = options;

  const [state, setState] = useState<InfiniteScrollState<T>>({
    data: [],
    loading: false,
    hasMore: true,
    error: null,
    page: 0,
    totalLoaded: 0
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // Initialize cache for this hook if cacheKey is provided
  const cache = useRef<ContentCache<T> | null>(null);
  if (cacheKey && !cache.current) {
    if (!globalCache.has(cacheKey)) {
      globalCache.set(cacheKey, {
        pages: new Map(),
        maxSize: maxCacheSize,
        lastAccess: new Map()
      });
    }
    cache.current = globalCache.get(cacheKey)!;
  }

  // Cache management functions
  const getCachedPage = useCallback((page: number): CachedPage<T> | null => {
    if (!cache.current) return null;
    
    const cachedPage = cache.current.pages.get(page);
    if (cachedPage) {
      // Update last access time
      cache.current.lastAccess.set(page, Date.now());
      
      // Check if cache is still fresh (5 minutes)
      const maxAge = 5 * 60 * 1000;
      if (Date.now() - cachedPage.timestamp < maxAge) {
        return cachedPage;
      } else {
        // Remove stale cache
        cache.current.pages.delete(page);
        cache.current.lastAccess.delete(page);
      }
    }
    
    return null;
  }, []);

  const setCachedPage = useCallback((page: number, data: T[]) => {
    if (!cache.current) return;
    
    // Remove oldest pages if cache is full
    if (cache.current.pages.size >= cache.current.maxSize) {
      const sortedByAccess = Array.from(cache.current.lastAccess.entries())
        .sort(([,a], [,b]) => a - b);
      
      const pagesToRemove = sortedByAccess.slice(0, Math.floor(cache.current.maxSize * 0.2));
      pagesToRemove.forEach(([pageNum]) => {
        cache.current!.pages.delete(pageNum);
        cache.current!.lastAccess.delete(pageNum);
      });
    }
    
    cache.current.pages.set(page, {
      data,
      timestamp: Date.now(),
      page
    });
    cache.current.lastAccess.set(page, Date.now());
  }, []);

  // Load data for a specific page
  const loadPage = useCallback(async (page: number, useCache = true): Promise<void> => {
    if (loadingRef.current || !mountedRef.current) return;

    // Check cache first
    if (useCache && cache.current) {
      const cachedPage = getCachedPage(page);
      if (cachedPage) {
        setState(prev => {
          const newData = [...prev.data];
          const startIndex = page * incrementLimit;
          
          // Insert cached data at correct position
          cachedPage.data.forEach((item, index) => {
            newData[startIndex + index] = item;
          });

          return {
            ...prev,
            data: newData,
            totalLoaded: Math.max(prev.totalLoaded, startIndex + cachedPage.data.length)
          };
        });
        return;
      }
    }

    loadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const offset = page * incrementLimit;
      const limit = page === 0 ? initialLimit : incrementLimit;
      
      const result = await fetchFunction(offset, limit);

      if (!mountedRef.current) return;

      // Cache the result
      if (cache.current) {
        setCachedPage(page, result.data);
      }

      setState(prev => {
        const newData = [...prev.data];
        const startIndex = page * incrementLimit;
        
        // Insert new data at correct position
        result.data.forEach((item, index) => {
          newData[startIndex + index] = item;
        });

        return {
          data: newData,
          loading: false,
          hasMore: result.hasMore,
          error: null,
          page: Math.max(prev.page, page),
          totalLoaded: Math.max(prev.totalLoaded, startIndex + result.data.length)
        };
      });

      // Preload next pages if enabled
      if (preloadPages > 0 && result.hasMore) {
        for (let i = 1; i <= preloadPages; i++) {
          const nextPage = page + i;
          if (!getCachedPage(nextPage)) {
            // Preload in background without updating state
            setTimeout(() => {
              if (mountedRef.current) {
                loadPage(nextPage, false);
              }
            }, 100 * i);
          }
        }
      }

    } catch (error: any) {
      if (!mountedRef.current) return;
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load content'
      }));
    } finally {
      loadingRef.current = false;
    }
  }, [fetchFunction, initialLimit, incrementLimit, getCachedPage, setCachedPage, preloadPages]);

  // Load next page
  const loadMore = useCallback(() => {
    if (!state.hasMore || loadingRef.current) return;
    
    const nextPage = state.page + 1;
    loadPage(nextPage);
  }, [state.hasMore, state.page, loadPage]);

  // Reset and reload from beginning
  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      hasMore: true,
      error: null,
      page: 0,
      totalLoaded: 0
    });
    
    // Clear cache for this key
    if (cache.current) {
      cache.current.pages.clear();
      cache.current.lastAccess.clear();
    }
    
    // Load first page
    if (enabled) {
      loadPage(0);
    }
  }, [enabled, loadPage]);

  // Refresh current data
  const refresh = useCallback(() => {
    // Clear cache
    if (cache.current) {
      cache.current.pages.clear();
      cache.current.lastAccess.clear();
    }
    
    // Reload current pages
    const currentPageCount = Math.ceil(state.totalLoaded / incrementLimit);
    setState(prev => ({ ...prev, data: [], totalLoaded: 0 }));
    
    for (let i = 0; i <= currentPageCount; i++) {
      loadPage(i, false);
    }
  }, [state.totalLoaded, incrementLimit, loadPage]);

  // Insert new item at the beginning (for real-time updates)
  const prependItem = useCallback((item: T) => {
    setState(prev => ({
      ...prev,
      data: [item, ...prev.data],
      totalLoaded: prev.totalLoaded + 1
    }));
    
    // Update cache
    if (cache.current) {
      const firstPage = cache.current.pages.get(0);
      if (firstPage) {
        firstPage.data = [item, ...firstPage.data];
        firstPage.timestamp = Date.now();
      }
    }
  }, []);

  // Remove item by ID
  const removeItem = useCallback((itemId: string | number, idField = 'id') => {
    setState(prev => ({
      ...prev,
      data: prev.data.filter((item: any) => item[idField] !== itemId),
      totalLoaded: prev.totalLoaded - 1
    }));
    
    // Update cache
    if (cache.current) {
      cache.current.pages.forEach(page => {
        page.data = page.data.filter((item: any) => item[idField] !== itemId);
        page.timestamp = Date.now();
      });
    }
  }, []);

  // Update existing item
  const updateItem = useCallback((itemId: string | number, updatedItem: Partial<T>, idField = 'id') => {
    setState(prev => ({
      ...prev,
      data: prev.data.map((item: any) => 
        item[idField] === itemId ? { ...item, ...updatedItem } : item
      )
    }));
    
    // Update cache
    if (cache.current) {
      cache.current.pages.forEach(page => {
        page.data = page.data.map((item: any) => 
          item[idField] === itemId ? { ...item, ...updatedItem } : item
        );
        page.timestamp = Date.now();
      });
    }
  }, []);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && state.hasMore && !loadingRef.current) {
          loadMore();
        }
      },
      {
        rootMargin,
        threshold: 0.1
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, state.hasMore, loadMore, rootMargin]);

  // Load initial data
  useEffect(() => {
    if (enabled && state.data.length === 0 && !loadingRef.current) {
      loadPage(0);
    }
  }, [enabled, loadPage, state.data.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Scroll-based loading (fallback for browsers without intersection observer)
  const handleScroll = useCallback(() => {
    if (!enabled || loadingRef.current || !state.hasMore) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMore();
    }
  }, [enabled, state.hasMore, loadMore, threshold]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      // Fallback to scroll event
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return {
    // State
    data: state.data,
    loading: state.loading,
    hasMore: state.hasMore,
    error: state.error,
    totalLoaded: state.totalLoaded,

    // Actions
    loadMore,
    reset,
    refresh,
    prependItem,
    removeItem,
    updateItem,

    // Refs for components
    sentinelRef,

    // Cache info
    cacheInfo: cache.current ? {
      cachedPages: cache.current.pages.size,
      maxSize: cache.current.maxSize,
      cacheHitRate: calculateCacheHitRate(cache.current)
    } : null
  };
}

// Specialized hook for content feed with real-time updates
export function useContentFeed(
  apiEndpoint: string,
  filters: any = {},
  options: Omit<InfiniteScrollOptions, 'cacheKey'> = {}
) {
  const fetchFunction = useCallback(async (offset: number, limit: number) => {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit,
        offset,
        filters,
        includeAdminManipulation: true
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch content');
    }

    const data = await response.json();
    return {
      data: data.content || [],
      hasMore: data.pagination?.hasMore || false,
      total: data.pagination?.totalAvailable
    };
  }, [apiEndpoint, filters]);

  const cacheKey = `content-feed-${apiEndpoint}-${JSON.stringify(filters)}`;
  
  return useInfiniteScroll(fetchFunction, {
    ...options,
    cacheKey,
    preloadPages: 2 // Preload more pages for smooth scrolling
  });
}

// Hook for trending content with auto-refresh
export function useTrendingContent(
  timeWindow: number = 24,
  options: Omit<InfiniteScrollOptions, 'cacheKey'> = {}
) {
  const fetchFunction = useCallback(async (offset: number, limit: number) => {
    const response = await fetch(`/api/explore/trending?timeWindow=${timeWindow}&limit=${limit}&offset=${offset}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch trending content');
    }

    const data = await response.json();
    return {
      data: data.trending || [],
      hasMore: data.trending?.length === limit,
      total: data.metrics?.total
    };
  }, [timeWindow]);

  const result = useInfiniteScroll(fetchFunction, {
    ...options,
    cacheKey: `trending-${timeWindow}`,
    initialLimit: 10,
    incrementLimit: 10
  });

  // Auto-refresh trending content every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      result.refresh();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [result.refresh]);

  return result;
}

// Performance monitoring hook
export function useInfiniteScrollPerformance(hookRef: any) {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    averageLoadTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      setMetrics(prev => ({
        ...prev,
        loadTime: endTime - startTime,
        totalRequests: prev.totalRequests + 1,
        averageLoadTime: (prev.averageLoadTime * prev.totalRequests + (endTime - startTime)) / (prev.totalRequests + 1)
      }));
    };
  }, [hookRef.data]);

  return metrics;
}

// Utility functions
function calculateCacheHitRate(cache: ContentCache<any>): number {
  const totalPages = cache.pages.size;
  const recentAccesses = Array.from(cache.lastAccess.values())
    .filter(time => Date.now() - time < 60000); // Last minute
  
  return totalPages > 0 ? (recentAccesses.length / totalPages) * 100 : 0;
}

// Global cache management
export function clearGlobalCache(cacheKey?: string) {
  if (cacheKey) {
    globalCache.delete(cacheKey);
  } else {
    globalCache.clear();
  }
}

export function getCacheStats() {
  const stats = {
    totalCaches: globalCache.size,
    totalPages: 0,
    memoryUsage: 0
  };

  globalCache.forEach(cache => {
    stats.totalPages += cache.pages.size;
    // Rough memory estimation
    stats.memoryUsage += cache.pages.size * 100; // KB per page estimate
  });

  return stats;
}
