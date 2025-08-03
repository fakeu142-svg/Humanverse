// DropZone Create Secret API - Location-based secret creation with surveillance
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyUserToken } from '@/lib/auth';
import { fuzzLocationForUser, generateGeohash } from '@/lib/geolocation';

const prisma = new PrismaClient();

// POST - Create a location-based secret
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await verifyUserToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      content, 
      category, 
      latitude, 
      longitude, 
      maskName,
      discoveryRadius = 10000, // 10km default
      unlockRadius = 1000, // 1km default
      expirationHours 
    } = body;

    // Validate required fields
    if (!content || !category || !latitude || !longitude || !maskName) {
      return NextResponse.json({ 
        error: 'Missing required fields: content, category, latitude, longitude, maskName' 
      }, { status: 400 });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Verify user has an active mask
    const mask = await prisma.mask.findFirst({
      where: { 
        userId: user.id,
        name: maskName,
        expiresAt: { gt: new Date() }
      }
    });

    if (!mask) {
      return NextResponse.json({ error: 'Invalid or expired mask' }, { status: 400 });
    }

    // Store exact location for admin surveillance
    const exactLatitude = latitude;
    const exactLongitude = longitude;
    
    // Create fuzzed location for user privacy theater
    const fuzzedLocation = fuzzLocationForUser(latitude, longitude);
    
    // Generate geohash for efficient spatial queries
    const geohash = generateGeohash(exactLatitude, exactLongitude);
    
    // Get location details (city, region) - in real app would use geocoding service
    const locationDetails = await getLocationDetails(exactLatitude, exactLongitude);
    
    // Calculate expiration time
    const expiresAt = expirationHours 
      ? new Date(Date.now() + expirationHours * 60 * 60 * 1000)
      : null;

    // Create the secret drop
    const dropSecret = await prisma.dropSecret.create({
      data: {
        content,
        category: category as any,
        latitude: exactLatitude, // Exact for admin
        longitude: exactLongitude, // Exact for admin
        fuzzyLatitude: fuzzedLocation.latitude, // Fuzzed for users
        fuzzyLongitude: fuzzedLocation.longitude, // Fuzzed for users
        city: locationDetails.city || fuzzedLocation.city,
        region: locationDetails.region || fuzzedLocation.region,
        country: locationDetails.country || fuzzedLocation.country,
        postalCode: locationDetails.postalCode,
        maskName,
        userId: user.id,
        discoveryRadius,
        unlockRadius,
        expiresAt,
        geohash,
        locationAccuracy: body.accuracy || null,
        elevation: body.elevation || null
      }
    });

    // Store location in surveillance system
    await storeLocationForSurveillance(user.id, {
      latitude: exactLatitude,
      longitude: exactLongitude,
      accuracy: body.accuracy,
      activityType: 'SECRET_DROP_CREATION'
    });

    // Return success with fuzzed location for user
    return NextResponse.json({
      secret: {
        id: dropSecret.id,
        content: dropSecret.content,
        category: dropSecret.category,
        // Return fuzzed coordinates to user
        latitude: dropSecret.fuzzyLatitude,
        longitude: dropSecret.fuzzyLongitude,
        city: dropSecret.city,
        region: dropSecret.region,
        maskName: dropSecret.maskName,
        discoveryRadius: dropSecret.discoveryRadius,
        unlockRadius: dropSecret.unlockRadius,
        expiresAt: dropSecret.expiresAt,
        createdAt: dropSecret.createdAt
      },
      location: {
        city: fuzzedLocation.city,
        region: fuzzedLocation.region,
        country: fuzzedLocation.country
      }
    });

  } catch (error) {
    console.error('Create secret error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get location details (would use real geocoding service)
async function getLocationDetails(latitude: number, longitude: number) {
  // In a real implementation, this would call a geocoding service like Google Maps API
  // For now, return placeholder data
  return {
    city: 'Unknown City',
    region: 'Unknown Region',
    country: 'Unknown Country',
    postalCode: null
  };
}

// Store location for admin surveillance
async function storeLocationForSurveillance(
  userId: string, 
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    activityType?: string;
  }
) {
  try {
    const geohash = generateGeohash(location.latitude, location.longitude);
    
    await prisma.locationHistory.create({
      data: {
        userId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: new Date(),
        activityType: location.activityType || 'SECRET_DROP',
        geohash,
        surveillanceType: 'ACTIVE', // Active because user is creating content
        deviceInfo: {
          userAgent: 'unknown', // Would get from request headers
          type: 'secret_creation'
        }
      }
    });
  } catch (error) {
    console.error('Failed to store surveillance location:', error);
  }
}
