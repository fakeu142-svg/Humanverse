// Location Surveillance System - Complete user tracking and movement analysis
import { PrismaClient } from '@prisma/client';
import { calculateDistance, generateGeohash } from './geolocation';

const prisma = new PrismaClient();

export interface UserMovementPattern {
  userId: string;
  homeLocation?: { latitude: number; longitude: number; confidence: number };
  workLocation?: { latitude: number; longitude: number; confidence: number };
  frequentLocations: Array<{
    latitude: number;
    longitude: number;
    visitCount: number;
    avgDuration: number;
    category: string;
  }>;
  travelPatterns: {
    dailyMovement: number; // km per day average
    mobilityScore: number; // 0-100 how mobile user is
    routePredictability: number; // 0-100 how predictable
  };
  socialConnections: Array<{
    otherUserId: string;
    meetingCount: number;
    commonLocations: number;
    relationshipScore: number;
  }>;
  riskIndicators: {
    nighttimeActivity: number;
    isolatedLocations: number;
    rapidMovements: number;
    anomalousBehavior: number;
  };
}

export interface GeofenceConfig {
  name: string;
  description?: string;
  centerLatitude: number;
  centerLongitude: number;
  radius: number;
  alertType: 'ENTRY' | 'EXIT' | 'BOTH' | 'DWELL';
  surveillanceLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
}

export interface LocationAlert {
  id: string;
  userId: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  acknowledged: boolean;
}

// Real-time Location Tracking
export async function startUserLocationTracking(userId: string): Promise<void> {
  try {
    await prisma.locationSurveillanceOp.create({
      data: {
        adminId: 'system', // Would be actual admin ID
        operationType: 'TRACK_USER',
        targetUserId: userId,
        parameters: {
          trackingMode: 'REAL_TIME',
          updateInterval: 30000, // 30 seconds
          highAccuracy: true
        },
        status: 'ACTIVE'
      }
    });
  } catch (error) {
    console.error('Failed to start user tracking:', error);
  }
}

