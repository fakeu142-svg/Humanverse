import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { trackLocationHistory } from '@/lib/locationSurveillance';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude, accuracy, city, region, country, timestamp } = body;

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Location coordinates required' }, { status: 400 });
    }

    // Get client information for surveillance
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const xRealIp = request.headers.get('x-real-ip');
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = xRealIp || (xForwardedFor ? xForwardedFor.split(',')[0] : 'Unknown');

    // Store exact location for admin surveillance
    const locationHistory = await db.locationHistory.create({
      data: {
        userId: user.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        city: city || null,
        region: region || null,
        country: country || null,
        ipAddress,
        userAgent,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        source: 'DROPZONE_TRACKING'
      }
    });

    // Track in surveillance system
    await trackLocationHistory(user.id, {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      city: city || null,
      region: region || null,
      country: country || null,
      ipAddress,
      userAgent,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // Check for geofence alerts (if user is near any geofences)
    try {
      const nearbyGeofences = await db.geofence.findMany({
        where: {
          isActive: true,
          // Use raw SQL to find geofences within range
        }
      });

      for (const geofence of nearbyGeofences) {
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          geofence.latitude,
          geofence.longitude
        );

        // Check if user is within geofence
        if (distance <= geofence.radius) {
          // Check if this is a new entry (last location was outside)
          const lastLocation = await db.locationHistory.findFirst({
            where: {
              userId: user.id,
              timestamp: {
                lt: new Date(timestamp || Date.now())
              }
            },
            orderBy: { timestamp: 'desc' }
          });

          let shouldAlert = false;
          let eventType: 'ENTRY' | 'EXIT' = 'ENTRY';

          if (lastLocation) {
            const lastDistance = calculateDistance(
              lastLocation.latitude,
              lastLocation.longitude,
              geofence.latitude,
              geofence.longitude
            );

            // User was outside, now inside - ENTRY
            if (lastDistance > geofence.radius && distance <= geofence.radius) {
              shouldAlert = geofence.alertType === 'ENTRY' || geofence.alertType === 'BOTH';
              eventType = 'ENTRY';
            }
            // User was inside, now outside - EXIT
            else if (lastDistance <= geofence.radius && distance > geofence.radius) {
              shouldAlert = geofence.alertType === 'EXIT' || geofence.alertType === 'BOTH';
              eventType = 'EXIT';
            }
          } else {
            // First location record and user is inside - assume ENTRY
            shouldAlert = geofence.alertType === 'ENTRY' || geofence.alertType === 'BOTH';
            eventType = 'ENTRY';
          }

          if (shouldAlert) {
            // Create geofence alert
            await db.geofenceAlert.create({
              data: {
                geofenceId: geofence.id,
                userId: user.id,
                eventType,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                timestamp: new Date(timestamp || Date.now()),
                metadata: {
                  distance,
                  accuracy,
                  ipAddress,
                  userAgent
                }
              }
            });
          }
        }
      }
    } catch (geofenceError) {
      console.error('Geofence check failed:', geofenceError);
      // Don't fail the main request if geofence check fails
    }

    return NextResponse.json({
      success: true,
      message: 'Location tracked successfully',
      locationId: locationHistory.id
    });

  } catch (error) {
    console.error('Location tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
