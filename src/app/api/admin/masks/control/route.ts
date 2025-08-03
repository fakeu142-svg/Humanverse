import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { createMaskForUser, renewMask, getMaskSurveillanceData } from '@/lib/maskSurveillance';
import { withAdminSecurity } from '@/lib/middleware';
import { cookies } from 'next/headers';
import { MaskType } from '@prisma/client';

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, targetUserId, maskType, maskId } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
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

    let result;

    switch (action) {
      case 'CREATE_FAKE_MASK':
        // Check impersonation permission
        if (!admin.permissions.impersonation && admin.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'Insufficient permissions for mask creation' },
            { status: 403 }
          );
        }

        if (!targetUserId || !maskType) {
          return NextResponse.json(
            { error: 'Target user ID and mask type are required' },
            { status: 400 }
          );
        }

        result = await createMaskForUser(targetUserId, maskType as MaskType, admin.id);
        
        return NextResponse.json({
          success: true,
          action: 'CREATE_FAKE_MASK',
          mask: {
            id: result.id,
            name: result.name,
            type: result.type,
            colorScheme: JSON.parse(result.colorScheme),
            expiresAt: result.expiresAt,
            streakCount: result.streakCount,
            isAdminControlled: result.isAdminControlled,
          },
          message: 'Fake mask created successfully',
        });

      case 'FORCE_RENEW_MASK':
        // Check surveillance permission
        if (!admin.permissions.surveillance && admin.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'Insufficient permissions for mask renewal' },
            { status: 403 }
          );
        }

        if (!maskId || !targetUserId) {
          return NextResponse.json(
            { error: 'Mask ID and target user ID are required' },
            { status: 400 }
          );
        }

        result = await renewMask(maskId, targetUserId, admin.id);
        
        return NextResponse.json({
          success: true,
          action: 'FORCE_RENEW_MASK',
          mask: {
            id: result.id,
            name: result.name,
            type: result.type,
            colorScheme: JSON.parse(result.colorScheme),
            expiresAt: result.expiresAt,
            streakCount: result.streakCount,
            isAdminControlled: result.isAdminControlled,
          },
          message: 'Mask forcefully renewed',
        });

      case 'GET_SURVEILLANCE_DATA':
        // Check surveillance permission
        if (!admin.permissions.surveillance && admin.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'Insufficient permissions for surveillance data' },
            { status: 403 }
          );
        }

        result = await getMaskSurveillanceData(admin.id);
        
        return NextResponse.json({
          success: true,
          action: 'GET_SURVEILLANCE_DATA',
          data: result,
          message: 'Surveillance data retrieved',
        });

      case 'BULK_CREATE_MASKS':
        // Check admin management permission
        if (!admin.permissions.adminManagement && admin.role !== 'SUPER_ADMIN') {
          return NextResponse.json(
            { error: 'Insufficient permissions for bulk operations' },
            { status: 403 }
          );
        }

        const { userIds, maskTypes } = body;
        if (!userIds || !maskTypes || userIds.length !== maskTypes.length) {
          return NextResponse.json(
            { error: 'User IDs and mask types arrays must match in length' },
            { status: 400 }
          );
        }

        const createdMasks = [];
        for (let i = 0; i < userIds.length; i++) {
          try {
            const mask = await createMaskForUser(userIds[i], maskTypes[i] as MaskType, admin.id);
            createdMasks.push({
              userId: userIds[i],
              mask: {
                id: mask.id,
                name: mask.name,
                type: mask.type,
                isAdminControlled: mask.isAdminControlled,
              },
            });
          } catch (error) {
            console.error(`Failed to create mask for user ${userIds[i]}:`, error);
          }
        }

        return NextResponse.json({
          success: true,
          action: 'BULK_CREATE_MASKS',
          created: createdMasks.length,
          total: userIds.length,
          masks: createdMasks,
          message: `${createdMasks.length} masks created successfully`,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Admin mask control error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Admin mask control failed',
        success: false 
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminSecurity(handler);

// GET route for surveillance dashboard data
async function getHandler(request: NextRequest) {
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
        { error: 'Insufficient permissions for surveillance data' },
        { status: 403 }
      );
    }

    const surveillanceData = await getMaskSurveillanceData(admin.id);
    
    return NextResponse.json({
      success: true,
      data: surveillanceData,
      timestamp: new Date(),
    });

  } catch (error: any) {
    console.error('Get surveillance data error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Failed to get surveillance data',
        success: false 
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminSecurity(getHandler);

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
