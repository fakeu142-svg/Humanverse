import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/auth';
import { validateAdminSession } from '@/lib/adminAuth';
import { getChatRoomWithSurveillance, recordSurveillanceEvent } from '@/lib/chatSurveillance';
import { getUserActiveMask } from '@/lib/maskSurveillance';
import { withSecurity } from '@/lib/middleware';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: {
    roomId: string;
  };
}

async function handler(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = params;

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const cookieStore = cookies();
    const userToken = cookieStore.get('auth-token')?.value;
    const adminToken = cookieStore.get('admin-token')?.value;

    let user = null;
    let admin = null;
    let mask = null;

    if (adminToken) {
      admin = await validateAdminSession(adminToken);
      if (!admin) {
        return NextResponse.json(
          { error: 'Invalid admin session' },
          { status: 401 }
        );
      }
    } else if (userToken) {
      user = await validateUserSession(userToken);
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid user session' },
          { status: 401 }
        );
      }

      // Get user's active mask
      mask = await getUserActiveMask(user.id);
      if (!mask) {
        return NextResponse.json(
          { error: 'No active mask found. Please create a mask first.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get room details
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room || !room.isActive) {
      return NextResponse.json(
        { error: 'Room not found or inactive' },
        { status: 404 }
      );
    }

    // Get current room occupancy (simplified - in production use Redis)
    const recentMessages = await prisma.message.findMany({
      where: {
        roomId,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
        expiresAt: { gt: new Date() },
      },
      distinct: ['userId'],
    });

    const currentOccupancy = recentMessages.length;

    // Check room capacity (skip for admins)
    if (!admin && currentOccupancy >= room.maxUsers) {
      return NextResponse.json(
        { error: 'Room is at maximum capacity' },
        { status: 423 }
      );
    }

    // Get room surveillance data
    const roomData = await getChatRoomWithSurveillance(roomId, admin?.id);

    if (!roomData) {
      return NextResponse.json(
        { error: 'Failed to get room data' },
        { status: 500 }
      );
    }

    // Record surveillance event for regular users
    if (user && mask) {
      await recordSurveillanceEvent({
        type: 'JOIN',
        roomId,
        userId: user.id,
        userEmail: user.email,
        maskName: mask.name,
        data: {
          roomName: room.name,
          userCount: currentOccupancy + 1,
        },
        timestamp: new Date(),
        adminId: admin?.id,
      });
    }

    // Return room join data
    return NextResponse.json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        type: room.type,
        maxUsers: room.maxUsers,
        currentUsers: currentOccupancy,
        adminMonitored: room.adminMonitored,
      },
      userInfo: admin ? {
        type: 'admin',
        id: admin.id,
        role: admin.role,
        permissions: admin.permissions,
      } : {
        type: 'user',
        id: user?.id,
        maskName: mask?.name,
        maskType: mask?.type,
      },
      // Include surveillance data for admins
      ...(admin && {
        surveillanceData: {
          activeUsers: roomData.activeUsers,
          adminMonitored: room.adminMonitored,
        },
      }),
      timestamp: new Date(),
    });

  } catch (error: any) {
    console.error('Join room error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Failed to join room',
        success: false 
      },
      { status: 500 }
    );
  }
}

export const POST = withSecurity(handler, {
  rateLimiter: 'api',
  requireHTTPS: true,
});

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
