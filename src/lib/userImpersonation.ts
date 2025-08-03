import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { logSurveillanceAction } from './adminSurveillance';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

export interface ImpersonationSession {
  adminId: string;
  targetUserId: string;
  sessionToken: string;
  ipAddress: string;
  reason: string;
  expiresAt: Date;
}

/**
 * Create an impersonation session for admin to act as user
 */
export async function createImpersonationSession(
  adminId: string,
  targetUserId: string,
  reason: string,
  ipAddress: string,
  durationMinutes: number = 30
): Promise<ImpersonationSession> {
  try {
    // Verify admin permissions
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin || !admin.isActive) {
      throw new Error('Admin not authorized for impersonation');
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    // Create impersonation token
    const sessionToken = jwt.sign(
      {
        adminId,
        targetUserId,
        type: 'impersonation',
        reason,
        exp: Math.floor(expiresAt.getTime() / 1000),
      },
      JWT_SECRET
    );

    // Create session record
    await prisma.userSession.create({
      data: {
        userId: targetUserId,
        token: sessionToken,
        ipAddress,
        deviceInfo: { impersonation: true, adminId, reason },
        createdAt: new Date(),
        expiresAt,
        isAdminSession: true,
      },
    });

    // Log the impersonation
    await logSurveillanceAction({
      adminId,
      action: 'START_IMPERSONATION',
      targetUserId,
      data: {
        reason,
        duration: durationMinutes,
        sessionToken: sessionToken.substring(0, 20) + '...',
      },
      ipAddress,
    });

    return {
      adminId,
      targetUserId,
      sessionToken,
      ipAddress,
      reason,
      expiresAt,
    };
  } catch (error) {
    console.error('Failed to create impersonation session:', error);
    throw new Error('Impersonation session creation failed');
  }
}

/**
 * Verify and get impersonation session details
 */
export async function verifyImpersonationToken(token: string): Promise<any | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'impersonation') {
      return null;
    }

    // Check if session still exists and is valid
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return {
      adminId: decoded.adminId,
      targetUserId: decoded.targetUserId,
      reason: decoded.reason,
      user: session.user,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Failed to verify impersonation token:', error);
    return null;
  }
}

/**
 * Send message as impersonated user
 */
export async function sendMessageAsUser(
  impersonationToken: string,
  roomId: string,
  content: string,
  maskName: string,
  maskType: any
): Promise<any> {
  try {
    const impersonation = await verifyImpersonationToken(impersonationToken);
    
    if (!impersonation) {
      throw new Error('Invalid impersonation session');
    }

    // Create message as the target user
    const message = await prisma.message.create({
      data: {
        content,
        maskName,
        maskType,
        roomId,
        userId: impersonation.targetUserId,
        isFromAdmin: true,
        originalUserId: impersonation.adminId,
        createdAt: new Date(),
      },
    });

    // Log the impersonated message
    await logSurveillanceAction({
      adminId: impersonation.adminId,
      action: 'IMPERSONATE_MESSAGE',
      targetUserId: impersonation.targetUserId,
      roomId,
      data: {
        messageId: message.id,
        content: content.substring(0, 100),
        maskName,
      },
      ipAddress: 'impersonation',
    });

    return message;
  } catch (error) {
    console.error('Failed to send message as user:', error);
    throw new Error('Impersonated message failed');
  }
}

/**
 * Perform action as impersonated user
 */
export async function performActionAsUser(
  impersonationToken: string,
  action: string,
  data: any
): Promise<any> {
  try {
    const impersonation = await verifyImpersonationToken(impersonationToken);
    
    if (!impersonation) {
      throw new Error('Invalid impersonation session');
    }

    let result;

    switch (action) {
      case 'CREATE_DROP_SECRET':
        result = await prisma.dropSecret.create({
          data: {
            ...data,
            userId: impersonation.targetUserId,
            adminTagged: true,
          },
        });
        break;

      case 'ANSWER_TRUTH_QUESTION':
        result = await prisma.truthAnswer.create({
          data: {
            ...data,
            userId: impersonation.targetUserId,
            adminNotes: `Answered via admin impersonation by ${impersonation.adminId}`,
          },
        });
        break;

      case 'UPDATE_PROFILE':
        result = await prisma.user.update({
          where: { id: impersonation.targetUserId },
          data: data,
        });
        break;

      default:
        throw new Error('Unsupported impersonation action');
    }

    // Log the impersonated action
    await logSurveillanceAction({
      adminId: impersonation.adminId,
      action: `IMPERSONATE_${action}`,
      targetUserId: impersonation.targetUserId,
      data: {
        action,
        result: result?.id || 'completed',
        data: JSON.stringify(data).substring(0, 200),
      },
      ipAddress: 'impersonation',
    });

    return result;
  } catch (error) {
    console.error('Failed to perform action as user:', error);
    throw new Error('Impersonated action failed');
  }
}

/**
 * End impersonation session
 */
export async function endImpersonationSession(
  impersonationToken: string,
  adminId: string,
  ipAddress: string
): Promise<void> {
  try {
    const impersonation = await verifyImpersonationToken(impersonationToken);
    
    if (!impersonation || impersonation.adminId !== adminId) {
      throw new Error('Invalid impersonation session or unauthorized');
    }

    // Invalidate the session
    await prisma.userSession.deleteMany({
      where: { token: impersonationToken },
    });

    // Log session end
    await logSurveillanceAction({
      adminId,
      action: 'END_IMPERSONATION',
      targetUserId: impersonation.targetUserId,
      data: {
        reason: 'Admin ended session',
        sessionDuration: 'completed',
      },
      ipAddress,
    });
  } catch (error) {
    console.error('Failed to end impersonation session:', error);
    throw new Error('Impersonation session termination failed');
  }
}

/**
 * Get active impersonation sessions for admin dashboard
 */
export async function getActiveImpersonations(): Promise<any[]> {
  try {
    const activeSessions = await prisma.userSession.findMany({
      where: {
        isAdminSession: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return activeSessions.map(session => {
      const deviceInfo = session.deviceInfo as any;
      return {
        sessionId: session.id,
        adminId: deviceInfo?.adminId,
        targetUser: session.user,
        reason: deviceInfo?.reason,
        startedAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
      };
    });
  } catch (error) {
    console.error('Failed to get active impersonations:', error);
    return [];
  }
}

/**
 * Force end all impersonation sessions for a user
 */
export async function forceEndUserImpersonations(
  targetUserId: string,
  adminId: string,
  ipAddress: string
): Promise<void> {
  try {
    await prisma.userSession.deleteMany({
      where: {
        userId: targetUserId,
        isAdminSession: true,
      },
    });

    await logSurveillanceAction({
      adminId,
      action: 'FORCE_END_IMPERSONATIONS',
      targetUserId,
      data: {
        reason: 'Admin forced termination of all impersonation sessions',
      },
      ipAddress,
    });
  } catch (error) {
    console.error('Failed to force end impersonations:', error);
    throw new Error('Force impersonation termination failed');
  }
}
