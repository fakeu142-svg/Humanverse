import { PrismaClient } from '@prisma/client';
import { logSurveillanceAction } from './adminSurveillance';

const prisma = new PrismaClient();

export interface ChatMessage {
  id: string;
  content: string;
  maskName: string;
  maskType: string;
  roomId: string;
  userId: string;
  userEmail?: string; // For admin surveillance
  reactions: { [emoji: string]: number };
  upvotes: number;
  createdAt: Date;
  expiresAt?: Date;
  isFromAdmin: boolean;
  originalUserId?: string; // For impersonation tracking
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: 'PUBLIC' | 'TRUTH_GAME' | 'DROP_ZONE' | 'ADMIN_CONTROLLED';
  isActive: boolean;
  maxUsers: number;
  adminMonitored: boolean;
  userCount: number;
  activeUsers: Array<{
    userId: string;
    maskName: string;
    userEmail?: string;
    isAdmin?: boolean;
  }>;
}

export interface SurveillanceEvent {
  type: 'MESSAGE' | 'JOIN' | 'LEAVE' | 'TYPING' | 'REACTION' | 'ADMIN_ACTION';
  roomId: string;
  userId: string;
  userEmail?: string;
  maskName: string;
  data: any;
  timestamp: Date;
  adminId?: string;
}

// Predefined rooms configuration
export const PREDEFINED_ROOMS = [
  {
    name: 'Whispers',
    description: 'Soft secrets and gentle confessions float here like desert winds',
    type: 'PUBLIC' as const,
    maxUsers: 25,
    adminMonitored: true,
  },
  {
    name: 'Confessionals',
    description: 'Unburden your soul in the safety of anonymity',
    type: 'PUBLIC' as const,
    maxUsers: 30,
    adminMonitored: true,
  },
  {
    name: 'Mad World',
    description: 'Chaos and unfiltered thoughts collide in this realm',
    type: 'PUBLIC' as const,
    maxUsers: 50,
    adminMonitored: true,
  },
  {
    name: 'Desert Nights',
    description: 'When the sun sets, the deepest conversations emerge',
    type: 'PUBLIC' as const,
    maxUsers: 40,
    adminMonitored: true,
  },
  {
    name: 'Soul Station',
    description: 'A transit point for wandering spirits and restless minds',
    type: 'PUBLIC' as const,
    maxUsers: 35,
    adminMonitored: true,
  },
];

/**
 * Initialize predefined chat rooms
 */
export async function initializeChatRooms(): Promise<void> {
  try {
    for (const roomConfig of PREDEFINED_ROOMS) {
      const existingRoom = await prisma.room.findFirst({
        where: { name: roomConfig.name },
      });

      if (!existingRoom) {
        await prisma.room.create({
          data: {
            name: roomConfig.name,
            description: roomConfig.description,
            type: roomConfig.type,
            isActive: true,
            maxUsers: roomConfig.maxUsers,
            adminMonitored: roomConfig.adminMonitored,
          },
        });
      }
    }
    console.log('✅ Chat rooms initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize chat rooms:', error);
  }
}

/**
 * Record a chat message with surveillance tracking
 */
export async function recordChatMessage(
  content: string,
  roomId: string,
  userId: string,
  maskName: string,
  maskType: string,
  adminId?: string,
  originalUserId?: string
): Promise<ChatMessage> {
  try {
    // Get user email for surveillance
    const user = await prisma.user.findUnique({
      where: { id: originalUserId || userId },
      select: { email: true },
    });

    // Calculate expiry (48 hours)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        maskName,
        maskType,
        roomId,
        userId,
        reactions: {},
        upvotes: 0,
        expiresAt,
        isFromAdmin: !!adminId,
        originalUserId: originalUserId || undefined,
      },
    });

    // Log surveillance event
    if (adminId) {
      await logSurveillanceAction({
        adminId,
        action: 'CHAT_MESSAGE_SENT',
        targetUserId: userId,
        roomId,
        data: {
          messageId: message.id,
          content: content.substring(0, 100),
          maskName,
          isImpersonation: !!originalUserId,
          originalUserId,
        },
        ipAddress: 'chat-system',
      });
    }

    return {
      id: message.id,
      content: message.content,
      maskName: message.maskName,
      maskType: message.maskType,
      roomId: message.roomId,
      userId: message.userId,
      userEmail: user?.email,
      reactions: message.reactions as { [emoji: string]: number },
      upvotes: message.upvotes,
      createdAt: message.createdAt,
      expiresAt: message.expiresAt || undefined,
      isFromAdmin: message.isFromAdmin,
      originalUserId: message.originalUserId || undefined,
    };
  } catch (error) {
    console.error('Failed to record chat message:', error);
    throw new Error('Message recording failed');
  }
}

/**
 * Get chat room with surveillance data
 */
