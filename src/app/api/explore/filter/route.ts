import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { filterContent, ContentFilters } from '@/lib/contentAggregation';
import { aggregateContentForFeed } from '@/lib/feedAlgorithm';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      filters,
      limit = 50,
      offset = 0,
      saveAsPreset = false,
      presetName
    } = body;

    // Record filter usage for behavioral analysis
    await db.userActivity.create({
      data: {
        userId: user.id,
        activityType: 'CONTENT_FILTER_USAGE',
        details: {
          filters,
          limit,
          offset,
          timestamp: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        },
        timestamp: new Date()
      }
    }).catch(() => {});

    // Get raw content for filtering
    const rawContent = await aggregateContentForFeed(
      user.id,
      limit * 3, // Get more content to account for filtering
      0, // Start from beginning for filtering
      {}
    );

    // Apply filters
    const contentFilters: ContentFilters = {
      contentTypes: filters.contentTypes,
      timeRange: filters.timeRange,
      emotionalTone: filters.emotionalTone,
      engagementLevel: filters.engagementLevel,
      userRiskLevel: filters.userRiskLevel,
      psychologicalTargets: filters.psychologicalTargets,
      excludeUsers: filters.excludeUsers,
      includeOnlyUsers: filters.includeOnlyUsers,
      adminOverrides: filters.adminOverrides !== false
    };

    const filteredContent = await filterContent(rawContent, contentFilters, user.id);

    // Apply pagination
    const paginatedContent = filteredContent.slice(offset, offset + limit);

    // Save as user preset if requested
    if (saveAsPreset && presetName) {
      await saveFilterPreset(user.id, presetName, contentFilters);
    }

    // Analyze filter effectiveness
    const filterAnalysis = analyzeFilterEffectiveness(rawContent, filteredContent, contentFilters);

    // Get admin overrides applied (if any)
    const adminOverrides = await getAdminOverridesForUser(user.id, filteredContent);

    return NextResponse.json({
      success: true,
      content: paginatedContent.map(item => ({
        id: item.id,
        type: item.type,
        userId: item.userId,
        username: item.username,
        content: item.content,
        timestamp: item.timestamp,
        engagementScore: item.engagementScore,
        metadata: item.metadata,
        // Include filter match reasons for debugging
        filterMatches: getFilterMatches(item, contentFilters)
      })),
      pagination: {
        limit,
        offset,
        hasMore: filteredContent.length > offset + limit,
        totalFiltered: filteredContent.length,
        totalRaw: rawContent.length
      },
      filterAnalysis,
      adminOverrides: adminOverrides.length,
      appliedFilters: contentFilters
    });

  } catch (error) {
    console.error('Content filter error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'presets':
        return await getUserFilterPresets(user.id);
      
      case 'options':
        return await getFilterOptions(user.id);
      
      case 'analytics':
        return await getFilterAnalytics(user.id);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Filter GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get user's saved filter presets
async function getUserFilterPresets(userId: string) {
  try {
    const presets = await db.userFilterPreset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      presets: presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        filters: preset.filters,
        usageCount: preset.usageCount,
        lastUsed: preset.lastUsed,
        createdAt: preset.createdAt
      }))
    });
  } catch (error) {
    console.error('Get presets error:', error);
    return NextResponse.json({ error: 'Failed to get presets' }, { status: 500 });
  }
}

