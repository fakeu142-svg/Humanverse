// Admin Location Tracking API - Complete user location surveillance
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminToken } from '@/lib/adminAuth';
import { 
  analyzeUserMovementPatterns, 
  predictUserLocation,
  findUserMeetings,
  assessLocationRisk,
  exportLocationData
} from '@/lib/locationSurveillance';

const prisma = new PrismaClient();

// GET - Track user locations and patterns
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const admin = await verifyAdminToken(token);
    if (!admin || !['SUPER_ADMIN', 'SURVEILLANCE'].includes(admin.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    const timeframe = url.searchParams.get('timeframe') || '24h';
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // Log admin access
    await prisma.adminAction.create({
      data: {
        adminId: admin.id,
        action: 'LOCATION_SURVEILLANCE_ACCESS',
        targetUserId: userId || undefined,
        details: {
          action,
          timeframe,
          accessType: 'API_REQUEST'
        },
        ipAddress: getClientIP(request) || 'unknown'
      }
    });

    switch (action) {
      case 'live_tracking':
        return await handleLiveTracking(admin.id, userId, limit);
      
      case 'movement_patterns':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required for movement patterns' }, { status: 400 });
        }
        return await handleMovementPatterns(userId, timeframe);
      
      case 'location_history':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required for location history' }, { status: 400 });
        }
        return await handleLocationHistory(userId, timeframe, limit);
      
      case 'predict_location':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required for location prediction' }, { status: 400 });
        }
        return await handleLocationPrediction(userId);
      
      case 'user_meetings':
        const userId2 = url.searchParams.get('userId2');
        if (!userId || !userId2) {
          return NextResponse.json({ error: 'Two user IDs required for meeting analysis' }, { status: 400 });
        }
        return await handleUserMeetings(userId, userId2);
      
      case 'risk_assessment':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required for risk assessment' }, { status: 400 });
        }
        const lat = parseFloat(url.searchParams.get('latitude') || '0');
        const lon = parseFloat(url.searchParams.get('longitude') || '0');
        return await handleRiskAssessment(userId, lat, lon);
      
      case 'export_data':
        return await handleDataExport(url.searchParams);
      
      default:
        return await handleLocationDashboard(timeframe, limit);
    }

  } catch (error) {
    console.error('Admin location tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Start/stop location tracking operations
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const admin = await verifyAdminToken(token);
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId, parameters } = body;

    switch (action) {
      case 'start_tracking':
        return await startLocationTracking(admin.id, userId, parameters);
      
      case 'stop_tracking':
        return await stopLocationTracking(admin.id, userId);
      
      case 'force_location_update':
        return await forceLocationUpdate(admin.id, userId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Admin location control error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle live location tracking
async function handleLiveTracking(adminId: string, userId: string | null, limit: number) {
  try {
    const timeFilter = new Date(Date.now() - 30 * 60 * 1000); // Last 30 minutes
    
    const query: any = {
      timestamp: { gte: timeFilter },
      ...(userId && { userId })
    };

    const liveLocations = await prisma.locationHistory.findMany({
      where: query,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            riskScore: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    const formattedLocations = liveLocations.map(loc => ({
      userId: loc.userId,
      userEmail: loc.user.email,
      userRiskScore: loc.user.riskScore,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      speed: loc.speed,
      heading: loc.heading,
      timestamp: loc.timestamp,
      activityType: loc.activityType,
      city: loc.city,
      region: loc.region,
      surveillanceType: loc.surveillanceType,
      geohash: loc.geohash
    }));

    return NextResponse.json({
      liveLocations: formattedLocations,
      totalTracked: formattedLocations.length,
      lastUpdate: new Date(),
      trackingWindow: '30 minutes'
    });
    
  } catch (error) {
    console.error('Live tracking error:', error);
    return NextResponse.json({ error: 'Failed to get live tracking data' }, { status: 500 });
  }
}

// Handle movement pattern analysis
async function handleMovementPatterns(userId: string, timeframe: string) {
  try {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 1;
    const patterns = await analyzeUserMovementPatterns(userId, days);
    
    return NextResponse.json({
      userId,
      analysisTimeframe: `${days} days`,
      patterns
    });
    
  } catch (error) {
    console.error('Movement patterns error:', error);
    return NextResponse.json({ error: 'Failed to analyze movement patterns' }, { status: 500 });
  }
}

// Handle location history
async function handleLocationHistory(userId: string, timeframe: string, limit: number) {
  try {
    const hours = timeframe === '7d' ? 168 : timeframe === '30d' ? 720 : 24;
    const timeFilter = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const locationHistory = await prisma.locationHistory.findMany({
      where: {
        userId,
        timestamp: { gte: timeFilter }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    const analytics = {
      totalLocations: locationHistory.length,
      timeSpan: `${hours} hours`,
      averageAccuracy: locationHistory.reduce((sum, loc) => sum + (loc.accuracy || 0), 0) / locationHistory.length,
      activityBreakdown: locationHistory.reduce((acc: any, loc) => {
        const activity = loc.activityType || 'UNKNOWN';
        acc[activity] = (acc[activity] || 0) + 1;
        return acc;
      }, {}),
      surveillanceBreakdown: locationHistory.reduce((acc: any, loc) => {
        const type = loc.surveillanceType || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };

    return NextResponse.json({
      userId,
      timeframe,
      locationHistory: locationHistory.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        timestamp: loc.timestamp,
        activityType: loc.activityType,
        city: loc.city,
        region: loc.region,
        geohash: loc.geohash,
        surveillanceType: loc.surveillanceType
      })),
      analytics
    });
    
  } catch (error) {
    console.error('Location history error:', error);
    return NextResponse.json({ error: 'Failed to get location history' }, { status: 500 });
  }
}

// Handle location prediction
async function handleLocationPrediction(userId: string) {
  try {
    const predictions = await predictUserLocation(userId, 3600); // 1 hour prediction
    
    return NextResponse.json({
      userId,
      predictionHorizon: '1 hour',
      predictions
    });
    
  } catch (error) {
    console.error('Location prediction error:', error);
    return NextResponse.json({ error: 'Failed to predict location' }, { status: 500 });
  }
}

// Handle user meeting analysis
async function handleUserMeetings(userId1: string, userId2: string) {
  try {
    const meetings = await findUserMeetings(userId1, userId2);
    
    return NextResponse.json({
      user1: userId1,
      user2: userId2,
      meetings,
      totalMeetings: meetings.length,
      totalDuration: meetings.reduce((sum, meeting) => sum + meeting.duration, 0)
    });
    
  } catch (error) {
    console.error('User meetings error:', error);
    return NextResponse.json({ error: 'Failed to analyze user meetings' }, { status: 500 });
  }
}

// Handle location risk assessment
async function handleRiskAssessment(userId: string, latitude: number, longitude: number) {
  try {
    const riskAssessment = await assessLocationRisk(userId, latitude, longitude);
    
    return NextResponse.json({
      userId,
      location: { latitude, longitude },
      riskAssessment
    });
    
  } catch (error) {
    console.error('Risk assessment error:', error);
    return NextResponse.json({ error: 'Failed to assess location risk' }, { status: 500 });
  }
}

// Handle data export
async function handleDataExport(searchParams: URLSearchParams) {
  try {
    const userIds = searchParams.get('userIds')?.split(',') || [];
    const startDate = new Date(searchParams.get('startDate') || Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date(searchParams.get('endDate') || Date.now());
    
    const exportData = await exportLocationData(userIds, startDate, endDate);
    
    return NextResponse.json({
      exportData,
      totalRecords: exportData.length,
      dateRange: { startDate, endDate },
      userIds
    });
    
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json({ error: 'Failed to export location data' }, { status: 500 });
  }
}

// Handle location dashboard
async function handleLocationDashboard(timeframe: string, limit: number) {
  try {
    const hours = timeframe === '7d' ? 168 : timeframe === '30d' ? 720 : 24;
    const timeFilter = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Get recent location activity
    const recentActivity = await prisma.locationHistory.findMany({
      where: { timestamp: { gte: timeFilter } },
      include: {
        user: {
          select: {
            email: true,
            riskScore: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    // Get active tracking operations
    const activeOperations = await prisma.locationSurveillanceOp.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' }
    });

    // Get geofence alerts
    const recentAlerts = await prisma.geofenceAlert.findMany({
      where: { 
        triggeredAt: { gte: timeFilter },
        acknowledged: false
      },
      include: {
        user: {
          select: { email: true }
        },
        geofence: {
          select: { name: true }
        }
      },
      orderBy: { triggeredAt: 'desc' },
      take: 20
    });

    // Statistics
    const stats = {
      totalLocationsRecorded: recentActivity.length,
      uniqueUsersTracked: new Set(recentActivity.map(loc => loc.userId)).size,
      activeOperations: activeOperations.length,
      pendingAlerts: recentAlerts.length,
      averageAccuracy: recentActivity.reduce((sum, loc) => sum + (loc.accuracy || 0), 0) / Math.max(recentActivity.length, 1),
      activityBreakdown: recentActivity.reduce((acc: any, loc) => {
        const activity = loc.activityType || 'UNKNOWN';
        acc[activity] = (acc[activity] || 0) + 1;
        return acc;
      }, {})
    };

    return NextResponse.json({
      dashboard: {
        recentActivity: recentActivity.slice(0, 50).map(loc => ({
          userId: loc.userId,
          userEmail: loc.user.email,
          userRiskScore: loc.user.riskScore,
          latitude: loc.latitude,
          longitude: loc.longitude,
          city: loc.city,
          activityType: loc.activityType,
          timestamp: loc.timestamp,
          surveillanceType: loc.surveillanceType
        })),
        activeOperations,
        recentAlerts: recentAlerts.map(alert => ({
          id: alert.id,
          userEmail: alert.user.email,
          geofenceName: alert.geofence.name,
          alertType: alert.alertType,
          severity: alert.severity,
          triggeredAt: alert.triggeredAt,
          location: {
            latitude: alert.latitude,
            longitude: alert.longitude
          }
        })),
        stats
      },
      timeframe,
      lastUpdate: new Date()
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}

// Start location tracking operation
async function startLocationTracking(adminId: string, userId: string, parameters: any) {
  try {
    const operation = await prisma.locationSurveillanceOp.create({
      data: {
        adminId,
        operationType: 'TRACK_USER',
        targetUserId: userId,
        parameters: parameters || {
          trackingMode: 'REAL_TIME',
          updateInterval: 30000,
          highAccuracy: true
        },
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({
      operation,
      message: `Started location tracking for user ${userId}`
    });
    
  } catch (error) {
    console.error('Start tracking error:', error);
    return NextResponse.json({ error: 'Failed to start location tracking' }, { status: 500 });
  }
}

// Stop location tracking operation
async function stopLocationTracking(adminId: string, userId: string) {
  try {
    await prisma.locationSurveillanceOp.updateMany({
      where: {
        targetUserId: userId,
        status: 'ACTIVE'
      },
      data: {
        status: 'COMPLETED',
        endedAt: new Date()
      }
    });

    return NextResponse.json({
      message: `Stopped location tracking for user ${userId}`
    });
    
  } catch (error) {
    console.error('Stop tracking error:', error);
    return NextResponse.json({ error: 'Failed to stop location tracking' }, { status: 500 });
  }
}

// Force location update for user
async function forceLocationUpdate(adminId: string, userId: string) {
  try {
    // This would trigger a client-side location update request
    // In a real implementation, this might use WebSocket or push notifications
    
    await prisma.adminAction.create({
      data: {
        adminId,
        action: 'FORCE_LOCATION_UPDATE',
        targetUserId: userId,
        details: {
          requestedAt: new Date(),
          method: 'ADMIN_FORCE'
        },
        ipAddress: 'admin_system'
      }
    });

    return NextResponse.json({
      message: `Location update requested for user ${userId}`,
      requestId: `force_update_${Date.now()}`
    });
    
  } catch (error) {
    console.error('Force update error:', error);
    return NextResponse.json({ error: 'Failed to force location update' }, { status: 500 });
  }
}

// Helper function to get client IP
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