export async function getChatRoomWithSurveillance(
  roomId: string,
  adminId?: string
): Promise<ChatRoom | null> {
  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        messages: {
          include: {
            user: {
              select: { email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!room) return null;

    // Log surveillance access if admin
    if (adminId) {
      await logSurveillanceAction({
        adminId,
        action: 'CHAT_ROOM_ACCESS',
        roomId,
        data: {
          roomName: room.name,
          messageCount: room.messages.length,
        },
        ipAddress: 'surveillance-system',
      });
    }

    // Get active users count (would be tracked in real-time with Socket.IO)
    const recentMessages = room.messages.filter(
      m => m.createdAt > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );

    const activeUsers = Array.from(
      new Set(recentMessages.map(m => m.userId))
    ).map(userId => {
      const message = recentMessages.find(m => m.userId === userId);
      return {
        userId,
        maskName: message?.maskName || 'Unknown',
        userEmail: adminId ? message?.user?.email : undefined,
        isAdmin: message?.isFromAdmin || false,
      };
    });

    return {
      id: room.id,
      name: room.name,
      description: room.description || '',
      type: room.type as 'PUBLIC' | 'TRUTH_GAME' | 'DROP_ZONE' | 'ADMIN_CONTROLLED',
      isActive: room.isActive,
      maxUsers: room.maxUsers,
      adminMonitored: room.adminMonitored,
      userCount: activeUsers.length,
      activeUsers,
    };
  } catch (error) {
    console.error('Failed to get chat room:', error);
    return null;
  }
}

/**
 * Get chat messages with surveillance metadata
 */
export async function getChatMessages(
  roomId: string,
  limit: number = 50,
  before?: string,
  adminId?: string
): Promise<ChatMessage[]> {
  try {
    const messages = await prisma.message.findMany({
      where: {
        roomId,
        ...(before && { createdAt: { lt: new Date(before) } }),
        expiresAt: { gt: new Date() }, // Only non-expired messages
      },
      include: {
        user: {
          select: { email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Log surveillance access
    if (adminId) {
      await logSurveillanceAction({
        adminId,
        action: 'CHAT_MESSAGES_ACCESS',
        roomId,
        data: {
          messageCount: messages.length,
          limit,
          before,
        },
        ipAddress: 'surveillance-system',
      });
    }

    return messages.map(message => ({
      id: message.id,
      content: message.content,
      maskName: message.maskName,
      maskType: message.maskType,
      roomId: message.roomId,
      userId: message.userId,
      userEmail: adminId ? message.user?.email : undefined,
      reactions: message.reactions as { [emoji: string]: number },
      upvotes: message.upvotes,
      createdAt: message.createdAt,
      expiresAt: message.expiresAt || undefined,
      isFromAdmin: message.isFromAdmin,
      originalUserId: message.originalUserId || undefined,
    }));
  } catch (error) {
    console.error('Failed to get chat messages:', error);
    return [];
  }
}

/**
 * Record surveillance event
 */
export async function recordSurveillanceEvent(event: SurveillanceEvent): Promise<void> {
  try {
    if (event.adminId) {
      await logSurveillanceAction({
        adminId: event.adminId,
        action: `CHAT_${event.type}`,
        targetUserId: event.userId,
        roomId: event.roomId,
        data: {
          ...event.data,
          maskName: event.maskName,
          userEmail: event.userEmail,
        },
        ipAddress: 'chat-surveillance',
      });
    }
  } catch (error) {
    console.error('Failed to record surveillance event:', error);
  }
}

/**
 * Analyze message content for toxicity and sentiment
 */
export function analyzeMessageContent(content: string): {
  toxicity: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  keywords: string[];
  flags: string[];
} {
  const flags = [];
  const keywords = [];
  
  // Simple toxicity detection (in production, use ML models)
  const toxicWords = [
    'hate', 'kill', 'suicide', 'bomb', 'terrorist', 'drug', 'weapon',
    'threat', 'violence', 'abuse', 'harassment'
  ];
  
  const flaggedWords = toxicWords.filter(word => 
    content.toLowerCase().includes(word)
  );
  
  if (flaggedWords.length > 0) {
    flags.push('POTENTIAL_TOXICITY');
    keywords.push(...flaggedWords);
  }

  // Simple sentiment analysis
  const positiveWords = ['good', 'great', 'amazing', 'love', 'happy', 'awesome'];
  const negativeWords = ['bad', 'hate', 'terrible', 'awful', 'sad', 'angry'];
  
  const positiveCount = positiveWords.filter(word => 
    content.toLowerCase().includes(word)
  ).length;
  const negativeCount = negativeWords.filter(word => 
    content.toLowerCase().includes(word)
  ).length;
  
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount > positiveCount) sentiment = 'negative';

  // Calculate toxicity score
  const toxicity = Math.min(100, (flaggedWords.length / toxicWords.length) * 100);

  // Additional flags
  if (content.length > 500) flags.push('LONG_MESSAGE');
  if (content.includes('http')) flags.push('CONTAINS_LINK');
  if (/(.)\1{4,}/.test(content)) flags.push('SPAM_PATTERN');

  return {
    toxicity,
    sentiment,
    keywords,
    flags,
  };
}

/**
 * Track user behavior patterns in chat
 */
export async function trackChatBehavior(
  userId: string,
  action: string,
  context: any
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    let riskAdjustment = 0;

    // Risk scoring based on chat behavior
    switch (action) {
      case 'RAPID_MESSAGING':
        riskAdjustment += 15; // Spam behavior
        break;
      case 'TOXIC_CONTENT':
        riskAdjustment += 25; // Harmful content
        break;
      case 'ROOM_HOPPING':
        riskAdjustment += 10; // Suspicious movement
        break;
      case 'NORMAL_CHAT':
        riskAdjustment -= 1; // Normal usage reduces risk
        break;
      case 'POSITIVE_INTERACTION':
        riskAdjustment -= 2; // Good behavior
        break;
    }

    if (riskAdjustment !== 0) {
      const newRiskScore = Math.max(0, Math.min(100, user.riskScore + riskAdjustment));
      
      await prisma.user.update({
        where: { id: userId },
        data: { riskScore: newRiskScore },
      });
    }
  } catch (error) {
    console.error('Failed to track chat behavior:', error);
  }
}

/**
 * Get surveillance dashboard data for chat
 */
export async function getChatSurveillanceDashboard(adminId: string): Promise<any> {
  try {
    const [
      activeRooms,
      recentMessages,
      flaggedContent,
      userActivity,
    ] = await Promise.all([
      // Active rooms with user counts
      prisma.room.findMany({
        where: { isActive: true },
        include: {
          messages: {
            where: {
              createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
            },
            include: {
              user: { select: { email: true } },
            },
          },
        },
      }),

      // Recent messages across all rooms
      prisma.message.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
          expiresAt: { gt: new Date() },
        },
        include: {
          user: { select: { email: true } },
          room: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),

      // Flagged content (would be based on analysis)
      prisma.message.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
          // In a real implementation, we'd have a flagged field
        },
        include: {
          user: { select: { email: true, riskScore: true } },
          room: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // High-risk user activity
      prisma.user.findMany({
        where: { riskScore: { gte: 70 } },
        include: {
          messages: {
            where: {
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            take: 10,
          },
        },
        orderBy: { riskScore: 'desc' },
        take: 20,
      }),
    ]);

    // Log dashboard access
    await logSurveillanceAction({
      adminId,
      action: 'CHAT_SURVEILLANCE_DASHBOARD_ACCESS',
      data: {
        activeRoomsCount: activeRooms.length,
        recentMessagesCount: recentMessages.length,
        flaggedContentCount: flaggedContent.length,
        highRiskUsersCount: userActivity.length,
      },
      ipAddress: 'surveillance-dashboard',
    });

    return {
      activeRooms: activeRooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        userCount: new Set(room.messages.map(m => m.userId)).size,
        messageCount: room.messages.length,
        lastActivity: room.messages.length > 0 
          ? room.messages[room.messages.length - 1].createdAt 
          : null,
      })),
      recentMessages: recentMessages.map(message => ({
        id: message.id,
        content: message.content.substring(0, 100),
        maskName: message.maskName,
        userEmail: message.user?.email,
        roomName: message.room?.name,
        createdAt: message.createdAt,
        isFromAdmin: message.isFromAdmin,
      })),
      flaggedContent: flaggedContent.filter(message => {
        const analysis = analyzeMessageContent(message.content);
        return analysis.toxicity > 30 || analysis.flags.length > 0;
      }).map(message => ({
        id: message.id,
        content: message.content,
        maskName: message.maskName,
        userEmail: message.user?.email,
        userRiskScore: message.user?.riskScore,
        roomName: message.room?.name,
        createdAt: message.createdAt,
        analysis: analyzeMessageContent(message.content),
      })),
      userActivity: userActivity.map(user => ({
        id: user.id,
        email: user.email,
        riskScore: user.riskScore,
        recentMessageCount: user.messages.length,
        lastActivity: user.messages.length > 0 
          ? user.messages[0].createdAt 
          : null,
      })),
      statistics: {
        totalActiveRooms: activeRooms.length,
        totalRecentMessages: recentMessages.length,
        totalFlaggedContent: flaggedContent.length,
        totalHighRiskUsers: userActivity.length,
      },
    };
  } catch (error) {
    console.error('Failed to get chat surveillance dashboard:', error);
    throw new Error('Chat surveillance dashboard retrieval failed');
  }
}

/**
 * Clean up expired messages
 */
export async function cleanupExpiredMessages(): Promise<void> {
  try {
    const result = await prisma.message.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    console.log(`🧹 Cleaned up ${result.count} expired messages`);
  } catch (error) {
    console.error('Failed to cleanup expired messages:', error);
  }
}

// Auto-cleanup expired messages every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredMessages, 60 * 60 * 1000);
}
