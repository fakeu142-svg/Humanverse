import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { geofenceId, eventType, latitude, longitude, timestamp, distance } = body;

    if (!geofenceId || !eventType || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['ENTRY', 'EXIT'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Verify geofence exists and is active
    const geofence = await db.geofence.findUnique({
      where: { id: geofenceId }
    });

    if (!geofence) {
      return NextResponse.json({ error: 'Geofence not found' }, { status: 404 });
    }

    if (!geofence.isActive) {
      return NextResponse.json({ error: 'Geofence is not active' }, { status: 400 });
    }

    // Get client information for surveillance
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const xRealIp = request.headers.get('x-real-ip');
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = xRealIp || (xForwardedFor ? xForwardedFor.split(',')[0] : 'Unknown');

    // Check if we should create this alert based on geofence settings
    const shouldAlert = 
      geofence.alertType === 'BOTH' ||
      (geofence.alertType === 'ENTRY' && eventType === 'ENTRY') ||
      (geofence.alertType === 'EXIT' && eventType === 'EXIT');

    if (!shouldAlert) {
      return NextResponse.json({ 
        success: true, 
        message: 'Event recorded but no alert generated',
        alertCreated: false 
      });
    }

    // Prevent duplicate alerts within a short time window (5 minutes)
    const recentAlert = await db.geofenceAlert.findFirst({
      where: {
        geofenceId,
        userId: user.id,
        eventType,
        timestamp: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (recentAlert) {
      return NextResponse.json({ 
        success: true, 
        message: 'Duplicate alert suppressed',
        alertCreated: false,
        lastAlert: recentAlert.timestamp
      });
    }

    // Create geofence alert
    const alert = await db.geofenceAlert.create({
      data: {
        geofenceId,
        userId: user.id,
        eventType,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        metadata: {
          distance: distance || null,
          ipAddress,
          userAgent,
          geofenceName: geofence.name,
          geofenceRadius: geofence.radius
        }
      },
      include: {
        geofence: {
          select: {
            name: true,
            description: true
          }
        },
        user: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });

    // Log surveillance operation for admin tracking
    try {
      await db.locationSurveillanceOp.create({
        data: {
          adminId: null, // System-generated alert
          operationType: 'GEOFENCE_ALERT',
          targetUserId: user.id,
          details: {
            geofenceId,
            geofenceName: geofence.name,
            eventType,
            alertId: alert.id,
            location: { latitude, longitude },
            distance
          },
          timestamp: new Date()
        }
      });
    } catch (surveillanceError) {
      console.error('Failed to log surveillance operation:', surveillanceError);
      // Don't fail the main request
    }

    return NextResponse.json({
      success: true,
      message: 'Geofence alert created',
      alertCreated: true,
      alert: {
        id: alert.id,
        eventType: alert.eventType,
        timestamp: alert.timestamp,
        geofence: {
          name: alert.geofence.name,
          description: alert.geofence.description
        }
      }
    });

  } catch (error) {
    console.error('Geofence event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
