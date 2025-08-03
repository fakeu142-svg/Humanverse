import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/auth';
import { renewMask } from '@/lib/maskSurveillance';
import { withSecurity } from '@/lib/middleware';
import { cookies } from 'next/headers';

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { maskId } = body;

    if (!maskId) {
      return NextResponse.json(
        { error: 'Mask ID is required' },
        { status: 400 }
      );
    }

    // Get user from session
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await validateUserSession(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Renew mask
    const renewedMask = await renewMask(maskId, user.id);

    return NextResponse.json({
      success: true,
      mask: {
        id: renewedMask.id,
        name: renewedMask.name,
        type: renewedMask.type,
        colorScheme: JSON.parse(renewedMask.colorScheme),
        expiresAt: renewedMask.expiresAt,
        streakCount: renewedMask.streakCount,
        timeRemaining: renewedMask.expiresAt 
          ? Math.max(0, new Date(renewedMask.expiresAt).getTime() - Date.now())
          : null,
      },
      message: `Mask renewed! Streak: ${renewedMask.streakCount}`,
    });

  } catch (error: any) {
    console.error('Mask renewal error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Mask renewal failed',
        success: false 
      },
      { status: 400 }
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