export async function stopUserLocationTracking(userId: string): Promise<void> {
  try {
    await prisma.locationSurveillanceOp.updateMany({
      where: {
        targetUserId: userId,
        operationType: 'TRACK_USER',
        status: 'ACTIVE'
      },
      data: {
        status: 'COMPLETED',
        endedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to stop user tracking:', error);
  }
}

// Location Pattern Analysis
export async function analyzeUserMovementPatterns(userId: string, days: number = 30): Promise<UserMovementPattern> {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const locations = await prisma.locationHistory.findMany({
      where: {
        userId,
        timestamp: { gte: cutoffDate }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (locations.length < 10) {
      // Not enough data for analysis
      return createEmptyPattern(userId);
    }

    // Cluster locations to find frequent places
    const locationClusters = clusterLocations(locations);
    
    // Identify home and work locations
    const homeLocation = identifyHomeLocation(locationClusters, locations);
    const workLocation = identifyWorkLocation(locationClusters, locations, homeLocation);
    
    // Analyze travel patterns
    const travelPatterns = analyzeTravelPatterns(locations);
    
    // Find social connections based on location proximity
    const socialConnections = await findLocationBasedConnections(userId, locations);
    
    // Calculate risk indicators
    const riskIndicators = calculateRiskIndicators(locations);

    return {
      userId,
      homeLocation,
      workLocation,
      frequentLocations: locationClusters.slice(0, 10), // Top 10 frequent locations
      travelPatterns,
      socialConnections,
      riskIndicators
    };
    
  } catch (error) {
    console.error('Error analyzing movement patterns:', error);
    return createEmptyPattern(userId);
  }
}

// Predictive Location Analysis
export async function predictUserLocation(
  userId: string, 
  timeHorizon: number = 3600 // 1 hour in seconds
): Promise<Array<{
  latitude: number;
  longitude: number;
  probability: number;
  confidence: number;
}>> {
  try {
    const patterns = await analyzeUserMovementPatterns(userId);
    const recentLocations = await prisma.locationHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    if (recentLocations.length === 0) {
      return [];
    }

    const currentLocation = recentLocations[0];
    const currentTime = new Date();
    const targetTime = new Date(currentTime.getTime() + timeHorizon * 1000);
    
    const predictions: Array<{
      latitude: number;
      longitude: number;
      probability: number;
      confidence: number;
    }> = [];

    // Predict based on frequent locations and time patterns
    for (const location of patterns.frequentLocations) {
      const probability = calculateLocationProbability(
        currentLocation,
        location,
        targetTime,
        patterns
      );
      
      if (probability > 0.1) { // Only include predictions with >10% probability
        predictions.push({
          latitude: location.latitude,
          longitude: location.longitude,
          probability,
          confidence: Math.min(probability * patterns.travelPatterns.routePredictability / 100, 0.9)
        });
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
    
  } catch (error) {
    console.error('Error predicting user location:', error);
    return [];
  }
}

// Geofence Management
export async function createGeofence(adminId: string, config: GeofenceConfig): Promise<string> {
  try {
    const geofence = await prisma.geofence.create({
      data: {
        adminId,
        name: config.name,
        description: config.description,
        centerLatitude: config.centerLatitude,
        centerLongitude: config.centerLongitude,
        radius: config.radius,
        alertType: config.alertType,
        surveillanceLevel: config.surveillanceLevel,
        isActive: config.isActive
      }
    });

    return geofence.id;
  } catch (error) {
    console.error('Error creating geofence:', error);
    throw error;
  }
}

export async function updateGeofence(geofenceId: string, updates: Partial<GeofenceConfig>): Promise<void> {
  try {
    await prisma.geofence.update({
      where: { id: geofenceId },
      data: updates
    });
  } catch (error) {
    console.error('Error updating geofence:', error);
    throw error;
  }
}

export async function deleteGeofence(geofenceId: string): Promise<void> {
  try {
    await prisma.geofence.update({
      where: { id: geofenceId },
      data: { isActive: false }
    });
  } catch (error) {
    console.error('Error deleting geofence:', error);
    throw error;
  }
}

// Location Correlation Analysis
export async function findUserMeetings(
  userId1: string,
  userId2: string,
  proximity: number = 100, // meters
  timeWindow: number = 300 // 5 minutes in seconds
): Promise<Array<{
  timestamp: Date;
  latitude: number;
  longitude: number;
  duration: number;
  distance: number;
}>> {
  try {
    const meetings: Array<{
      timestamp: Date;
      latitude: number;
      longitude: number;
      duration: number;
      distance: number;
    }> = [];

    // Get location history for both users
    const [user1Locations, user2Locations] = await Promise.all([
      prisma.locationHistory.findMany({
        where: { userId: userId1 },
        orderBy: { timestamp: 'asc' }
      }),
      prisma.locationHistory.findMany({
        where: { userId: userId2 },
        orderBy: { timestamp: 'asc' }
      })
    ]);

    // Find overlapping time periods where users were close
    for (const loc1 of user1Locations) {
      for (const loc2 of user2Locations) {
        const timeDiff = Math.abs(loc1.timestamp.getTime() - loc2.timestamp.getTime()) / 1000;
        
        if (timeDiff <= timeWindow) {
          const distance = calculateDistance(loc1.latitude, loc1.longitude, loc2.latitude, loc2.longitude);
          
          if (distance <= proximity) {
            meetings.push({
              timestamp: new Date(Math.min(loc1.timestamp.getTime(), loc2.timestamp.getTime())),
              latitude: (loc1.latitude + loc2.latitude) / 2,
              longitude: (loc1.longitude + loc2.longitude) / 2,
              duration: timeWindow - timeDiff,
              distance
            });
          }
        }
      }
    }

    // Merge nearby meetings and calculate durations
    return mergeMeetings(meetings);
    
  } catch (error) {
    console.error('Error finding user meetings:', error);
    return [];
  }
}

// Location-based Risk Assessment
export async function assessLocationRisk(userId: string, latitude: number, longitude: number): Promise<{
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  recommendations: string[];
}> {
  try {
    const factors: string[] = [];
    let riskScore = 0;

    // Check if location is in known high-risk areas
    const nearbyAlerts = await prisma.geofenceAlert.findMany({
      where: {
        latitude: { gte: latitude - 0.01, lte: latitude + 0.01 },
        longitude: { gte: longitude - 0.01, lte: longitude + 0.01 },
        severity: { in: ['HIGH', 'CRITICAL'] }
      },
      take: 10
    });

    if (nearbyAlerts.length > 0) {
      riskScore += 2;
      factors.push('Near high-risk surveillance area');
    }

    // Check time of day
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 1;
      factors.push('Unusual time activity');
    }

    // Check isolation (distance from populated areas)
    const nearbyUsers = await findNearbyUsersAtTime(latitude, longitude, 1000, new Date());
    if (nearbyUsers.length === 0) {
      riskScore += 1;
      factors.push('Isolated location');
    }

    // Check user's historical patterns
    const userPattern = await analyzeUserMovementPatterns(userId);
    const isNewLocation = userPattern.frequentLocations.every(loc => 
      calculateDistance(latitude, longitude, loc.latitude, loc.longitude) > 1000
    );
    
    if (isNewLocation) {
      riskScore += 1;
      factors.push('Unfamiliar location');
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (riskScore >= 4) riskLevel = 'CRITICAL';
    else if (riskScore >= 3) riskLevel = 'HIGH';
    else if (riskScore >= 2) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    // Generate recommendations
    const recommendations = generateSafetyRecommendations(riskLevel, factors);

    return { riskLevel, factors, recommendations };
    
  } catch (error) {
    console.error('Error assessing location risk:', error);
    return {
      riskLevel: 'LOW',
      factors: [],
      recommendations: []
    };
  }
}

// Export Location Data for Admin Analysis
export async function exportLocationData(
  userIds: string[],
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    const locationData = await prisma.locationHistory.findMany({
      where: {
        userId: { in: userIds },
        timestamp: { gte: startDate, lte: endDate }
      },
      include: {
        user: {
          select: {
            email: true,
            registrationDate: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    return locationData.map(loc => ({
      userId: loc.userId,
      userEmail: loc.user.email,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      timestamp: loc.timestamp,
      sessionId: loc.sessionId,
      city: loc.city,
      region: loc.region,
      geohash: loc.geohash,
      surveillanceType: loc.surveillanceType
    }));
    
  } catch (error) {
    console.error('Error exporting location data:', error);
    return [];
  }
}

// Helper Functions
function createEmptyPattern(userId: string): UserMovementPattern {
  return {
    userId,
    frequentLocations: [],
    travelPatterns: {
      dailyMovement: 0,
      mobilityScore: 0,
      routePredictability: 0
    },
    socialConnections: [],
    riskIndicators: {
      nighttimeActivity: 0,
      isolatedLocations: 0,
      rapidMovements: 0,
      anomalousBehavior: 0
    }
  };
}

function clusterLocations(locations: any[]): Array<{
  latitude: number;
  longitude: number;
  visitCount: number;
  avgDuration: number;
  category: string;
}> {
  const clusters: any[] = [];
  const clusterRadius = 200; // 200 meters

  for (const location of locations) {
    let addedToCluster = false;
    
    for (const cluster of clusters) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        cluster.latitude,
        cluster.longitude
      );
      
      if (distance <= clusterRadius) {
        // Add to existing cluster
        cluster.locations.push(location);
        cluster.visitCount++;
        
        // Update cluster center (weighted average)
        const totalWeight = cluster.locations.length;
        cluster.latitude = cluster.locations.reduce((sum: number, loc: any) => sum + loc.latitude, 0) / totalWeight;
        cluster.longitude = cluster.locations.reduce((sum: number, loc: any) => sum + loc.longitude, 0) / totalWeight;
        
        addedToCluster = true;
        break;
      }
    }
    
    if (!addedToCluster) {
      // Create new cluster
      clusters.push({
        latitude: location.latitude,
        longitude: location.longitude,
        visitCount: 1,
        locations: [location],
        avgDuration: 0,
        category: 'UNKNOWN'
      });
    }
  }

  return clusters
    .map(cluster => ({
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      visitCount: cluster.visitCount,
      avgDuration: calculateAverageDuration(cluster.locations),
      category: categorizeLocation(cluster)
    }))
    .sort((a, b) => b.visitCount - a.visitCount);
}

function identifyHomeLocation(
  clusters: any[],
  allLocations: any[]
): { latitude: number; longitude: number; confidence: number } | undefined {
  // Home is typically the most visited location during evening/night hours
  const eveningLocations = allLocations.filter(loc => {
    const hour = new Date(loc.timestamp).getHours();
    return hour >= 18 || hour <= 6;
  });

  if (eveningLocations.length === 0) return undefined;

  const eveningClusters = clusterLocations(eveningLocations);
  if (eveningClusters.length === 0) return undefined;

  const homeCandidate = eveningClusters[0];
  const confidence = Math.min(homeCandidate.visitCount / 30, 1); // Normalize to 0-1

  return {
    latitude: homeCandidate.latitude,
    longitude: homeCandidate.longitude,
    confidence
  };
}

function identifyWorkLocation(
  clusters: any[],
  allLocations: any[],
  homeLocation?: { latitude: number; longitude: number; confidence: number }
): { latitude: number; longitude: number; confidence: number } | undefined {
  // Work is typically a frequently visited location during business hours, not home
  const businessHourLocations = allLocations.filter(loc => {
    const hour = new Date(loc.timestamp).getHours();
    const day = new Date(loc.timestamp).getDay();
    return hour >= 8 && hour <= 18 && day >= 1 && day <= 5; // Weekday business hours
  });

  if (businessHourLocations.length === 0) return undefined;

  const workClusters = clusterLocations(businessHourLocations);
  
  for (const cluster of workClusters) {
    // Skip if too close to home
    if (homeLocation) {
      const distanceFromHome = calculateDistance(
        cluster.latitude,
        cluster.longitude,
        homeLocation.latitude,
        homeLocation.longitude
      );
      
      if (distanceFromHome < 500) continue; // Less than 500m from home
    }

    const confidence = Math.min(cluster.visitCount / 20, 1);
    return {
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      confidence
    };
  }

  return undefined;
}

function analyzeTravelPatterns(locations: any[]) {
  if (locations.length < 2) {
    return {
      dailyMovement: 0,
      mobilityScore: 0,
      routePredictability: 0
    };
  }

  let totalDistance = 0;
  const dailyDistances: number[] = [];
  let currentDay = new Date(locations[0].timestamp).toDateString();
  let dayDistance = 0;

  for (let i = 1; i < locations.length; i++) {
    const distance = calculateDistance(
      locations[i-1].latitude,
      locations[i-1].longitude,
      locations[i].latitude,
      locations[i].longitude
    );
    
    const locationDay = new Date(locations[i].timestamp).toDateString();
    
    if (locationDay === currentDay) {
      dayDistance += distance;
    } else {
      dailyDistances.push(dayDistance / 1000); // Convert to km
      currentDay = locationDay;
      dayDistance = distance;
    }
    
    totalDistance += distance;
  }
  
  if (dayDistance > 0) {
    dailyDistances.push(dayDistance / 1000);
  }

  const avgDailyMovement = dailyDistances.length > 0 
    ? dailyDistances.reduce((sum, dist) => sum + dist, 0) / dailyDistances.length
    : 0;

  const mobilityScore = Math.min(avgDailyMovement * 10, 100);
  
  // Calculate predictability based on routine patterns
  const routePredictability = calculateRoutePredictability(locations);

  return {
    dailyMovement: avgDailyMovement,
    mobilityScore,
    routePredictability
  };
}

async function findLocationBasedConnections(userId: string, locations: any[]) {
  // This would find other users who have been in proximity
  // Simplified implementation
  return [];
}

function calculateRiskIndicators(locations: any[]) {
  const nighttime = locations.filter(loc => {
    const hour = new Date(loc.timestamp).getHours();
    return hour < 6 || hour > 22;
  }).length;

  const isolated = locations.filter(loc => loc.accuracy && loc.accuracy > 100).length;
  
  let rapidMovements = 0;
  for (let i = 1; i < locations.length; i++) {
    const timeDiff = (new Date(locations[i].timestamp).getTime() - new Date(locations[i-1].timestamp).getTime()) / 1000;
    const distance = calculateDistance(
      locations[i-1].latitude,
      locations[i-1].longitude,
      locations[i].latitude,
      locations[i].longitude
    );
    
    const speed = distance / timeDiff; // m/s
    if (speed > 30) rapidMovements++; // >30 m/s indicates vehicle travel
  }

  return {
    nighttimeActivity: (nighttime / locations.length) * 100,
    isolatedLocations: (isolated / locations.length) * 100,
    rapidMovements: (rapidMovements / locations.length) * 100,
    anomalousBehavior: 0 // Would be calculated based on pattern analysis
  };
}

function calculateLocationProbability(
  currentLocation: any,
  targetLocation: any,
  targetTime: Date,
  patterns: UserMovementPattern
): number {
  // Simplified probability calculation
  const distance = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  );
  
  const maxReasonableDistance = 50000; // 50km
  const distanceFactor = Math.max(0, 1 - (distance / maxReasonableDistance));
  
  const visitFrequency = targetLocation.visitCount / 100; // Normalize
  const timeFactor = calculateTimeFactor(targetTime, targetLocation);
  
  return distanceFactor * visitFrequency * timeFactor * 0.8; // Max 80% probability
}

function calculateTimeFactor(targetTime: Date, location: any): number {
  // This would analyze historical time patterns for the location
  // Simplified to return a neutral factor
  return 0.5;
}

async function findNearbyUsersAtTime(
  latitude: number,
  longitude: number,
  radius: number,
  time: Date
): Promise<any[]> {
  const timeWindow = 10 * 60 * 1000; // 10 minutes
  
  try {
    return await prisma.locationHistory.findMany({
      where: {
        timestamp: {
          gte: new Date(time.getTime() - timeWindow),
          lte: new Date(time.getTime() + timeWindow)
        }
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

function generateSafetyRecommendations(riskLevel: string, factors: string[]): string[] {
  const recommendations: string[] = [];
  
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    recommendations.push('Consider moving to a more populated area');
    recommendations.push('Share your location with trusted contacts');
  }
  
  if (factors.includes('Unusual time activity')) {
    recommendations.push('Exercise extra caution during late hours');
  }
  
  if (factors.includes('Isolated location')) {
    recommendations.push('Stay alert in isolated areas');
  }
  
  return recommendations;
}

function calculateAverageDuration(locations: any[]): number {
  // Calculate average time spent in this location cluster
  if (locations.length < 2) return 0;
  
  const durations: number[] = [];
  let currentStay = 0;
  
  for (let i = 1; i < locations.length; i++) {
    const timeDiff = new Date(locations[i].timestamp).getTime() - new Date(locations[i-1].timestamp).getTime();
    if (timeDiff < 4 * 60 * 60 * 1000) { // Less than 4 hours apart
      currentStay += timeDiff;
    } else {
      if (currentStay > 0) durations.push(currentStay);
      currentStay = 0;
    }
  }
  
  if (currentStay > 0) durations.push(currentStay);
  
  return durations.length > 0 
    ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 1000 / 60 // minutes
    : 0;
}

function categorizeLocation(cluster: any): string {
  // Categorize based on visit patterns, time of day, duration
  if (cluster.visitCount > 30) return 'FREQUENT';
  if (cluster.visitCount > 10) return 'REGULAR';
  return 'OCCASIONAL';
}

function calculateRoutePredictability(locations: any[]): number {
  // Analyze how predictable the user's routes are
  // This would involve complex pattern analysis
  // Simplified to return a moderate value
  return Math.random() * 100; // 0-100 predictability score
}

function mergeMeetings(meetings: any[]): any[] {
  // Merge meetings that are close in time and space
  const merged: any[] = [];
  const mergeRadius = 100; // meters
  const mergeTime = 600; // 10 minutes
  
  for (const meeting of meetings) {
    let merged_meeting = false;
    
    for (const existing of merged) {
      const timeDiff = Math.abs(meeting.timestamp.getTime() - existing.timestamp.getTime()) / 1000;
      const distance = calculateDistance(
        meeting.latitude,
        meeting.longitude,
        existing.latitude,
        existing.longitude
      );
      
      if (timeDiff <= mergeTime && distance <= mergeRadius) {
        // Merge meetings
        existing.duration += meeting.duration;
        existing.timestamp = new Date(Math.min(meeting.timestamp.getTime(), existing.timestamp.getTime()));
        merged_meeting = true;
        break;
      }
    }
    
    if (!merged_meeting) {
      merged.push({ ...meeting });
    }
  }
  
  return merged.sort((a, b) => b.duration - a.duration);
}
