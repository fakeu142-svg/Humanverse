import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/auth';
import { getAvailableMaskTypes, getUserActiveMask } from '@/lib/maskSurveillance';
import { withSecurity } from '@/lib/middleware';
import { cookies } from 'next/headers';

async function handler(request: NextRequest) {
  try {
    // Get user from session (optional for viewing available masks)
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;
    let user = null;
    let currentMask = null;

    if (token) {
      user = await validateUserSession(token);
      if (user) {
        currentMask = await getUserActiveMask(user.id);
      }
    }

    // Get all available mask types
    const availableMaskTypes = getAvailableMaskTypes();

    return NextResponse.json({
      success: true,
      maskTypes: availableMaskTypes.map(maskType => ({
        type: maskType.type,
        name: maskType.name,
        baseColor: maskType.baseColor,
        icon: maskType.icon,
        description: maskType.description,
        rarity: maskType.rarity,
        personality: maskType.personality,
      })),
      currentMask: currentMask ? {
        id: currentMask.id,
        name: currentMask.name,
        type: currentMask.type,
        colorScheme: JSON.parse(currentMask.colorScheme),
        expiresAt: currentMask.expiresAt,
        streakCount: currentMask.streakCount,
        timeRemaining: currentMask.expiresAt 
          ? Math.max(0, new Date(currentMask.expiresAt).getTime() - Date.now())
          : null,
      } : null,
      isAuthenticated: !!user,
    });

  } catch (error: any) {
    console.error('Get available masks error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Failed to get available masks',
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
