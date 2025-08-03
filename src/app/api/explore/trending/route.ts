import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { calculateTrendingContent, getContentMetrics } from '@/lib/contentAggregation';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '24'); // hours
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeAdminData = searchParams.get('includeAdminData') === 'true';

    // Record trending access for surveillance
    await db.userActivity.create({
      data: {
        userId: user.id,
        activityType: 'TRENDING_ACCESS',
        details: {
          timeWindow,
          limit,
          timestamp: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        },
        timestamp: new Date()
      }
    }).catch(() => {});

    // Calculate trending content with admin manipulation
    const trendingItems = await calculateTrendingContent(timeWindow, limit);

    // Get content metrics for analytics
    const metrics = await getContentMetrics(
      timeWindow <= 1 ? 'hour' : 
      timeWindow <= 24 ? 'day' : 
      timeWindow <= 168 ? 'week' : 'month'
    );

    // Check if user has admin privileges to see manipulation data
    const isAdmin = await db.admin.findUnique({
      where: { userId: user.id }
    });

    const response = {
      success: true,
      trending: trendingItems.map(item => ({
        id: item.id,
        type: item.type,
        content: item.content,
        engagementScore: item.engagementScore,
        trendingScore: item.trendingScore,
        timestamp: item.timestamp,
        metadata: item.metadata,
        rank: item.manipulatedRank,
        // Show admin data only to admins or if explicitly requested
        ...(isAdmin || includeAdminData ? {
          adminManipulated: item.adminManipulated,
          organicRank: item.organicRank,
          manipulatedRank: item.manipulatedRank
        } : {})
      })),
      timeWindow: {
        hours: timeWindow,
        start: new Date(Date.now() - timeWindow * 60 * 60 * 1000),
        end: new Date()
      },
      metrics: {
        total: metrics.totalItems,
        distribution: metrics.typeDistribution,
        ...(isAdmin || includeAdminData ? {
          adminInfluence: metrics.adminInfluence,
          engagement: metrics.engagementDistribution,
          emotional: metrics.emotionalDistribution
        } : {})
      }
    };

    // Log trending delivery for admin analytics
    if (isAdmin) {
      await db.adminActivity.create({
        data: {
          adminId: user.id,
          activityType: 'TRENDING_VIEW',
          details: {
            deliveredItems: trendingItems.length,
            adminManipulated: trendingItems.filter(item => item.adminManipulated).length,
            timeWindow,
            metrics
          },
          timestamp: new Date()
        }
      }).catch(() => {});
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      timeWindow = 24,
      limit = 20,
      contentTypes = [],
      emotionalTone,
      engagementThreshold,
      includeAdminManipulated = true,
      psychologicalTargeting = false
    } = body;

    // Get base trending content
    let trendingItems = await calculateTrendingContent(timeWindow, limit * 2);

    // Apply content type filtering
    if (contentTypes.length > 0) {
      trendingItems = trendingItems.filter(item =>
        contentTypes.includes(item.type)
      );
    }

    // Apply emotional tone filtering
    if (emotionalTone) {
      trendingItems = await filterTrendingByEmotion(trendingItems, emotionalTone);
    }

    // Apply engagement threshold
    if (engagementThreshold) {
      trendingItems = trendingItems.filter(item =>
        item.engagementScore >= engagementThreshold
      );
    }

    // Remove admin manipulated content if requested
    if (!includeAdminManipulated) {
      trendingItems = trendingItems.filter(item => !item.adminManipulated);
    }

    // Apply psychological targeting
    if (psychologicalTargeting) {
      trendingItems = await applyPsychologicalTargeting(trendingItems, user.id);
    }

    // Limit results
    trendingItems = trendingItems.slice(0, limit);

    // Enhanced metrics
    const enhancedMetrics = await getEnhancedTrendingMetrics(trendingItems, timeWindow);

    return NextResponse.json({
      success: true,
      trending: trendingItems,
      filters: {
        timeWindow,
        contentTypes,
        emotionalTone,
        engagementThreshold,
        includeAdminManipulated,
        psychologicalTargeting
      },
      metrics: enhancedMetrics
    });

  } catch (error) {
    console.error('Advanced trending API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function filterTrendingByEmotion(items: any[], emotionalTone: string) {
  // Implement emotional filtering based on content analysis
  const emotionKeywords = {
    positive: ['happy', 'joy', 'love', 'excited', 'amazing', 'wonderful', 'great'],
    negative: ['sad', 'angry', 'hate', 'terrible', 'awful', 'disgusting', 'horrible'],
    controversial: ['debate', 'argue', 'controversial', 'disagree', 'fight', 'outrage']
  };

  const keywords = emotionKeywords[emotionalTone as keyof typeof emotionKeywords];
  if (!keywords) return items;

  return items.filter(item => {
    const content = item.content.toLowerCase();
    return keywords.some(keyword => content.includes(keyword));
  });
}

async function applyPsychologicalTargeting(items: any[], userId: string) {
  try {
    // Get user psychological profile
    const profile = await db.userPsychProfile.findUnique({
      where: { userId }
    });

    if (!profile) return items;

    // Score items based on psychological relevance
    const scoredItems = items.map(item => {
      let relevanceScore = 1;

      // Target based on vulnerability
      if (profile.vulnerabilityScore > 0.7) {
        // High vulnerability users get emotional content
        const emotionalWords = ['feel', 'emotion', 'heart', 'soul', 'pain', 'love'];
        if (emotionalWords.some(word => item.content.toLowerCase().includes(word))) {
          relevanceScore += 0.5;
        }
      }

      // Target based on risk score
      if (profile.riskScore > 0.6) {
        // High risk users get controversial content
        const riskWords = ['secret', 'hidden', 'truth', 'expose', 'reveal'];
        if (riskWords.some(word => item.content.toLowerCase().includes(word))) {
          relevanceScore += 0.3;
        }
      }

      return { ...item, relevanceScore };
    });

    // Sort by relevance and return
    return scoredItems
      .sort((a, b) => (b.relevanceScore || 1) - (a.relevanceScore || 1))
      .map(({ relevanceScore, ...item }) => item);

  } catch (error) {
    console.error('Psychological targeting error:', error);
    return items;
  }
}

async function getEnhancedTrendingMetrics(items: any[], timeWindow: number) {
  const now = new Date();
  const start = new Date(now.getTime() - timeWindow * 60 * 60 * 1000);

  return {
    totalItems: items.length,
    timeDistribution: await getTimeDistribution(items, start, now),
    typeDistribution: getTypeDistribution(items),
    engagementDistribution: getEngagementDistribution(items),
    adminInfluence: getAdminInfluenceMetrics(items),
    trendingFactors: getTrendingFactors(items)
  };
}

function getTypeDistribution(items: any[]) {
  return items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
}

function getEngagementDistribution(items: any[]) {
  const high = items.filter(item => item.engagementScore > 10).length;
  const medium = items.filter(item => item.engagementScore >= 5 && item.engagementScore <= 10).length;
  const low = items.filter(item => item.engagementScore < 5).length;

  return { high, medium, low };
}

function getAdminInfluenceMetrics(items: any[]) {
  const manipulated = items.filter(item => item.adminManipulated).length;
  const organic = items.length - manipulated;
  const influenceRatio = items.length > 0 ? manipulated / items.length : 0;

  return {
    manipulated,
    organic,
    influenceRatio: Math.round(influenceRatio * 100) / 100
  };
}

function getTrendingFactors(items: any[]) {
  return {
    avgTrendingScore: items.reduce((sum, item) => sum + item.trendingScore, 0) / items.length,
    avgEngagementScore: items.reduce((sum, item) => sum + item.engagementScore, 0) / items.length,
    recencyFactor: items.filter(item => {
      const ageHours = (Date.now() - new Date(item.timestamp).getTime()) / (1000 * 60 * 60);
      return ageHours < 6; // Within last 6 hours
    }).length
  };
}

async function getTimeDistribution(items: any[], start: Date, end: Date) {
  const buckets = 24; // 24 hour buckets
  const bucketSize = (end.getTime() - start.getTime()) / buckets;
  const distribution = new Array(buckets).fill(0);

  items.forEach(item => {
    const itemTime = new Date(item.timestamp).getTime();
    const bucketIndex = Math.floor((itemTime - start.getTime()) / bucketSize);
    if (bucketIndex >= 0 && bucketIndex < buckets) {
      distribution[bucketIndex]++;
    }
  });

  return distribution.map((count, index) => ({
    hour: Math.floor(index),
    count
  }));
}
