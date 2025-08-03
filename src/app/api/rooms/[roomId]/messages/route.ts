import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/auth';
import { validateAdminSession } from '@/lib/adminAuth';
import { getChatMessages } from '@/lib/chatSurveillance';
import { withSecurity } from '@/lib/middleware';
import { cookies } from 'next/headers';

interface RouteParams {
  params: {
    roomId: string;
  };
}

async function handler(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const before = url.searchParams.get('before') || undefined;

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

    if (adminToken) {
      admin = await validateAdminSession(adminToken);
    } else if (userToken) {
      user = await validateUserSession(userToken);
    }

    if (!user && !admin) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get messages with surveillance data for admins
    const messages = await getChatMessages(
      roomId,
      Math.min(limit, 100), // Cap at 100 messages
      before,
      admin?.id
    );

    // Filter sensitive data based on user type
    const filteredMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      maskName: message.maskName,
      maskType: message.maskType,
      reactions: message.reactions,
      upvotes: message.upvotes,
      createdAt: message.createdAt,
      expiresAt: message.expiresAt,
      // Include surveillance data only for admins
      ...(admin && {
        userId: message.userId,
        userEmail: message.userEmail,
        isFromAdmin: message.isFromAdmin,
        originalUserId: message.originalUserId,
      }),
    }));

    return NextResponse.json({
      success: true,
      messages: filteredMessages.reverse(), // Oldest first for chat display
      roomId,
      hasMore: messages.length === limit,
      userType: admin ? 'admin' : 'user',
      timestamp: new Date(),
    });

  } catch (error: any) {
    console.error('Get room messages error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Failed to get room messages',
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
