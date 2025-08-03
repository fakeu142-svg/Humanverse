import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/auth';
import { createMaskForUser, MASK_TYPES } from '@/lib/maskSurveillance';
import { withSecurity, getClientIP } from '@/lib/middleware';
import { cookies } from 'next/headers';
import { MaskType } from '@prisma/client';

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { maskType } = body;

    // Validate mask type
    if (!maskType || !Object.keys(MASK_TYPES).includes(maskType)) {
      return NextResponse.json(
        { error: 'Invalid mask type' },
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

    // Create mask for user
    const mask = await createMaskForUser(user.id, maskType as MaskType);

    return NextResponse.json({
      success: true,
      mask: {
        id: mask.id,
        name: mask.name,
        type: mask.type,
        colorScheme: JSON.parse(mask.colorScheme),
        expiresAt: mask.expiresAt,
        streakCount: mask.streakCount,
      },
      message: 'Mask created successfully',
    });

  } catch (error: any) {
    console.error('Mask creation error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Mask creation failed',
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
