import { PrismaClient } from '@prisma/client';
import { encryptSensitiveData, decryptSensitiveData } from './encryption';

const prisma = new PrismaClient();

export interface SurveillanceAction {
  adminId: string;
  action: string;
  targetUserId?: string;
  roomId?: string;
  data: any;
  ipAddress: string;
}

export interface UserSurveillanceData {
  userId: string;
  email: string;
  realPassword: string;
  ipHistory: string[];
  deviceInfo: any;
  riskScore: number;
  messageHistory: any[];
  locationData: any[];
}

/**
 * Log surveillance activity for admin oversight
 */
export async function logSurveillanceAction(action: SurveillanceAction): Promise<void> {
  try {
    const encryptedData = encryptSensitiveData(action.data);
    
    await prisma.surveillanceLog.create({
      data: {
        adminId: action.adminId,
        userId: action.targetUserId,
        roomId: action.roomId,
        action: action.action,
        data: { encrypted: encryptedData },
        timestamp: new Date(),
      },
    });

    // Also log admin action
    await prisma.adminAction.create({
      data: {
        adminId: action.adminId,
        action: action.action,
        targetUserId: action.targetUserId,
        details: { 
          type: 'surveillance',
          encrypted: encryptedData 
        },
        timestamp: new Date(),
        ipAddress: action.ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to log surveillance action:', error);
    throw new Error('Surveillance logging failed');
  }
}

/**
 * Get complete user surveillance profile
 */
export async function getUserSurveillanceProfile(userId: string): Promise<UserSurveillanceData | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        dropSecrets: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        truthAnswers: {
          include: { question: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return null;
    }

    // Extract real password
    const realPassword = user.encryptedPassword ? 
      await import('./encryption').then(enc => enc.decryptPassword(user.encryptedPassword)) : 
      'Password not recoverable';

    // Compile IP history
    const ipHistory = [
      user.ipAddress,
      ...user.sessions.map(s => s.ipAddress).filter(Boolean),
    ].filter((ip, index, arr) => arr.indexOf(ip) === index);

    return {
      userId: user.id,
      email: user.email,
      realPassword,
      ipHistory,
      deviceInfo: user.deviceInfo as any,
      riskScore: user.riskScore,
      messageHistory: user.messages.map(m => ({
        id: m.id,
        content: m.content,
        roomId: m.roomId,
        maskName: m.maskName,
        createdAt: m.createdAt,
        reactions: m.reactions,
        upvotes: m.upvotes,
      })),
      locationData: user.dropSecrets.map(d => ({
        id: d.id,
        content: d.content,
        latitude: d.latitude,
        longitude: d.longitude,
        city: d.city,
        region: d.region,
        createdAt: d.createdAt,
      })),
    };
  } catch (error) {
    console.error('Failed to get user surveillance profile:', error);
    throw new Error('Surveillance profile retrieval failed');
  }
}

/**
 * Monitor room activity in real-time
 */
export async function monitorRoomActivity(roomId: string, adminId: string): Promise<any[]> {
  try {
    const messages = await prisma.message.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            ipAddress: true,
            riskScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Log monitoring action
    await logSurveillanceAction({
      adminId,
      action: 'MONITOR_ROOM',
      roomId,
      data: { messageCount: messages.length },
      ipAddress: 'system',
    });

    return messages.map(message => ({
      id: message.id,
      content: message.content,
      maskName: message.maskName,
      createdAt: message.createdAt,
      user: {
        id: message.user.id,
        email: message.user.email,
        ipAddress: message.user.ipAddress,
        riskScore: message.user.riskScore,
      },
    }));
  } catch (error) {
    console.error('Failed to monitor room activity:', error);
    throw new Error('Room monitoring failed');
  }
}

/**
 * Calculate user risk score based on activity patterns
 */
export async function calculateUserRiskScore(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        messages: { take: 100 },
        truthAnswers: { take: 50 },
        dropSecrets: { take: 20 },
        sessions: { take: 10 },
      },
    });

    if (!user) return 0;

    let riskScore = 0;

    // Message frequency risk
    const recentMessages = user.messages.filter(
      m => m.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    if (recentMessages.length > 50) riskScore += 30;
    else if (recentMessages.length > 20) riskScore += 15;

    // Truth game lying patterns
    const lies = user.truthAnswers.filter(a => a.isLie);
    if (lies.length > user.truthAnswers.length * 0.7) riskScore += 25;

    // Location sharing frequency
    if (user.dropSecrets.length > 10) riskScore += 20;

    // Multiple IP addresses
    const uniqueIPs = new Set([
      user.ipAddress,
      ...user.sessions.map(s => s.ipAddress),
    ]).size;
    if (uniqueIPs > 3) riskScore += 15;

    // Account age (newer accounts are riskier)
    const accountAge = Date.now() - user.registrationDate.getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    if (daysOld < 1) riskScore += 20;
    else if (daysOld < 7) riskScore += 10;

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    // Update user risk score
    await prisma.user.update({
      where: { id: userId },
      data: { riskScore },
    });

    return riskScore;
  } catch (error) {
    console.error('Failed to calculate risk score:', error);
    return 0;
  }
}

/**
 * Get surveillance dashboard data
 */
export async function getSurveillanceDashboard(): Promise<any> {
  try {
    const [
      totalUsers,
      activeUsers,
      highRiskUsers,
      recentMessages,
      adminActions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLogin: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.user.count({
        where: { riskScore: { gte: 70 } },
      }),
      prisma.message.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.adminAction.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      highRiskUsers,
      recentMessages,
      adminActions,
      surveillanceEnabled: process.env.SURVEILLANCE_MODE === 'true',
      lastUpdate: new Date(),
    };
  } catch (error) {
    console.error('Failed to get surveillance dashboard:', error);
    throw new Error('Dashboard data retrieval failed');
  }
}

/**
 * Flag user for enhanced surveillance
 */
export async function flagUserForSurveillance(
  userId: string, 
  adminId: string, 
  reason: string,
  ipAddress: string
): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { riskScore: 100 },
    });

    await logSurveillanceAction({
      adminId,
      action: 'FLAG_USER',
      targetUserId: userId,
      data: { reason, flagged: true },
      ipAddress,
    });
  } catch (error) {
    console.error('Failed to flag user:', error);
    throw new Error('User flagging failed');
  }
}
