// DropZone Nearby Secrets API - Find secrets within radius with surveillance tracking
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyUserToken } from '@/lib/auth';
import { findNearbySecrets, generateGeohash } from '@/lib/geolocation';

const prisma = new PrismaClient();

// GET - Find nearby secrets within discovery radius
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
    const latitude = parseFloat(url.searchParams.get('latitude') || '0');
    const longitude = parseFloat(url.searchParams.get('longitude') || '0');
    const radius = parseInt(url.searchParams.get('radius') || '10000'); // 10km default
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // Validate coordinates
    if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Valid latitude and longitude required' }, { status: 400 });
    }

    // Store user location for surveillance
    await storeUserLocationLookup(user.id, latitude, longitude);

    // Find nearby secrets using efficient geospatial query
    const nearbySecrets = await findNearbySecretsWithFilters(
      latitude,
      longitude,
      radius,
      category,
      limit,
      user.id
    );

    // Get user's discovery history for this session
    const userDiscoveries = await prisma.secretDiscovery.findMany({
      where: { userId: user.id },
      select: { secretId: true }
    });

    const discoveredSecretIds = new Set(userDiscoveries.map(d => d.secretId));

    // Format secrets for response (use fuzzed coordinates)
    const formattedSecrets = nearbySecrets.map(secret => ({
      id: secret.id,
      content: secret.content,
      category: secret.category,
      // Use fuzzed coordinates for user display
      latitude: secret.fuzzy_latitude || secret.latitude,
      longitude: secret.fuzzy_longitude || secret.longitude,
      city: secret.city,
      region: secret.region,
      maskName: secret.mask_name,
      discoveryCount: secret.discovery_count,
      distance: Math.round(secret.distance),
      canUnlock: secret.distance <= secret.unlock_radius,
      unlockRadius: secret.unlock_radius,
      isDiscovered: discoveredSecretIds.has(secret.id),
      createdAt: secret.created_at,
      timeAgo: getTimeAgo(secret.created_at)
    }));

    // Create discovery records for newly found secrets
    const newSecrets = formattedSecrets.filter(s => !s.isDiscovered);
    for (const secret of newSecrets) {
      try {
        await prisma.secretDiscovery.create({
          data: {
            userId: user.id,
            secretId: secret.id,
            userLatitude: latitude,
            userLongitude: longitude,
            distance: secret.distance,
            maskName: user.email // Would use current mask
          }
        });

        // Increment discovery count
        await prisma.dropSecret.update({
          where: { id: secret.id },
          data: { discoveryCount: { increment: 1 } }
        });
      } catch (error) {
        // Ignore duplicate discovery errors
      }
    }

    // Get nearby stats for context
    const stats = await getNearbyStats(latitude, longitude, radius);

    return NextResponse.json({
      secrets: formattedSecrets,
      stats: {
        totalFound: formattedSecrets.length,
        newDiscoveries: newSecrets.length,
        unlockableNow: formattedSecrets.filter(s => s.canUnlock).length,
        ...stats
      },
      location: {
        latitude,
        longitude,
        searchRadius: radius
      }
    });

  } catch (error) {
    console.error('Nearby secrets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Enhanced nearby secrets search with filters
async function findNearbySecretsWithFilters(
  latitude: number,
  longitude: number,
  radius: number,
  category: string | null,
  limit: number,
  userId: string
): Promise<any[]> {
  try {
    // Use raw SQL for efficient geospatial query with filters
    const categoryFilter = category ? `AND category = '${category}'` : '';
    
    const secrets = await prisma.$queryRaw`
      SELECT 
        id,
        content,
        category,
        latitude,
        longitude,
        fuzzy_latitude,
        fuzzy_longitude,
        city,
        region,
        mask_name,
        discovery_count,
        unlock_count,
        unlock_radius,
        created_at,
        admin_planted,
        (
          6371000 * acos(
            cos(radians(${latitude})) * 
            cos(radians(fuzzy_latitude)) * 
            cos(radians(fuzzy_longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(fuzzy_latitude))
          )
        ) AS distance
      FROM drop_secrets 
      WHERE is_active = true
      AND user_id != ${userId}
      AND (expires_at IS NULL OR expires_at > NOW())
      ${categoryFilter}
      HAVING distance <= ${radius}
      ORDER BY distance, discovery_count ASC
      LIMIT ${limit}
    `;

    return secrets as any[];
  } catch (error) {
    console.error('Error finding filtered nearby secrets:', error);
    return [];
  }
}

// Store user location lookup for surveillance
async function storeUserLocationLookup(userId: string, latitude: number, longitude: number) {
  try {
    const geohash = generateGeohash(latitude, longitude);
    
    await prisma.locationHistory.create({
      data: {
        userId,
        latitude,
        longitude,
        timestamp: new Date(),
        activityType: 'SECRET_SEARCH',
        geohash,
        surveillanceType: 'PASSIVE',
        deviceInfo: {
          action: 'nearby_search',
          timestamp: new Date().toISOString()
        }
      }
    });

    // Check for geofence alerts (would be implemented in geolocation.ts)
    // await checkGeofenceAlerts(userId, { latitude, longitude, timestamp: new Date() });
    
  } catch (error) {
    console.error('Failed to store location lookup:', error);
  }
}

// Get statistics about the area
async function getNearbyStats(latitude: number, longitude: number, radius: number) {
  try {
    const [totalSecrets, categoryBreakdown, recentActivity] = await Promise.all([
      // Total secrets in area
      prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM drop_secrets 
        WHERE is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (
          6371000 * acos(
            cos(radians(${latitude})) * 
            cos(radians(fuzzy_latitude)) * 
            cos(radians(fuzzy_longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(fuzzy_latitude))
          )
        ) <= ${radius}
      `,
      
      // Category breakdown
      prisma.$queryRaw`
        SELECT 
          category,
          COUNT(*) as count
        FROM drop_secrets 
        WHERE is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (
          6371000 * acos(
            cos(radians(${latitude})) * 
            cos(radians(fuzzy_latitude)) * 
            cos(radians(fuzzy_longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(fuzzy_latitude))
          )
        ) <= ${radius}
        GROUP BY category
        ORDER BY count DESC
      `,
      
      // Recent activity (last 24 hours)
      prisma.$queryRaw`
        SELECT COUNT(*) as recent
        FROM drop_secrets 
        WHERE is_active = true
        AND created_at > NOW() - INTERVAL '24 hours'
        AND (
          6371000 * acos(
            cos(radians(${latitude})) * 
            cos(radians(fuzzy_latitude)) * 
            cos(radians(fuzzy_longitude) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(fuzzy_latitude))
          )
        ) <= ${radius}
      `
    ]);

    return {
      totalInArea: (totalSecrets as any[])[0]?.total || 0,
      categoryBreakdown: categoryBreakdown as any[],
      recentActivity: (recentActivity as any[])[0]?.recent || 0
    };
    
  } catch (error) {
    console.error('Error getting nearby stats:', error);
    return {
      totalInArea: 0,
      categoryBreakdown: [],
      recentActivity: 0
    };
  }
}

// Helper function to get time ago string
function getTimeAgo(timestamp: string | Date): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
