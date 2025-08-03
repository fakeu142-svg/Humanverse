import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { getChatSurveillanceDashboard } from '@/lib/chatSurveillance';
import { withAdminSecurity } from '@/lib/middleware';
import { cookies } from 'next/headers';

async function handler(request: NextRequest) {
  try {
    // Validate admin session
    const cookieStore = cookies();
    const token = cookieStore.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const admin = await validateAdminSession(token);
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid admin session' },
        { status: 401 }
      );
    }

    // Check surveillance permission
    if (!admin.permissions.surveillance && admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions for room monitoring' },
        { status: 403 }
      );
    }

    if (request.method === 'GET') {
      // Get surveillance dashboard data
      const dashboardData = await getChatSurveillanceDashboard(admin.id);

      return NextResponse.json({
        success: true,
        surveillance: dashboardData,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
        timestamp: new Date(),
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { action, roomId, targetUserId } = body;

      switch (action) {
        case 'START_MONITORING':
          // This would typically set up real-time monitoring
          // For now, return the current state
          const dashboardData = await getChatSurveillanceDashboard(admin.id);
          
          return NextResponse.json({
            success: true,
            action: 'START_MONITORING',
            data: dashboardData,
            message: 'Real-time monitoring started',
          });

        case 'FLAG_CONTENT':
          const { messageId, reason } = body;
          
          // In a real implementation, this would flag the message
          // For now, just log the action
          console.log(`Admin ${admin.email} flagged message ${messageId}: ${reason}`);
          
          return NextResponse.json({
            success: true,
            action: 'FLAG_CONTENT',
            messageId,
            reason,
            flaggedBy: admin.email,
            timestamp: new Date(),
          });

        case 'EXTRACT_USER_DATA':
          if (!targetUserId) {
            return NextResponse.json(
              { error: 'Target user ID is required' },
              { status: 400 }
            );
          }

          // Extract comprehensive user data
          const { prisma } = await import('@/lib/db');
          const userData = await prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
              messages: {
                include: {
                  room: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
              },
              masks: {
                orderBy: { createdAt: 'desc' },
              },
              sessions: {
                orderBy: { createdAt: 'desc' },
                take: 20,
              },
            },
          });

          if (!userData) {
            return NextResponse.json(
              { error: 'User not found' },
              { status: 404 }
            );
          }

          return NextResponse.json({
            success: true,
            action: 'EXTRACT_USER_DATA',
            userData: {
              id: userData.id,
              email: userData.email,
              riskScore: userData.riskScore,
              registrationDate: userData.registrationDate,
              lastLogin: userData.lastLogin,
              ipAddress: userData.ipAddress,
              messageCount: userData.messages.length,
              maskCount: userData.masks.length,
              sessionCount: userData.sessions.length,
              recentMessages: userData.messages.slice(0, 10).map(m => ({
                id: m.id,
                content: m.content,
                roomName: m.room?.name,
                createdAt: m.createdAt,
                maskName: m.maskName,
              })),
              activeMasks: userData.masks.map(m => ({
                id: m.id,
                name: m.name,
                type: m.type,
                streakCount: m.streakCount,
                expiresAt: m.expiresAt,
              })),
            },
            extractedBy: admin.email,
            timestamp: new Date(),
          });

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );

  } catch (error: any) {
    console.error('Admin room monitoring error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Room monitoring failed',
        success: false 
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminSecurity(handler);
export const POST = withAdminSecurity(handler);

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
