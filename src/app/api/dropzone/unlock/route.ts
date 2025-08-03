// DropZone Unlock Secret API - Location verification and secret unlocking
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyUserToken } from '@/lib/auth';
import { verifyAdminToken } from '@/lib/adminAuth';
import { verifyLocationForUnlock, generateGeohash, calculateDistance } from '@/lib/geolocation';

const prisma = new PrismaClient();

// POST - Unlock a secret with location verification
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if it's an admin token first
    let user = null;
    let isAdmin = false;
    
    try {
      const adminUser = await verifyAdminToken(token);
      if (adminUser) {
        isAdmin = true;
        user = { id: adminUser.id, email: adminUser.email };
      }
    } catch (error) {
      // Not an admin token, try user token
      user = await verifyUserToken(token);
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { secretId, latitude, longitude, maskName } = body;

    if (!secretId) {
      return NextResponse.json({ error: 'Secret ID required' }, { status: 400 });
    }

    // For non-admin users, require location and mask
    if (!isAdmin && (!latitude || !longitude || !maskName)) {
      return NextResponse.json({ 
        error: 'Location coordinates and mask name required for unlock' 
      }, { status: 400 });
    }

    // Get the secret
    const secret = await prisma.dropSecret.findUnique({
      where: { id: secretId },
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    if (!secret) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 });
    }

    if (!secret.isActive) {
      return NextResponse.json({ error: 'Secret is no longer active' }, { status: 410 });
    }

    if (secret.expiresAt && secret.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Secret has expired' }, { status: 410 });
    }

    // Prevent users from unlocking their own secrets
    if (!isAdmin && secret.userId === user.id) {
      return NextResponse.json({ error: 'Cannot unlock your own secret' }, { status: 403 });
    }

    let verificationResult = { canUnlock: true, distance: 0, message: 'Admin override' };
    
    // Verify location for non-admin users
    if (!isAdmin) {
      verificationResult = await verifyLocationForUnlock(
        secretId,
        latitude,
        longitude,
        false
      );

      if (!verificationResult.canUnlock) {
        // Store failed unlock attempt for surveillance
        await storeUnlockAttempt(user.id, secretId, latitude, longitude, false, verificationResult.distance);
        
        return NextResponse.json({ 
          error: verificationResult.message,
          distance: Math.round(verificationResult.distance),
          unlockRadius: secret.unlockRadius,
          canUnlock: false
        }, { status: 403 });
      }
    }

    // Check if user already unlocked this secret
    const existingUnlock = await prisma.secretDiscovery.findUnique({
      where: {
        userId_secretId: {
          userId: user.id,
          secretId
        }
      }
    });

    // If admin or not previously unlocked, proceed
    if (isAdmin || !existingUnlock?.unlockedAt) {
      // Update discovery record with unlock
      await prisma.secretDiscovery.upsert({
        where: {
          userId_secretId: {
            userId: user.id,
            secretId
          }
        },
        update: {
          unlockedAt: new Date(),
          userLatitude: latitude || 0,
          userLongitude: longitude || 0,
          distance: verificationResult.distance
        },
        create: {
          userId: user.id,
          secretId,
          unlockedAt: new Date(),
          userLatitude: latitude || 0,
          userLongitude: longitude || 0,
          distance: verificationResult.distance,
          maskName: maskName || 'AdminAccess'
        }
      });

      // Increment unlock count
      await prisma.dropSecret.update({
        where: { id: secretId },
        data: { unlockCount: { increment: 1 } }
      });

      // Store successful unlock for surveillance
      await storeUnlockAttempt(user.id, secretId, latitude || 0, longitude || 0, true, verificationResult.distance);

      // Log admin unlock action
      if (isAdmin) {
        await prisma.adminAction.create({
          data: {
            adminId: user.id,
            action: 'SECRET_UNLOCK_OVERRIDE',
            targetUserId: secret.userId,
            details: {
              secretId,
              secretContent: secret.content,
              originalLocation: {
                latitude: secret.latitude,
                longitude: secret.longitude
              },
              adminLocation: {
                latitude: latitude || null,
                longitude: longitude || null
              }
            },
            ipAddress: getClientIP(request) || 'unknown'
          }
        });
      }
    }

    // Return the unlocked secret
    const response = {
      secret: {
        id: secret.id,
        content: secret.content,
        category: secret.category,
        city: secret.city,
        region: secret.region,
        maskName: secret.maskName,
        creatorEmail: isAdmin ? secret.user.email : undefined, // Only show email to admin
        unlockCount: secret.unlockCount + 1,
        createdAt: secret.createdAt,
        distance: Math.round(verificationResult.distance)
      },
      unlock: {
        unlockedAt: new Date(),
        distance: Math.round(verificationResult.distance),
        isAdminUnlock: isAdmin,
        verificationPassed: verificationResult.canUnlock
      },
      location: !isAdmin ? {
        // Show fuzzed location to regular users
        latitude: secret.fuzzyLatitude,
        longitude: secret.fuzzyLongitude,
        city: secret.city,
        region: secret.region
      } : {
        // Show exact location to admin
        latitude: secret.latitude,
        longitude: secret.longitude,
        fuzzyLatitude: secret.fuzzyLatitude,
        fuzzyLongitude: secret.fuzzyLongitude,
        city: secret.city,
        region: secret.region,
        accuracy: secret.locationAccuracy
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unlock secret error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Store unlock attempt for surveillance tracking
async function storeUnlockAttempt(
  userId: string,
  secretId: string,
  latitude: number,
  longitude: number,
  successful: boolean,
  distance: number
) {
  try {
    const geohash = generateGeohash(latitude, longitude);
    
    // Store location in surveillance system
    await prisma.locationHistory.create({
      data: {
        userId,
        latitude,
        longitude,
        timestamp: new Date(),
        activityType: successful ? 'SECRET_UNLOCK_SUCCESS' : 'SECRET_UNLOCK_FAILED',
        geohash,
        surveillanceType: 'ACTIVE',
        deviceInfo: {
          action: 'secret_unlock',
          secretId,
          distance,
          successful,
          timestamp: new Date().toISOString()
        }
      }
    });

    // Create surveillance log
    await prisma.surveillanceLog.create({
      data: {
        adminId: 'system', // System generated log
        userId,
        action: successful ? 'SECRET_UNLOCKED' : 'SECRET_UNLOCK_FAILED',
        data: {
          secretId,
          userLocation: { latitude, longitude },
          distance,
          timestamp: new Date().toISOString(),
          geohash
        }
      }
    });
  } catch (error) {
    console.error('Failed to store unlock attempt:', error);
  }
}

// Get client IP from request
function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return null;
}

// GET - Get unlock history for user
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await verifyUserToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Get user's unlock history
    const unlocks = await prisma.secretDiscovery.findMany({
      where: {
        userId: user.id,
        unlockedAt: { not: null }
      },
      include: {
        secret: {
          select: {
            id: true,
            content: true,
            category: true,
            city: true,
            region: true,
            maskName: true,
            fuzzyLatitude: true,
            fuzzyLongitude: true,
            createdAt: true
          }
        }
      },
      orderBy: { unlockedAt: 'desc' },
      take: limit
    });

    const formattedUnlocks = unlocks.map(unlock => ({
      secretId: unlock.secretId,
      secret: {
        content: unlock.secret.content,
        category: unlock.secret.category,
        city: unlock.secret.city,
        region: unlock.secret.region,
        creatorMask: unlock.secret.maskName,
        latitude: unlock.secret.fuzzyLatitude,
        longitude: unlock.secret.fuzzyLongitude,
        createdAt: unlock.secret.createdAt
      },
      discoveredAt: unlock.discoveredAt,
      unlockedAt: unlock.unlockedAt,
      distance: Math.round(unlock.distance),
      maskName: unlock.maskName
    }));

    // Get user stats
    const stats = {
      totalUnlocked: unlocks.length,
      totalDiscovered: await prisma.secretDiscovery.count({
        where: { userId: user.id }
      }),
      categoryCounts: unlocks.reduce((acc: any, unlock) => {
        const category = unlock.secret.category;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),
      averageDistance: unlocks.length > 0 
        ? Math.round(unlocks.reduce((sum, unlock) => sum + unlock.distance, 0) / unlocks.length)
        : 0
    };

    return NextResponse.json({
      unlocks: formattedUnlocks,
      stats
    });

  } catch (error) {
    console.error('Get unlock history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
