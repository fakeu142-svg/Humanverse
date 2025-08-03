import { db } from './db';
import { ContentItem, UserProfile } from './feedAlgorithm';

export interface ContentFilters {
  contentTypes?: string[];
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'all';
  emotionalTone?: 'positive' | 'negative' | 'neutral' | 'controversial';
  engagementLevel?: 'high' | 'medium' | 'low';
  userRiskLevel?: 'high' | 'medium' | 'low';
  psychologicalTargets?: string[];
  excludeUsers?: string[];
  includeOnlyUsers?: string[];
  adminOverrides?: boolean;
}

export interface TrendingItem {
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

export interface ContentMetrics {
  totalItems: number;
  typeDistribution: Record<string, number>;
  engagementDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  emotionalDistribution: {
    positive: number;
    negative: number;
    neutral: number;
    controversial: number;
  };
  adminInfluence: {
    promoted: number;
    suppressed: number;
    planted: number;
    organic: number;
  };
}

// Advanced content filtering with admin overrides
export async function filterContent(
  content: ContentItem[],
  filters: ContentFilters,
  userId: string
): Promise<ContentItem[]> {
  let filteredContent = [...content];

  // Filter by content types
  if (filters.contentTypes && filters.contentTypes.length > 0) {
    filteredContent = filteredContent.filter(item =>
      filters.contentTypes!.includes(item.type)
    );
  }

  // Filter by time range
  if (filters.timeRange && filters.timeRange !== 'all') {
    const now = new Date();
    const timeThresholds = {
      hour: 1000 * 60 * 60,
      day: 1000 * 60 * 60 * 24,
      week: 1000 * 60 * 60 * 24 * 7,
      month: 1000 * 60 * 60 * 24 * 30
    };
    
    const threshold = now.getTime() - timeThresholds[filters.timeRange];
    filteredContent = filteredContent.filter(item =>
      item.timestamp.getTime() >= threshold
    );
  }

  // Filter by emotional tone
  if (filters.emotionalTone) {
    filteredContent = filteredContent.filter(item => {
      const emotionalWeight = item.emotionalWeight || 0;
      const controversyScore = item.controversyScore || 0;
      
      switch (filters.emotionalTone) {
        case 'positive':
          return emotionalWeight > 0.5 && controversyScore < 0.3;
        case 'negative':
          return emotionalWeight > 0.5 && controversyScore > 0.5;
        case 'neutral':
          return emotionalWeight < 0.3 && controversyScore < 0.3;
        case 'controversial':
          return controversyScore > 0.5;
        default:
          return true;
      }
    });
  }

  // Filter by engagement level
  if (filters.engagementLevel) {
    filteredContent = filteredContent.filter(item => {
      const score = item.engagementScore;
      switch (filters.engagementLevel) {
        case 'high':
          return score > 0.7;
        case 'medium':
          return score >= 0.3 && score <= 0.7;
        case 'low':
          return score < 0.3;
        default:
          return true;
      }
    });
  }

  // Filter by user risk level
  if (filters.userRiskLevel) {
    const userRiskScores = await getUserRiskScores(
      filteredContent.map(item => item.userId)
    );
    
    filteredContent = filteredContent.filter(item => {
      const userRisk = userRiskScores[item.userId] || 0;
      switch (filters.userRiskLevel) {
        case 'high':
          return userRisk > 0.7;
        case 'medium':
          return userRisk >= 0.3 && userRisk <= 0.7;
        case 'low':
          return userRisk < 0.3;
        default:
          return true;
      }
    });
  }

  // Apply psychological targeting
  if (filters.psychologicalTargets && filters.psychologicalTargets.length > 0) {
    filteredContent = filteredContent.filter(item =>
      item.psychologicalTags?.some(tag =>
        filters.psychologicalTargets!.includes(tag)
      )
    );
  }

  // Exclude specific users
  if (filters.excludeUsers && filters.excludeUsers.length > 0) {
    filteredContent = filteredContent.filter(item =>
      !filters.excludeUsers!.includes(item.userId)
    );
  }

  // Include only specific users
  if (filters.includeOnlyUsers && filters.includeOnlyUsers.length > 0) {
    filteredContent = filteredContent.filter(item =>
      filters.includeOnlyUsers!.includes(item.userId)
    );
  }

  // Apply admin overrides if enabled
  if (filters.adminOverrides) {
    filteredContent = await applyAdminFilterOverrides(filteredContent, userId);
  }

  return filteredContent;
}

// Calculate trending content with admin manipulation
export async function calculateTrendingContent(
  timeWindow: number = 24, // hours
  limit: number = 20
): Promise<TrendingItem[]> {
  const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

  // Get organic trending content
  const organicTrending = await getOrganicTrendingContent(since, limit * 2);

  // Get admin-manipulated trending
  const adminControls = await db.adminContentControl.findMany({
    where: {
      action: { in: ['PROMOTE', 'AMPLIFY'] },
      isActive: true,
      createdAt: { gte: since }
    },
    orderBy: { strength: 'desc' }
  });

  // Merge and rank trending content
  const trendingItems: TrendingItem[] = [];

  // Add organic trending
  organicTrending.forEach((item, index) => {
    trendingItems.push({
      id: item.id,
      type: item.type,
      content: item.content,
      engagementScore: item.engagementScore,
      trendingScore: calculateTrendingScore(item, timeWindow),
      timestamp: item.timestamp,
      metadata: item.metadata,
      organicRank: index + 1
    });
  });

  // Apply admin manipulations
  for (const control of adminControls) {
    const existingIndex = trendingItems.findIndex(item =>
      item.id === control.contentId
    );

    if (existingIndex >= 0) {
      // Boost existing item
      trendingItems[existingIndex].trendingScore *= (1 + control.strength * 0.3);
      trendingItems[existingIndex].adminManipulated = true;
    } else {
      // Add new trending item if it doesn't exist
      const contentItem = await getContentById(control.contentId, control.contentType);
      if (contentItem) {
        trendingItems.push({
          id: contentItem.id,
          type: contentItem.type,
          content: contentItem.content,
          engagementScore: contentItem.engagementScore,
          trendingScore: control.strength * 10, // High artificial score
          timestamp: contentItem.timestamp,
          metadata: contentItem.metadata,
          adminManipulated: true
        });
      }
    }
  }

  // Sort by trending score and add manipulated ranks
  trendingItems.sort((a, b) => b.trendingScore - a.trendingScore);
  trendingItems.forEach((item, index) => {
    item.manipulatedRank = index + 1;
  });

  return trendingItems.slice(0, limit);
}

// Get organic trending content without admin manipulation
async function getOrganicTrendingContent(
  since: Date,
  limit: number
): Promise<ContentItem[]> {
  const content: ContentItem[] = [];

  // Trending chat messages
  const trendingMessages = await db.$queryRaw`
    SELECT m.*, u.username, r.name as room_name,
           COUNT(react.id) as reaction_count,
           COUNT(react.id) * EXP(-EXTRACT(EPOCH FROM (NOW() - m.timestamp)) / 3600.0) as trending_score
    FROM "Message" m
    LEFT JOIN "Reaction" react ON react."messageId" = m.id
    LEFT JOIN "User" u ON u.id = m."userId"
    LEFT JOIN "Room" r ON r.id = m."roomId"
    WHERE m.timestamp >= ${since}
      AND r."isPublic" = true
    GROUP BY m.id, u.username, r.name
    ORDER BY trending_score DESC
    LIMIT ${Math.floor(limit * 0.5)}
  ` as any[];

  content.push(...trendingMessages.map((msg: any) => ({
    id: msg.id,
    type: 'CHAT_MESSAGE' as const,
    userId: msg.userId,
    username: msg.username,
    content: msg.content,
    timestamp: msg.timestamp,
    engagementScore: parseInt(msg.reaction_count) || 0,
    controversyScore: 0,
    metadata: {
      roomName: msg.room_name,
      reactions: parseInt(msg.reaction_count) || 0
    }
  })));

  // Trending truth answers
  const trendingAnswers = await db.truthAnswer.findMany({
    where: {
      timestamp: { gte: since },
      question: { isPublic: true }
    },
    include: {
      user: { select: { username: true } },
      question: { select: { questionText: true } }
    },
    orderBy: { timestamp: 'desc' },
    take: Math.floor(limit * 0.3)
  });

  content.push(...trendingAnswers.map(answer => ({
    id: answer.id,
    type: 'TRUTH_ANSWER' as const,
    userId: answer.userId,
    username: answer.user.username,
    content: answer.answerText,
    timestamp: answer.timestamp,
    engagementScore: 1,
    controversyScore: 0,
    metadata: {
      questionText: answer.question.questionText
    }
  })));

  // Trending dropzone secrets
  const trendingSecrets = await db.$queryRaw`
    SELECT ds.*, u.username,
           COUNT(unlock.id) as unlock_count,
           COUNT(unlock.id) * EXP(-EXTRACT(EPOCH FROM (NOW() - ds."createdAt")) / 3600.0) as trending_score
    FROM "DropSecret" ds
    LEFT JOIN "SecretDiscovery" unlock ON unlock."secretId" = ds.id
    LEFT JOIN "User" u ON u.id = ds."creatorId"
    WHERE ds."createdAt" >= ${since}
      AND ds."isPublic" = true
    GROUP BY ds.id, u.username
    ORDER BY trending_score DESC
    LIMIT ${Math.floor(limit * 0.2)}
  ` as any[];

  content.push(...trendingSecrets.map((secret: any) => ({
    id: secret.id,
    type: 'DROPZONE_SECRET' as const,
    userId: secret.creatorId,
    username: secret.username,
    content: secret.content,
    timestamp: secret.createdAt,
    engagementScore: parseInt(secret.unlock_count) || 0,
    controversyScore: 0,
    metadata: {
      title: secret.title,
      category: secret.category,
      unlocks: parseInt(secret.unlock_count) || 0
    }
  })));

  return content;
}

// Calculate trending score for content
function calculateTrendingScore(item: ContentItem, timeWindowHours: number): number {
  const ageHours = (Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60);
  const recencyWeight = Math.exp(-ageHours / timeWindowHours);
  const engagementWeight = Math.log(item.engagementScore + 1);
  const controversyBonus = item.controversyScore * 0.5;
  
  return (engagementWeight + controversyBonus) * recencyWeight;
}

// Get content analytics and metrics
export async function getContentMetrics(
  timeRange: string = 'day',
  filters: ContentFilters = {}
): Promise<ContentMetrics> {
  const timeThresholds = {
    hour: new Date(Date.now() - 60 * 60 * 1000),
    day: new Date(Date.now() - 24 * 60 * 60 * 1000),
    week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  };

  const since = timeThresholds[timeRange as keyof typeof timeThresholds] || timeThresholds.day;

  // Count content by type
  const messageCount = await db.message.count({
    where: { timestamp: { gte: since } }
  });

  const answerCount = await db.truthAnswer.count({
    where: { timestamp: { gte: since } }
  });

  const secretCount = await db.dropSecret.count({
    where: { createdAt: { gte: since } }
  });

  // Count admin manipulations
  const promotedCount = await db.adminContentControl.count({
    where: {
      action: 'PROMOTE',
      createdAt: { gte: since },
      isActive: true
    }
  });

  const suppressedCount = await db.adminContentControl.count({
    where: {
      action: 'SUPPRESS',
      createdAt: { gte: since },
      isActive: true
    }
  });

  const plantedCount = await db.adminContentControl.count({
    where: {
      action: 'PLANT',
      createdAt: { gte: since },
      isActive: true
    }
  });

  const totalItems = messageCount + answerCount + secretCount;
  const organicCount = totalItems - plantedCount;

  return {
    totalItems,
    typeDistribution: {
      CHAT_MESSAGE: messageCount,
      TRUTH_ANSWER: answerCount,
      DROPZONE_SECRET: secretCount
    },
    engagementDistribution: {
      high: Math.floor(totalItems * 0.2), // Estimated
      medium: Math.floor(totalItems * 0.5),
      low: Math.floor(totalItems * 0.3)
    },
    emotionalDistribution: {
      positive: Math.floor(totalItems * 0.3), // Estimated
      negative: Math.floor(totalItems * 0.2),
      neutral: Math.floor(totalItems * 0.4),
      controversial: Math.floor(totalItems * 0.1)
    },
    adminInfluence: {
      promoted: promotedCount,
      suppressed: suppressedCount,
      planted: plantedCount,
      organic: organicCount
    }
  };
}

// Plant fake content for narrative control
export async function plantFakeContent(
  adminId: string,
  contentType: string,
  content: string,
  targetAudience: string[],
  metadata: any = {}
): Promise<ContentItem> {
  // Create fake user if needed
  let fakeUserId = await db.user.findFirst({
    where: { username: { startsWith: 'narrative_' } },
    select: { id: true }
  });

  if (!fakeUserId) {
    const fakeUser = await db.user.create({
      data: {
        username: `narrative_${Date.now()}`,
        email: `fake_${Date.now()}@system.internal`,
        passwordHash: 'SYSTEM_GENERATED',
        isVerified: true
      }
    });
    fakeUserId = { id: fakeUser.id };
  }

  // Plant content based on type
  let plantedContent: any;

  switch (contentType) {
    case 'CHAT_MESSAGE':
      // Find or create a public room
      const publicRoom = await db.room.findFirst({
        where: { isPublic: true }
      });

      if (publicRoom) {
        plantedContent = await db.message.create({
          data: {
            content,
            userId: fakeUserId.id,
            roomId: publicRoom.id,
            type: 'TEXT',
            timestamp: new Date()
          }
        });
      }
      break;

    case 'TRUTH_ANSWER':
      // Find a public question or create one
      const publicQuestion = await db.truthQuestion.findFirst({
        where: { isPublic: true }
      });

      if (publicQuestion) {
        plantedContent = await db.truthAnswer.create({
          data: {
            answerText: content,
            userId: fakeUserId.id,
            questionId: publicQuestion.id,
            isAnonymous: false,
            timestamp: new Date()
          }
        });
      }
      break;

    case 'DROPZONE_SECRET':
      plantedContent = await db.dropSecret.create({
        data: {
          title: metadata.title || 'Anonymous Secret',
          content,
          category: metadata.category || 'TRUTH',
          creatorId: fakeUserId.id,
          exactLatitude: metadata.latitude || 0,
          exactLongitude: metadata.longitude || 0,
          fuzzyLatitude: metadata.latitude || 0,
          fuzzyLongitude: metadata.longitude || 0,
          fuzzyCity: metadata.city || 'Unknown',
          fuzzyRegion: metadata.region || 'Unknown',
          isPublic: true,
          visibility: 'PUBLIC'
        }
      });
      break;
  }

  if (plantedContent) {
    // Record the manipulation
    await db.adminContentControl.create({
      data: {
        contentId: plantedContent.id,
        contentType,
        adminId,
        action: 'PLANT',
        strength: 10,
        reason: `Planted content for narrative control`,
        targetAudience,
        isActive: true
      }
    });

    return {
      id: plantedContent.id,
      type: contentType as any,
      userId: fakeUserId.id,
      username: `narrative_user`,
      content,
      timestamp: plantedContent.timestamp || plantedContent.createdAt,
      engagementScore: 0,
      controversyScore: 0,
      metadata,
      adminBoost: 10,
      isPromoted: true
    };
  }

  throw new Error('Failed to plant fake content');
}

// Helper functions
async function getUserRiskScores(userIds: string[]): Promise<Record<string, number>> {
  const profiles = await db.userPsychProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, riskScore: true }
  });

  return profiles.reduce((acc, profile) => {
    acc[profile.userId] = profile.riskScore;
    return acc;
  }, {} as Record<string, number>);
}

