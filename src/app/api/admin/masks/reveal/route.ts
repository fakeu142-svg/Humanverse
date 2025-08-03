import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { revealMaskUser } from '@/lib/maskSurveillance';
import { withAdminSecurity } from '@/lib/middleware';
import { cookies } from 'next/headers';

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { maskName } = body;

    if (!maskName) {
      return NextResponse.json(
        { error: 'Mask name is required' },
        { status: 400 }
      );
    }

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
        { error: 'Insufficient permissions for mask surveillance' },
        { status: 403 }
      );
    }

    // Reveal mask user identity
    const revelation = await revealMaskUser(maskName, admin.id);

    if (!revelation) {
      return NextResponse.json(
        { error: 'Mask not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      maskName,
      revelation: {
        maskId: revelation.maskId,
        userId: revelation.userId,
        userEmail: revelation.userEmail,
        maskDetails: revelation.maskDetails,
      },
      revealedBy: {
        adminId: admin.id,
        adminEmail: admin.email,
        timestamp: new Date(),
      },
      message: 'Mask identity revealed successfully',
    });

  } catch (error: any) {
    console.error('Mask revelation error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Mask revelation failed',
        success: false 
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminSecurity(handler);

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
