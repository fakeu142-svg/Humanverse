import { EventEmitter } from 'events';
import { prisma } from '@/lib/db';

export interface UserActivityEvent {
  userId: string;
  sessionId: string;
  timestamp: Date;
  eventType: string;
  eventData: any;
  ipAddress: string;
  userAgent: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  deviceFingerprint: string;
  metadata: Record<string, any>;
}

export interface ProcessedActivity {
  id: string;
  userId: string;
  sessionId: string;
  eventType: string;
  rawData: any;
  processedData: any;
  timestamp: Date;
  location: any;
  riskScore: number;
  anomalyFlags: string[];
  psychologicalIndicators: any;
  behavioralPatterns: any;
  socialConnections: any;
}

export class RealTimeETLPipeline extends EventEmitter {
  private batchSize: number = 100;
  private flushInterval: number = 5000; // 5 seconds
  private activityBuffer: UserActivityEvent[] = [];
  private processingQueue: UserActivityEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startFlushTimer();
  }

  async ingestActivity(activity: UserActivityEvent): Promise<void> {
    // Add to buffer
    this.activityBuffer.push(activity);

    // Emit real-time event for immediate processing
    this.emit('activityReceived', activity);

    // Check if buffer is full
    if (this.activityBuffer.length >= this.batchSize) {
      await this.flushBuffer();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      if (this.activityBuffer.length > 0) {
        await this.flushBuffer();
      }
    }, this.flushInterval);
  }

  private async flushBuffer(): Promise<void> {
    if (this.activityBuffer.length === 0) return;

    const batch = [...this.activityBuffer];
    this.activityBuffer = [];

    try {
      await this.processBatch(batch);
    } catch (error) {
      console.error('ETL batch processing failed:', error);
      // Re-add failed items to buffer for retry
      this.activityBuffer.unshift(...batch);
    }
  }

  private async processBatch(activities: UserActivityEvent[]): Promise<void> {
    const processedActivities: ProcessedActivity[] = [];

    for (const activity of activities) {
      try {
        const processed = await this.processActivity(activity);
        processedActivities.push(processed);
      } catch (error) {
        console.error('Activity processing failed:', error, activity);
      }
    }

    // Bulk insert to database
    await this.storeProcessedActivities(processedActivities);

    // Emit processed batch event
    this.emit('batchProcessed', processedActivities);
  }

  private async processActivity(activity: UserActivityEvent): Promise<ProcessedActivity> {
    // Extract and process data
    const processedData = await this.extractFeatures(activity);
    
    // Calculate risk score
    const riskScore = await this.calculateRiskScore(activity, processedData);
    
    // Detect anomalies
    const anomalyFlags = await this.detectAnomalies(activity, processedData);
    
    // Extract psychological indicators
    const psychologicalIndicators = await this.extractPsychologicalIndicators(activity);
    
    // Analyze behavioral patterns
    const behavioralPatterns = await this.analyzeBehavioralPatterns(activity);
    
    // Map social connections
    const socialConnections = await this.mapSocialConnections(activity);

    return {
      id: `${activity.userId}_${activity.timestamp.getTime()}`,
      userId: activity.userId,
      sessionId: activity.sessionId,
      eventType: activity.eventType,
      rawData: activity,
      processedData,
      timestamp: activity.timestamp,
      location: activity.location,
      riskScore,
      anomalyFlags,
      psychologicalIndicators,
      behavioralPatterns,
      socialConnections
    };
  }

  private async extractFeatures(activity: UserActivityEvent): Promise<any> {
    const features = {
      // Temporal features
      hour: activity.timestamp.getHours(),
      dayOfWeek: activity.timestamp.getDay(),
      timeFromLastActivity: await this.getTimeSinceLastActivity(activity.userId),
      
      // Device features
      deviceType: this.extractDeviceType(activity.userAgent),
      browserType: this.extractBrowserType(activity.userAgent),
      screenResolution: activity.metadata.screenResolution,
      
      // Location features
      locationAccuracy: activity.location?.accuracy || 0,
      locationRadius: await this.calculateLocationRadius(activity.userId, activity.location),
      isNewLocation: await this.isNewLocation(activity.userId, activity.location),
      
      // Behavioral features
      typingSpeed: activity.metadata.typingSpeed || 0,
      mouseMovementPattern: activity.metadata.mousePattern,
      scrollBehavior: activity.metadata.scrollBehavior,
      
      // Content features
      messageLength: activity.eventData.messageLength || 0,
      sentimentScore: await this.analyzeSentiment(activity.eventData.content || ''),
      languageComplexity: this.analyzeLanguageComplexity(activity.eventData.content || ''),
      
      // Session features
      sessionDuration: await this.getSessionDuration(activity.sessionId),
      actionsInSession: await this.getSessionActionCount(activity.sessionId)
    };

    return features;
  }

  private async calculateRiskScore(activity: UserActivityEvent, features: any): Promise<number> {
    let score = 0;

    // Time-based risk factors
    if (features.hour < 5 || features.hour > 23) score += 10;
    if (features.timeFromLastActivity > 86400000) score += 5; // 24 hours

    // Location-based risk factors
    if (features.isNewLocation) score += 15;
    if (features.locationAccuracy > 1000) score += 5;

    // Behavioral risk factors
    if (features.typingSpeed > 150 || features.typingSpeed < 10) score += 10;
    if (features.sentimentScore < -0.5) score += 20;

    // Content risk factors
    if (activity.eventData.content) {
      const suspiciousKeywords = ['bomb', 'attack', 'kill', 'die', 'secret'];
      const content = activity.eventData.content.toLowerCase();
      suspiciousKeywords.forEach(keyword => {
        if (content.includes(keyword)) score += 25;
      });
    }

    // Device risk factors
    if (features.deviceType === 'unknown') score += 5;

    return Math.min(score, 100); // Cap at 100
  }

  private async detectAnomalies(activity: UserActivityEvent, features: any): Promise<string[]> {
    const anomalies: string[] = [];

    // Check for unusual timing
    if (features.hour < 3 || features.hour > 24) {
      anomalies.push('UNUSUAL_TIME');
    }

    // Check for rapid activity
    if (features.timeFromLastActivity < 1000) { // Less than 1 second
      anomalies.push('RAPID_ACTIVITY');
    }

    // Check for location jumps
    if (features.locationRadius > 100000) { // 100km
      anomalies.push('IMPOSSIBLE_TRAVEL');
    }

    // Check for device changes
    const lastDevice = await this.getLastDeviceFingerprint(activity.userId);
    if (lastDevice && lastDevice !== activity.deviceFingerprint) {
      anomalies.push('DEVICE_CHANGE');
    }

    // Check for unusual typing patterns
    if (features.typingSpeed > 200) {
      anomalies.push('INHUMAN_TYPING_SPEED');
    }

    return anomalies;
  }

  private async extractPsychologicalIndicators(activity: UserActivityEvent): Promise<any> {
    if (!activity.eventData.content) return {};

    const content = activity.eventData.content;
    
    return {
      emotionalTone: await this.analyzeEmotionalTone(content),
      stressIndicators: this.detectStressIndicators(content),
      personalityTraits: await this.extractPersonalityTraits(content),
      mentalHealthIndicators: this.detectMentalHealthIndicators(content),
      manipulationVulnerabilities: await this.assessManipulationVulnerabilities(activity.userId, content)
    };
  }

  private async analyzeBehavioralPatterns(activity: UserActivityEvent): Promise<any> {
    const userHistory = await this.getUserRecentHistory(activity.userId, 168); // 7 days

    return {
      communicationFrequency: this.calculateCommunicationFrequency(userHistory),
      activeHours: this.extractActiveHours(userHistory),
      locationPatterns: this.analyzeLocationPatterns(userHistory),
      socialInteractionPatterns: this.analyzeSocialPatterns(userHistory),
      contentPatterns: this.analyzeContentPatterns(userHistory)
    };
  }

  private async mapSocialConnections(activity: UserActivityEvent): Promise<any> {
    if (activity.eventType !== 'MESSAGE_SENT') return {};

    const recipientId = activity.eventData.recipientId;
    if (!recipientId) return {};

    return {
      directConnection: recipientId,
      connectionStrength: await this.calculateConnectionStrength(activity.userId, recipientId),
      mutualConnections: await this.getMutualConnections(activity.userId, recipientId),
      communicationHistory: await this.getCommunicationHistory(activity.userId, recipientId),
      influenceScore: await this.calculateInfluenceScore(activity.userId, recipientId)
    };
  }

  private async storeProcessedActivities(activities: ProcessedActivity[]): Promise<void> {
    try {
      await prisma.surveillanceActivity.createMany({
        data: activities.map(activity => ({
          id: activity.id,
          userId: activity.userId,
          sessionId: activity.sessionId,
          eventType: activity.eventType,
          rawData: activity.rawData,
          processedData: activity.processedData,
          timestamp: activity.timestamp,
          location: activity.location,
          riskScore: activity.riskScore,
          anomalyFlags: activity.anomalyFlags,
          psychologicalIndicators: activity.psychologicalIndicators,
          behavioralPatterns: activity.behavioralPatterns,
          socialConnections: activity.socialConnections
        })),
        skipDuplicates: true
      });
    } catch (error) {
      console.error('Failed to store processed activities:', error);
      throw error;
    }
  }

  // Helper methods
  private async getTimeSinceLastActivity(userId: string): Promise<number> {
    const lastActivity = await prisma.surveillanceActivity.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    });

    if (!lastActivity) return Infinity;
    return Date.now() - lastActivity.timestamp.getTime();
  }

  private extractDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    if (/desktop/i.test(userAgent)) return 'desktop';
    return 'unknown';
  }

  private extractBrowserType(userAgent: string): string {
    if (/chrome/i.test(userAgent)) return 'chrome';
    if (/firefox/i.test(userAgent)) return 'firefox';
    if (/safari/i.test(userAgent)) return 'safari';
    if (/edge/i.test(userAgent)) return 'edge';
    return 'unknown';
  }

  private async analyzeSentiment(content: string): Promise<number> {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'awesome', 'love', 'happy', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'hate', 'angry', 'sad', 'awful'];

    const words = content.toLowerCase().split(/\s+/);
    let score = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });

    return Math.max(-1, Math.min(1, score / words.length));
  }

  private analyzeLanguageComplexity(content: string): number {
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / Math.max(sentences, 1);
    const avgWordLength = content.replace(/\s+/g, '').length / words;

    return (avgWordsPerSentence * avgWordLength) / 10;
  }

  private async getUserRecentHistory(userId: string, hours: number): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await prisma.surveillanceActivity.findMany({
      where: {
        userId,
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'desc' }
    });
  }

  // Additional helper methods would be implemented here...
  private async calculateLocationRadius(userId: string, location: any): Promise<number> {
    // Implementation for location radius calculation
    return 0;
  }

  private async isNewLocation(userId: string, location: any): Promise<boolean> {
    // Implementation for new location detection
    return false;
  }

  private async getSessionDuration(sessionId: string): Promise<number> {
    // Implementation for session duration calculation
    return 0;
  }

  private async getSessionActionCount(sessionId: string): Promise<number> {
    // Implementation for session action count
    return 0;
  }

  private async getLastDeviceFingerprint(userId: string): Promise<string | null> {
    // Implementation for device fingerprint retrieval
    return null;
  }

  private async analyzeEmotionalTone(content: string): Promise<any> {
    // Implementation for emotional tone analysis
    return {};
  }

  private detectStressIndicators(content: string): string[] {
    // Implementation for stress indicator detection
    return [];
  }

  private async extractPersonalityTraits(content: string): Promise<any> {
    // Implementation for personality trait extraction
    return {};
  }

  private detectMentalHealthIndicators(content: string): string[] {
    // Implementation for mental health indicator detection
    return [];
  }

  private async assessManipulationVulnerabilities(userId: string, content: string): Promise<any> {
    // Implementation for manipulation vulnerability assessment
    return {};
  }

  private calculateCommunicationFrequency(history: any[]): number {
    // Implementation for communication frequency calculation
    return 0;
  }

  private extractActiveHours(history: any[]): number[] {
    // Implementation for active hours extraction
    return [];
  }

  private analyzeLocationPatterns(history: any[]): any {
    // Implementation for location pattern analysis
    return {};
  }

  private analyzeSocialPatterns(history: any[]): any {
    // Implementation for social pattern analysis
    return {};
  }

  private analyzeContentPatterns(history: any[]): any {
    // Implementation for content pattern analysis
    return {};
  }

  private async calculateConnectionStrength(userId1: string, userId2: string): Promise<number> {
    // Implementation for connection strength calculation
    return 0;
  }

  private async getMutualConnections(userId1: string, userId2: string): Promise<string[]> {
    // Implementation for mutual connections retrieval
    return [];
  }

  private async getCommunicationHistory(userId1: string, userId2: string): Promise<any[]> {
    // Implementation for communication history retrieval
    return [];
  }

  private async calculateInfluenceScore(userId1: string, userId2: string): Promise<number> {
    // Implementation for influence score calculation
    return 0;
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.removeAllListeners();
  }
}

// Singleton instance
export const etlPipeline = new RealTimeETLPipeline();