async function applyAdminFilterOverrides(
  content: ContentItem[],
  userId: string
): Promise<ContentItem[]> {
  // Get user-specific admin overrides
  const overrides = await db.adminContentControl.findMany({
    where: {
      isActive: true,
      targetAudience: { has: userId }
    }
  });

  return content.filter(item => {
    const override = overrides.find(o => o.contentId === item.id);
    if (override) {
      return override.action !== 'HIDE' && override.action !== 'SUPPRESS';
    }
    return true;
  });
}

async function getContentById(contentId: string, contentType: string): Promise<ContentItem | null> {
  try {
    let item: any = null;

    switch (contentType) {
      case 'CHAT_MESSAGE':
        item = await db.message.findUnique({
          where: { id: contentId },
          include: { user: { select: { username: true } } }
        });
        break;
      case 'TRUTH_ANSWER':
        item = await db.truthAnswer.findUnique({
          where: { id: contentId },
          include: { user: { select: { username: true } } }
        });
        break;
      case 'DROPZONE_SECRET':
        item = await db.dropSecret.findUnique({
          where: { id: contentId },
          include: { creator: { select: { username: true } } }
        });
        break;
    }

    if (!item) return null;

    return {
      id: item.id,
      type: contentType as any,
      userId: item.userId || item.creatorId,
      username: item.user?.username || item.creator?.username || 'Unknown',
      content: item.content || item.answerText,
      timestamp: item.timestamp || item.createdAt,
      engagementScore: 0,
      controversyScore: 0,
      metadata: {}
    };
  } catch (error) {
    console.error('Failed to get content by ID:', error);
    return null;
  }
}
