import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/auth';
import { validateAdminSession } from '@/lib/adminAuth';
import { getChatRoomWithSurveillance, initializeChatRooms } from '@/lib/chatSurveillance';
import { withSecurity } from '@/lib/middleware';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

async function handler(request: NextRequest) {
  try {
    // Initialize rooms if they don't exist
    await initializeChatRooms();

    // Check authentication
    const cookieStore = cookies();
    const userToken = cookieStore.get('auth-token')?.value;
    const adminToken = cookieStore.get('admin-token')?.value;

    let user = null;
    let admin = null;
    let isAuthenticated = false;

    if (adminToken) {
      admin = await validateAdminSession(adminToken);
      if (admin) isAuthenticated = true;
    } else if (userToken) {
      user = await validateUserSession(userToken);
      if (user) isAuthenticated = true;
    }

    // Get all active rooms
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        messages: {
          where: {
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
            expiresAt: { gt: new Date() }, // Non-expired messages
          },
          include: admin ? {
            user: { select: { email: true } }
          } : {},
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform rooms data
    const roomsData = await Promise.all(
      rooms.map(async (room) => {
        const recentMessages = room.messages;
        const uniqueUsers = new Set(recentMessages.map(m => m.userId));
        
        // Get detailed room data if authenticated
        const roomDetails = isAuthenticated 
          ? await getChatRoomWithSurveillance(room.id, admin?.id)
          : null;

        return {
          id: room.id,
          name: room.name,
          description: room.description,
          type: room.type,
          maxUsers: room.maxUsers,
          currentUsers: uniqueUsers.size,
          lastActivity: recentMessages.length > 0 
            ? recentMessages[recentMessages.length - 1].createdAt 
            : null,
          messageCount: recentMessages.length,
          isActive: room.isActive,
          adminMonitored: room.adminMonitored,
          // Include surveillance data for admins
          ...(admin && roomDetails && {
            activeUsers: roomDetails.activeUsers,
            surveillanceData: {
              userEmails: roomDetails.activeUsers.map(u => u.userEmail).filter(Boolean),
              adminPresent: roomDetails.activeUsers.some(u => u.isAdmin),
            },
          }),
        };
      })
    );

    // Sort by activity for authenticated users
    if (isAuthenticated) {
      roomsData.sort((a, b) => {
        const aActivity = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bActivity = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return bActivity - aActivity;
      });
    }

    return NextResponse.json({
      success: true,
      rooms: roomsData,
      totalRooms: rooms.length,
      isAuthenticated,
      userType: admin ? 'admin' : user ? 'user' : 'guest',
      timestamp: new Date(),
    });

  } catch (error: any) {
    console.error('Get rooms list error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Failed to get rooms list',
        success: false 
      },
      { status: 500 }
    );
  }
}

export const GET = withSecurity(handler, {
  rateLimiter: 'api',
});

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
