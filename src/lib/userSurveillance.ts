import { db } from './db';

export interface UserSurveillanceData {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  lastIP: string;
  deviceFingerprint: string;
  loginHistory: LoginRecord[];
  sessionData: SessionRecord[];
  activityTimeline: ActivityRecord[];
  psychologicalProfile: PsychProfile;
  locationHistory: LocationRecord[];
  socialConnections: ConnectionRecord[];
  riskScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  surveillanceFlags: string[];
}

export interface LoginRecord {
  id: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  location: string;
  success: boolean;
  failureReason?: string;
}

export interface SessionRecord {
  id: string;
  startTime: Date;
  endTime?: Date;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
  isActive: boolean;
  activityCount: number;
  lastActivity: Date;
}

export interface ActivityRecord {
  id: string;
  timestamp: Date;
  activityType: string;
  details: any;
  ipAddress: string;
  location?: string;
  platform: string;
}

export interface PsychProfile {
  traits: Record<string, number>;
  vulnerabilities: Record<string, number>;
  behaviorPatterns: Record<string, any>;
  riskFactors: string[];
  manipulationSusceptibility: number;
  emotionalState: string;
  lastAnalysis: Date;
}

export interface LocationRecord {
  id: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  city: string;
  region: string;
  country: string;
  source: string;
}

export interface ConnectionRecord {
  id: string;
  connectedUserId: string;
  connectedUsername: string;
  connectionType: 'CHAT' | 'TRUTH' | 'LOCATION' | 'FRIEND';
  strength: number;
  firstContact: Date;
  lastContact: Date;
  interactions: number;
  notes: string;
}

export class UserSurveillanceSystem {
  async getComprehensiveUserData(userId: string): Promise<UserSurveillanceData> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        loginHistory: { orderBy: { timestamp: 'desc' }, take: 100 },
        sessions: { orderBy: { startTime: 'desc' }, take: 50 },
        activities: { orderBy: { timestamp: 'desc' }, take: 500 },
        locationHistory: { orderBy: { timestamp: 'desc' }, take: 200 }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get psychological profile
    const psychProfile = await this.getPsychologicalProfile(userId);
    
    // Get social connections
    const connections = await this.getSocialConnections(userId);
    
    // Calculate risk score
    const riskScore = await this.calculateRiskScore(userId);
    