// Get available filter options
async function getFilterOptions(userId: string) {
  try {
    // Get available content types
    const contentTypes = [
      { value: 'CHAT_MESSAGE', label: 'Chat Messages', count: await getContentTypeCount('CHAT_MESSAGE') },
      { value: 'TRUTH_ANSWER', label: 'Truth Answers', count: await getContentTypeCount('TRUTH_ANSWER') },
      { value: 'DROPZONE_SECRET', label: 'DropZone Secrets', count: await getContentTypeCount('DROPZONE_SECRET') }
    ];

    // Get user's psychological tags for targeting
    const userProfile = await db.userPsychProfile.findUnique({
      where: { userId },
      select: { patterns: true }
    });

    const psychologicalTags = userProfile?.patterns ? 
      (userProfile.patterns as any).emotionalTriggers || [] : [];

    // Get available users for filtering
    const recentUsers = await db.user.findMany({
      where: {
        lastActive: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
        }
      },
      select: {
        id: true,
        username: true
      },
      take: 50,
      orderBy: { lastActive: 'desc' }
    });

    return NextResponse.json({
      success: true,
      options: {
        contentTypes,
        timeRanges: [
          { value: 'hour', label: 'Last Hour' },
          { value: 'day', label: 'Last Day' },
          { value: 'week', label: 'Last Week' },
          { value: 'month', label: 'Last Month' },
          { value: 'all', label: 'All Time' }
        ],
        emotionalTones: [
          { value: 'positive', label: 'Positive' },
          { value: 'negative', label: 'Negative' },
          { value: 'neutral', label: 'Neutral' },
          { value: 'controversial', label: 'Controversial' }
        ],
        engagementLevels: [
          { value: 'high', label: 'High Engagement' },
          { value: 'medium', label: 'Medium Engagement' },
          { value: 'low', label: 'Low Engagement' }
        ],
        userRiskLevels: [
          { value: 'high', label: 'High Risk Users' },
          { value: 'medium', label: 'Medium Risk Users' },
          { value: 'low', label: 'Low Risk Users' }
        ],
        psychologicalTags: psychologicalTags.map((tag: string) => ({
          value: tag,
          label: tag.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        })),
        availableUsers: recentUsers.map(user => ({
          id: user.id,
          username: user.username
        }))
      }
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    return NextResponse.json({ error: 'Failed to get filter options' }, { status: 500 });
  }
}

// Get filter usage analytics for user
async function getFilterAnalytics(userId: string) {
  try {
    const activities = await db.userActivity.findMany({
      where: {
        userId,
        activityType: 'CONTENT_FILTER_USAGE'
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    const filterUsage = activities.reduce((acc, activity) => {
      const filters = (activity.details as any).filters || {};
      
      Object.keys(filters).forEach(filterType => {
        if (filters[filterType]) {
          acc[filterType] = (acc[filterType] || 0) + 1;
        }
      });
      
      return acc;
    }, {} as Record<string, number>);

    const mostUsedFilters = Object.entries(filterUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([filter, count]) => ({ filter, count }));

    // Analyze filter effectiveness
    const effectiveness = await analyzeUserFilterEffectiveness(userId);

    return NextResponse.json({
      success: true,
      analytics: {
        totalFilterUsage: activities.length,
        mostUsedFilters,
        filterEffectiveness: effectiveness,
        usageTimeline: getUsageTimeline(activities)
      }
    });
  } catch (error) {
    console.error('Get filter analytics error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}

// Helper functions
async function saveFilterPreset(userId: string, name: string, filters: ContentFilters) {
  try {
    await db.userFilterPreset.create({
      data: {
        userId,
        name,
        filters: filters as any,
        usageCount: 0
      }
    });
  } catch (error) {
    console.error('Save filter preset error:', error);
  }
}

async function getContentTypeCount(type: string): Promise<number> {
  try {
    switch (type) {
      case 'CHAT_MESSAGE':
        return await db.message.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
            }
          }
        });
      case 'TRUTH_ANSWER':
        return await db.truthAnswer.count({
          where: {
            timestamp: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        });
      case 'DROPZONE_SECRET':
        return await db.dropSecret.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        });
      default:
        return 0;
    }
  } catch (error) {
    console.error('Get content type count error:', error);
    return 0;
  }
}

function analyzeFilterEffectiveness(rawContent: any[], filteredContent: any[], filters: ContentFilters) {
  const reduction = ((rawContent.length - filteredContent.length) / rawContent.length) * 100;
  
  return {
    reductionPercentage: Math.round(reduction * 100) / 100,
    originalCount: rawContent.length,
    filteredCount: filteredContent.length,
    removedCount: rawContent.length - filteredContent.length,
    filtersApplied: Object.keys(filters).filter(key => 
      filters[key as keyof ContentFilters] !== undefined && 
      filters[key as keyof ContentFilters] !== null
    ).length
  };
}

async function getAdminOverridesForUser(userId: string, content: any[]) {
  try {
    const contentIds = content.map(item => item.id);
    
    const overrides = await db.adminContentControl.findMany({
      where: {
        contentId: { in: contentIds },
        isActive: true,
        targetAudience: { has: userId }
      }
    });

    return overrides;
  } catch (error) {
    console.error('Get admin overrides error:', error);
    return [];
  }
}

function getFilterMatches(item: any, filters: ContentFilters): string[] {
  const matches: string[] = [];

  if (filters.contentTypes?.includes(item.type)) {
    matches.push('contentType');
  }

  if (filters.emotionalTone) {
    // Simplified emotional matching
    const content = item.content.toLowerCase();
    const emotionalWords = {
      positive: ['happy', 'joy', 'love', 'great'],
      negative: ['sad', 'angry', 'hate', 'terrible'],
      controversial: ['debate', 'argue', 'controversial']
    };

    const words = emotionalWords[filters.emotionalTone as keyof typeof emotionalWords];
    if (words && words.some(word => content.includes(word))) {
      matches.push('emotionalTone');
    }
  }

  if (filters.psychologicalTargets?.some(tag => 
    item.psychologicalTags?.includes(tag)
  )) {
    matches.push('psychologicalTarget');
  }

  return matches;
}

async function analyzeUserFilterEffectiveness(userId: string) {
  // Analyze how effective user's filters are at finding engaging content
  try {
    const recentDeliveries = await db.contentDeliveryLog.findMany({
      where: { userId },
      orderBy: { deliveredAt: 'desc' },
      take: 10
    });

    if (recentDeliveries.length === 0) {
      return { score: 0, analysis: 'No recent filter usage' };
    }

    // Calculate average effectiveness
    const totalDelivered = recentDeliveries.reduce((sum, log) => 
      sum + ((log.metadata as any)?.delivered || 0), 0
    );

    const totalAvailable = recentDeliveries.reduce((sum, log) => 
      sum + ((log.metadata as any)?.totalAvailable || 0), 0
    );

    const efficiency = totalAvailable > 0 ? (totalDelivered / totalAvailable) : 0;

    return {
      score: Math.round(efficiency * 100),
      analysis: efficiency > 0.5 ? 'Highly effective filtering' : 
                efficiency > 0.2 ? 'Moderately effective filtering' : 
                'Low filter effectiveness',
      deliveredContent: totalDelivered,
      availableContent: totalAvailable
    };
  } catch (error) {
    console.error('Analyze filter effectiveness error:', error);
    return { score: 0, analysis: 'Analysis unavailable' };
  }
}

function getUsageTimeline(activities: any[]) {
  const timeline = activities.slice(0, 30).map(activity => ({
    date: activity.timestamp,
    filters: Object.keys((activity.details as any).filters || {}).length
  }));

  return timeline.reverse(); // Chronological order
}
