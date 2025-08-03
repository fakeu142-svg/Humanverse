import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { 
  aggregateContentForFeed, 
  applyAdminManipulation, 
  rankContentForUser,
  FeedAlgorithmConfig 
} from '@/lib/feedAlgorithm';
import { filterContent, ContentFilters } from '@/lib/contentAggregation';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      limit = 20,
      offset = 0,
      filters = {},
      algorithmConfig,
      includeAdminManipulation = true
    } = body;

    // Record user feed access for surveillance
    await db.userActivity.create({
      data: {
        userId: user.id,
        activityType: 'EXPLORE_FEED_ACCESS',
        details: {
          limit,
          offset,
          filters,
          timestamp: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        },
        timestamp: new Date()
      }
    }).catch(() => {}); // Don't fail if logging fails

    // Aggregate content from all sources
    const rawContent = await aggregateContentForFeed(
      user.id,
      limit * 2, // Get more to account for filtering
      offset,
      filters
    );

    // Apply user-specified filters
    const contentFilters: ContentFilters = {
      contentTypes: filters.contentTypes,
      timeRange: filters.timeRange || 'week',
      emotionalTone: filters.emotionalTone,
      engagementLevel: filters.engagementLevel,
      userRiskLevel: filters.userRiskLevel,
      psychologicalTargets: filters.psychologicalTargets,
      excludeUsers: filters.excludeUsers,
      includeOnlyUsers: filters.includeOnlyUsers,
      adminOverrides: includeAdminManipulation
    };

    let filteredContent = await filterContent(rawContent, contentFilters, user.id);

    // Apply admin content manipulation
    if (includeAdminManipulation) {
      filteredContent = await applyAdminManipulation(filteredContent, user.id);
    }

    // Apply algorithm config if provided
    const config: FeedAlgorithmConfig = {
      baseEngagementWeight: algorithmConfig?.baseEngagementWeight || 1.0,
      controversyBonus: algorithmConfig?.controversyBonus || 0.3,
      recencyDecay: algorithmConfig?.recencyDecay || 0.1,
      adminBoostMultiplier: algorithmConfig?.adminBoostMultiplier || 5.0,
      suppressionThreshold: algorithmConfig?.suppressionThreshold || 0.2,
      psychologicalTargeting: algorithmConfig?.psychologicalTargeting !== false,
      narrativeControlActive: algorithmConfig?.narrativeControlActive !== false
    };

    // Rank content using advanced algorithm
    const rankedContent = await rankContentForUser(filteredContent, user.id, config);

    // Paginate results
    const paginatedContent = rankedContent.slice(offset, offset + limit);

    // Get user's psychological profile for admin surveillance
    let userProfile = null;
    try {
      const profile = await db.userPsychProfile.findUnique({
        where: { userId: user.id }
      });
      if (profile) {
        userProfile = {
          traits: profile.traits,
          vulnerabilityScore: profile.vulnerabilityScore,
          riskScore: profile.riskScore
        };
      }
    } catch (error) {
      // Profile might not exist yet
    }

    // Log content delivery for admin analytics
    await db.contentDeliveryLog.create({
      data: {
        userId: user.id,
        contentIds: paginatedContent.map(item => item.id),
        algorithmConfig: config,
        filters: contentFilters,
        deliveredAt: new Date(),
        metadata: {
          totalAvailable: filteredContent.length,
          delivered: paginatedContent.length,
          adminManipulated: paginatedContent.filter(item => item.isPromoted || item.isSuppressed).length,
          userProfile
        }
      }
    }).catch(() => {}); // Don't fail if logging fails

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
        // Don't expose admin manipulation to regular users
        ...(filters.showAdminData ? {
          adminBoost: item.adminBoost,
          suppressionLevel: item.suppressionLevel,
          isPromoted: item.isPromoted,
          isSuppressed: item.isSuppressed,
          psychologicalTags: item.psychologicalTags,
          emotionalWeight: item.emotionalWeight
        } : {})
      })),
      pagination: {
        limit,
        offset,
        hasMore: filteredContent.length > offset + limit,
        totalAvailable: filteredContent.length
      },
      metrics: {
        totalProcessed: rawContent.length,
        filtered: filteredContent.length,
        delivered: paginatedContent.length,
        adminInfluenced: paginatedContent.filter(item => item.isPromoted || item.isSuppressed).length
      }
    });

  } catch (error) {
    console.error('Explore feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET method for simple feed access
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const timeRange = searchParams.get('timeRange') || 'week';

    // Simple feed without complex filtering
    const rawContent = await aggregateContentForFeed(user.id, limit, offset, {
      timeRange
    });

    const rankedContent = await rankContentForUser(rawContent, user.id);
    
    return NextResponse.json({
      success: true,
      content: rankedContent.map(item => ({
        id: item.id,
        type: item.type,
        userId: item.userId,
        username: item.username,
        content: item.content,
        timestamp: item.timestamp,
        engagementScore: item.engagementScore,
        metadata: item.metadata
      })),
      pagination: {
        limit,
        offset,
        hasMore: rawContent.length === limit // Simple check
      }
    });

  } catch (error) {
    console.error('Simple explore feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