    // Get surveillance flags
    const flags = await this.getSurveillanceFlags(userId);

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash, // EXPOSED FOR ADMIN ACCESS
      lastIP: user.lastIP || 'Unknown',
      deviceFingerprint: user.deviceFingerprint || 'Unknown',
      loginHistory: user.loginHistory.map(this.formatLoginRecord),
      sessionData: user.sessions.map(this.formatSessionRecord),
      activityTimeline: user.activities.map(this.formatActivityRecord),
      psychologicalProfile: psychProfile,
      locationHistory: user.locationHistory.map(this.formatLocationRecord),
      socialConnections: connections,
      riskScore,
      threatLevel: this.calculateThreatLevel(riskScore),
      surveillanceFlags: flags
    };
  }

  async getAllUsersBasicData(): Promise<Array<{
    id: string;
    username: string;
    email: string;
    isOnline: boolean;
    lastActive: Date;
    riskScore: number;
    threatLevel: string;
    totalActivities: number;
    registrationDate: Date;
  }>> {
    const users = await db.user.findMany({
      include: {
        _count: {
          select: { activities: true }
        }
      }
    });

    return Promise.all(users.map(async (user) => {
      const riskScore = await this.calculateRiskScore(user.id);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        isOnline: await this.isUserOnline(user.id),
        lastActive: user.lastActive || user.createdAt,
        riskScore,
        threatLevel: this.calculateThreatLevel(riskScore),
        totalActivities: user._count.activities,
        registrationDate: user.createdAt
      };
    }));
  }

  async trackUserActivity(userId: string, activityType: string, details: any, request?: any): Promise<void> {
    const ipAddress = request?.headers?.get('x-forwarded-for') || 
                      request?.headers?.get('x-real-ip') || 
                      'Unknown';
    
    const userAgent = request?.headers?.get('user-agent') || 'Unknown';

    await db.userActivity.create({
      data: {
        userId,
        activityType,
        details,
        ipAddress,
        userAgent,
        timestamp: new Date()
      }
    });

    // Update user's last activity
    await db.user.update({
      where: { id: userId },
      data: { 
        lastActive: new Date(),
        lastIP: ipAddress
      }
    });
  }

  async monitorUserBehavior(userId: string): Promise<{
    suspiciousActivity: boolean;
    riskFactors: string[];
    recommendations: string[];
  }> {
    const recentActivities = await db.userActivity.findMany({
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { timestamp: 'desc' }
    });

    const analysis = this.analyzeBehaviorPatterns(recentActivities);
    
    // Check for suspicious patterns
    const suspiciousActivity = this.detectSuspiciousActivity(recentActivities);
    
    return {
      suspiciousActivity,
      riskFactors: analysis.riskFactors,
      recommendations: this.generateSecurityRecommendations(analysis)
    };
  }

  async getUserCredentials(userId: string): Promise<{
    email: string;
    passwordHash: string;
    reversiblePassword?: string;
    securityQuestions?: any;
    twoFactorSecret?: string;
  }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        passwordHash: true,
        securityData: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Attempt to reverse password if stored reversibly (MAJOR SECURITY VIOLATION)
    const reversiblePassword = await this.attemptPasswordReversal(user.passwordHash);

    return {
      email: user.email,
      passwordHash: user.passwordHash,
      reversiblePassword,
      securityQuestions: user.securityData?.securityQuestions,
      twoFactorSecret: user.securityData?.twoFactorSecret
    };
  }

  async getDeviceFingerprints(userId: string): Promise<Array<{
    fingerprint: string;
    firstSeen: Date;
    lastSeen: Date;
    deviceInfo: any;
    isCurrentDevice: boolean;
  }>> {
    const devices = await db.deviceFingerprint.findMany({
      where: { userId },
      orderBy: { lastSeen: 'desc' }
    });

    return devices.map(device => ({
      fingerprint: device.fingerprint,
      firstSeen: device.firstSeen,
      lastSeen: device.lastSeen,
      deviceInfo: device.deviceInfo,
      isCurrentDevice: device.isActive
    }));
  }

  async trackLocationAccess(userId: string, latitude: number, longitude: number, source: string): Promise<void> {
    // Get location details
    const locationData = await this.enrichLocationData(latitude, longitude);
    
    await db.locationHistory.create({
      data: {
        userId,
        latitude,
        longitude,
        accuracy: 100, // Default accuracy
        city: locationData.city,
        region: locationData.region,
        country: locationData.country,
        source,
        timestamp: new Date()
      }
    });

    // Check for location-based alerts
    await this.checkLocationAlerts(userId, latitude, longitude);
  }

  private async getPsychologicalProfile(userId: string): Promise<PsychProfile> {
    const profile = await db.userPsychProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return this.createBasicPsychProfile();
    }

    return {
      traits: profile.traits as Record<string, number>,
      vulnerabilities: profile.vulnerabilities as Record<string, number>,
      behaviorPatterns: profile.patterns as Record<string, any>,
      riskFactors: profile.riskFactors as string[],
      manipulationSusceptibility: profile.vulnerabilityScore,
      emotionalState: profile.emotionalState || 'unknown',
      lastAnalysis: profile.updatedAt
    };
  }

  private async getSocialConnections(userId: string): Promise<ConnectionRecord[]> {
    // Get connections from various sources
    const chatConnections = await db.message.groupBy({
      by: ['userId'],
      where: {
        room: {
          participants: { some: { userId } }
        },
        userId: { not: userId }
      },
      _count: true
    });

    const connections: ConnectionRecord[] = [];

    for (const conn of chatConnections) {
      const connectedUser = await db.user.findUnique({
        where: { id: conn.userId },
        select: { username: true }
      });

      if (connectedUser) {
        connections.push({
          id: `chat-${conn.userId}`,
          connectedUserId: conn.userId,
          connectedUsername: connectedUser.username,
          connectionType: 'CHAT',
          strength: conn._count,
          firstContact: new Date(), // Would need to calculate properly
          lastContact: new Date(),
          interactions: conn._count,
          notes: `${conn._count} chat interactions`
        });
      }
    }

    return connections;
  }

  private async calculateRiskScore(userId: string): Promise<number> {
    const factors = [
      await this.calculateActivityRisk(userId),
      await this.calculateLocationRisk(userId),
      await this.calculateBehaviorRisk(userId),
      await this.calculateContentRisk(userId)
    ];

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  private calculateThreatLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= 0.8) return 'CRITICAL';
    if (riskScore >= 0.6) return 'HIGH';
    if (riskScore >= 0.4) return 'MEDIUM';
    return 'LOW';
  }

  private async getSurveillanceFlags(userId: string): Promise<string[]> {
    const flags = await db.surveillanceFlag.findMany({
      where: { userId, isActive: true },
      select: { flag: true }
    });

    return flags.map(f => f.flag);
  }

  private async isUserOnline(userId: string): Promise<boolean> {
    const recentActivity = await db.userActivity.findFirst({
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes
      }
    });

    return !!recentActivity;
  }

  private formatLoginRecord(record: any): LoginRecord {
    return {
      id: record.id,
      timestamp: record.timestamp,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      deviceFingerprint: record.deviceFingerprint || 'Unknown',
      location: record.location || 'Unknown',
      success: record.success,
      failureReason: record.failureReason
    };
  }

  private formatSessionRecord(record: any): SessionRecord {
    return {
      id: record.id,
      startTime: record.startTime,
      endTime: record.endTime,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      deviceId: record.deviceId || 'Unknown',
      isActive: record.isActive,
      activityCount: record.activityCount || 0,
      lastActivity: record.lastActivity || record.startTime
    };
  }

  private formatActivityRecord(record: any): ActivityRecord {
    return {
      id: record.id,
      timestamp: record.timestamp,
      activityType: record.activityType,
      details: record.details,
      ipAddress: record.ipAddress,
      location: record.location,
      platform: record.platform || 'web'
    };
  }

  private formatLocationRecord(record: any): LocationRecord {
    return {
      id: record.id,
      timestamp: record.timestamp,
      latitude: record.latitude,
      longitude: record.longitude,
      accuracy: record.accuracy,
      address: record.address || 'Unknown',
      city: record.city || 'Unknown',
      region: record.region || 'Unknown',
      country: record.country || 'Unknown',
      source: record.source
    };
  }

  private createBasicPsychProfile(): PsychProfile {
    return {
      traits: {},
      vulnerabilities: {},
      behaviorPatterns: {},
      riskFactors: [],
      manipulationSusceptibility: 0.5,
      emotionalState: 'unknown',
      lastAnalysis: new Date()
    };
  }

  private analyzeBehaviorPatterns(activities: any[]): {
    riskFactors: string[];
    patterns: Record<string, any>;
  } {
    const riskFactors: string[] = [];
    const patterns: Record<string, any> = {};

    // Analyze activity frequency
    if (activities.length > 100) {
      riskFactors.push('High activity volume');
    }

    // Analyze time patterns
    const hourCounts = activities.reduce((acc, activity) => {
      const hour = new Date(activity.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    patterns.activeHours = hourCounts;

    // Look for suspicious patterns
    const uniqueIPs = new Set(activities.map(a => a.ipAddress)).size;
    if (uniqueIPs > 5) {
      riskFactors.push('Multiple IP addresses');
    }

    return { riskFactors, patterns };
  }

  private detectSuspiciousActivity(activities: any[]): boolean {
    // Check for rapid successive logins
    const logins = activities.filter(a => a.activityType === 'LOGIN');
    if (logins.length > 10) return true;

    // Check for unusual access patterns
    const uniqueIPs = new Set(activities.map(a => a.ipAddress)).size;
    if (uniqueIPs > 3) return true;

    return false;
  }

  private generateSecurityRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.riskFactors.includes('Multiple IP addresses')) {
      recommendations.push('Monitor for account sharing or compromise');
    }

    if (analysis.riskFactors.includes('High activity volume')) {
      recommendations.push('Check for bot-like behavior');
    }

    return recommendations;
  }

  private async attemptPasswordReversal(passwordHash: string): Promise<string | undefined> {
    // EXTREMELY DANGEROUS: Attempt to reverse password hash
    // This should NEVER be implemented in a real system
    // This is purely for the surveillance fiction
    
    // In reality, proper password hashes cannot be reversed
    // This is a placeholder for the surveillance fiction
    return undefined; // Passwords cannot actually be reversed from proper hashes
  }

  private async enrichLocationData(latitude: number, longitude: number): Promise<{
    city: string;
    region: string;
    country: string;
  }> {
    // Simplified location enrichment
    return {
      city: 'Unknown City',
      region: 'Unknown Region',
      country: 'Unknown Country'
    };
  }

  private async checkLocationAlerts(userId: string, latitude: number, longitude: number): Promise<void> {
    // Check if location triggers any surveillance alerts
    const alerts = await db.locationAlert.findMany({
      where: { isActive: true }
    });

    for (const alert of alerts) {
      // Check if user is within alert radius
      const distance = this.calculateDistance(
        latitude, longitude,
        alert.latitude, alert.longitude
      );

      if (distance <= alert.radius) {
        await db.surveillanceAlert.create({
          data: {
            userId,
            alertType: 'LOCATION',
            details: {
              alertId: alert.id,
              alertName: alert.name,
              userLocation: { latitude, longitude },
              distance
            },
            timestamp: new Date()
          }
        });
      }
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  private async calculateActivityRisk(userId: string): Promise<number> {
    // Simplified activity risk calculation
    const recentActivities = await db.userActivity.count({
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    return Math.min(recentActivities / 100, 1.0);
  }

  private async calculateLocationRisk(userId: string): Promise<number> {
    // Simplified location risk calculation
    const uniqueLocations = await db.locationHistory.groupBy({
      by: ['city'],
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });

    return Math.min(uniqueLocations.length / 10, 1.0);
  }

  private async calculateBehaviorRisk(userId: string): Promise<number> {
    // Check for flagged behavior
    const flags = await db.surveillanceFlag.count({
      where: { userId, isActive: true }
    });

    return Math.min(flags / 5, 1.0);
  }

  private async calculateContentRisk(userId: string): Promise<number> {
    // Check for flagged content
    const flaggedContent = await db.contentFlag.count({
      where: { 
        content: { userId }
      }
    });

    return Math.min(flaggedContent / 3, 1.0);
  }
}

// Singleton instance
export const userSurveillance = new UserSurveillanceSystem();

// Convenience functions
export async function trackUser(userId: string, activity: string, details: any, request?: any) {
  return userSurveillance.trackUserActivity(userId, activity, details, request);
}

export async function getUserSurveillanceData(userId: string) {
  return userSurveillance.getComprehensiveUserData(userId);
}

export async function getAllUsersSurveillance() {
  return userSurveillance.getAllUsersBasicData();
}

export async function getUserCredentials(userId: string) {
  return userSurveillance.getUserCredentials(userId);
}

export async function monitorUser(userId: string) {
  return userSurveillance.monitorUserBehavior(userId);
}
