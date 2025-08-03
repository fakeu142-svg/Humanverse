import { db } from './db';

export interface RealTimeUpdate {
  type: 'NEW_CONTENT' | 'CONTENT_UPDATED' | 'CONTENT_REMOVED' | 'ADMIN_MANIPULATION' | 'TRENDING_UPDATED';
  contentId?: string;
  content?: any;
  updates?: any;
  userId?: string;
  timestamp: Date;
  metadata?: any;
}

export interface ContentUpdateEvent {
  id: string;
  eventType: string;
  contentId: string;
  contentType: string;
  userId?: string;
  adminId?: string;
  changes: any;
  timestamp: Date;
  propagated: boolean;
}

class RealTimeUpdateManager {
  private subscribers: Map<string, Set<(update: RealTimeUpdate) => void>> = new Map();
  private adminSubscribers: Set<(update: RealTimeUpdate) => void> = new Set();
  private updateQueue: RealTimeUpdate[] = [];
  private processing = false;

  // Subscribe to real-time updates for a specific channel
  subscribe(channel: string, callback: (update: RealTimeUpdate) => void): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    
    this.subscribers.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(channel)?.delete(callback);
      if (this.subscribers.get(channel)?.size === 0) {
        this.subscribers.delete(channel);
      }
    };
  }

  // Subscribe to admin-level updates
  subscribeAdmin(callback: (update: RealTimeUpdate) => void): () => void {
    this.adminSubscribers.add(callback);
    
    return () => {
      this.adminSubscribers.delete(callback);
    };
  }

  // Publish update to subscribers
  publish(channel: string, update: RealTimeUpdate) {
    // Add to queue for processing
    this.updateQueue.push(update);
    
    // Immediate delivery to subscribers
    const channelSubscribers = this.subscribers.get(channel);
    if (channelSubscribers) {
      channelSubscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('Error in real-time update callback:', error);
        }
      });
    }

    // Always notify admin subscribers
    this.adminSubscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in admin real-time update callback:', error);
      }
    });

    // Process queue if not already processing
    if (!this.processing) {
      this.processUpdateQueue();
    }
  }

  // Process queued updates (for persistence, analytics, etc.)
  private async processUpdateQueue() {
    if (this.processing || this.updateQueue.length === 0) return;
    
    this.processing = true;
    
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift()!;
      
      try {
        await this.persistUpdate(update);
        await this.triggerAutomatedResponses(update);
      } catch (error) {
        console.error('Error processing real-time update:', error);
      }
    }
    
    this.processing = false;
  }

  // Persist update to database for admin surveillance
  private async persistUpdate(update: RealTimeUpdate) {
    try {
      await db.realTimeEvent.create({
        data: {
          eventType: update.type,
          contentId: update.contentId,
          userId: update.userId,
          data: update as any,
          timestamp: update.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to persist real-time update:', error);
    }
  }

  // Trigger automated responses to updates
  private async triggerAutomatedResponses(update: RealTimeUpdate) {
    switch (update.type) {
      case 'NEW_CONTENT':
        await this.handleNewContent(update);
        break;
      case 'ADMIN_MANIPULATION':
        await this.handleAdminManipulation(update);
        break;
      case 'CONTENT_UPDATED':
        await this.handleContentUpdate(update);
        break;
    }
  }

  private async handleNewContent(update: RealTimeUpdate) {
    if (!update.content) return;

    // Trigger content analysis
    await this.analyzeNewContent(update.content);
    
    // Check for automated moderation triggers
    await this.checkModerationTriggers(update.content);
    
    // Update trending calculations
    await this.updateTrendingScores(update.content);
  }

  private async handleAdminManipulation(update: RealTimeUpdate) {
    // Log admin action for audit trail
    await db.adminAuditLog.create({
      data: {
        adminId: update.userId!,
        action: 'REAL_TIME_MANIPULATION',
        details: update.metadata || {},
        timestamp: update.timestamp
      }
    }).catch(console.error);
  }

  private async handleContentUpdate(update: RealTimeUpdate) {
    // Propagate changes to related systems
    if (update.contentId && update.updates) {
      await this.propagateContentChanges(update.contentId, update.updates);
    }
  }

  private async analyzeNewContent(content: any) {
    // Analyze content for psychological markers, sentiment, etc.
    try {
      const analysis = await this.performContentAnalysis(content);
      
      if (analysis.riskScore > 0.8) {
        // High-risk content detected
        this.publish('admin_alerts', {
          type: 'CONTENT_UPDATED',
          contentId: content.id,
          updates: { riskScore: analysis.riskScore },
          timestamp: new Date(),
          metadata: { alertType: 'HIGH_RISK_CONTENT', analysis }
        });
      }
    } catch (error) {
      console.error('Content analysis failed:', error);
    }
  }

  private async checkModerationTriggers(content: any) {
    // Check against automated moderation rules
    const triggers = await db.moderationRule.findMany({
      where: { isActive: true }
    });

    for (const trigger of triggers) {
      if (this.contentMatchesTrigger(content, trigger)) {
        await this.executeModerationAction(content, trigger);
      }
    }
  }

  private contentMatchesTrigger(content: any, trigger: any): boolean {
    // Simplified trigger matching
    const patterns = trigger.patterns || [];
    const contentText = content.content?.toLowerCase() || '';
    
    return patterns.some((pattern: string) => 
      contentText.includes(pattern.toLowerCase())
    );
  }

  private async executeModerationAction(content: any, trigger: any) {
    const action = trigger.action || 'FLAG';
    
    switch (action) {
      case 'SUPPRESS':
        await this.suppressContent(content.id);
        break;
      case 'FLAG':
        await this.flagContent(content.id, trigger.reason);
        break;
      case 'REMOVE':
        await this.removeContent(content.id);
        break;
    }
  }

  private async updateTrendingScores(content: any) {
    // Update trending calculations based on new content
    try {
      await db.trendingCalculation.create({
        data: {
          contentId: content.id,
          contentType: content.type,
          engagementScore: content.engagementScore || 0,
          timestamp: new Date(),
          needsRecalculation: true
        }
      });
    } catch (error) {
      console.error('Failed to update trending scores:', error);
    }
  }

  private async propagateContentChanges(contentId: string, updates: any) {
    // Propagate changes to cached data, recommendations, etc.
    this.publish('content_updates', {
      type: 'CONTENT_UPDATED',
      contentId,
      updates,
      timestamp: new Date()
    });
  }

  private async performContentAnalysis(content: any) {
    // Simplified content analysis
    const text = content.content || '';
    const riskWords = ['dangerous', 'illegal', 'harm', 'violence', 'threat'];
    
    let riskScore = 0;
    riskWords.forEach(word => {
      if (text.toLowerCase().includes(word)) {
        riskScore += 0.2;
      }
    });

    return {
      riskScore: Math.min(riskScore, 1.0),
      sentiment: this.analyzeSentiment(text),
      topics: this.extractTopics(text)
    };
  }

  private analyzeSentiment(text: string): number {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'amazing', 'wonderful', 'excellent'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting'];
    
    let score = 0;
    const words = text.toLowerCase().split(' ');
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.1;
      if (negativeWords.includes(word)) score -= 0.1;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private extractTopics(text: string): string[] {
    // Simplified topic extraction
    const topics = ['technology', 'politics', 'relationships', 'work', 'health'];
    return topics.filter(topic => 
      text.toLowerCase().includes(topic)
    );
  }

  private async suppressContent(contentId: string) {
    await db.adminContentControl.create({
      data: {
        contentId,
        contentType: 'UNKNOWN',
        adminId: 'SYSTEM',
        action: 'SUPPRESS',
        strength: 10,
        reason: 'Automated suppression',
        isActive: true
      }
    }).catch(console.error);
  }

  private async flagContent(contentId: string, reason: string) {
    await db.contentFlag.create({
      data: {
        contentId,
        reason,
        flaggedBy: 'SYSTEM',
        timestamp: new Date()
      }
    }).catch(console.error);
  }

  private async removeContent(contentId: string) {
    // Mark content as removed rather than deleting
    await db.contentRemoval.create({
      data: {
        contentId,
        reason: 'Automated removal',
        removedBy: 'SYSTEM',
        timestamp: new Date()
      }
    }).catch(console.error);
  }
}

// Singleton instance
export const realTimeManager = new RealTimeUpdateManager();

// Convenience functions for common operations
export function publishNewContent(content: any, userId?: string) {
  realTimeManager.publish('feed_updates', {
    type: 'NEW_CONTENT',
    contentId: content.id,
    content,
    userId,
    timestamp: new Date()
  });
}

export function publishContentUpdate(contentId: string, updates: any, userId?: string) {
  realTimeManager.publish('feed_updates', {
    type: 'CONTENT_UPDATED',
    contentId,
    updates,
    userId,
    timestamp: new Date()
  });
}

export function publishContentRemoval(contentId: string, userId?: string) {
  realTimeManager.publish('feed_updates', {
    type: 'CONTENT_REMOVED',
    contentId,
    userId,
    timestamp: new Date()
  });
}

export function publishAdminManipulation(contentId: string, action: string, adminId: string, details: any) {
  realTimeManager.publish('admin_updates', {
    type: 'ADMIN_MANIPULATION',
    contentId,
    userId: adminId,
    timestamp: new Date(),
    metadata: { action, details }
  });
}

export function publishTrendingUpdate(trending: any[]) {
  realTimeManager.publish('trending_updates', {
    type: 'TRENDING_UPDATED',
    timestamp: new Date(),
    metadata: { trending }
  });
}

// Hook for React components to subscribe to real-time updates
export function useRealTimeUpdates(channel: string) {
  const [updates, setUpdates] = React.useState<RealTimeUpdate[]>([]);
  
  React.useEffect(() => {
    const unsubscribe = realTimeManager.subscribe(channel, (update) => {
      setUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100 updates
    });
    
    return unsubscribe;
  }, [channel]);
  
  return updates;
}

// Admin hook for monitoring all real-time activity
export function useAdminRealTimeMonitor() {
  const [updates, setUpdates] = React.useState<RealTimeUpdate[]>([]);
  
  React.useEffect(() => {
    const unsubscribe = realTimeManager.subscribeAdmin((update) => {
      setUpdates(prev => [update, ...prev.slice(0, 199)]); // Keep last 200 updates for admin
    });
    
    return unsubscribe;
  }, []);
  
  return updates;
}

// Server-side functions for triggering updates
export async function triggerContentUpdate(contentId: string, updates: any, userId?: string) {
  // Update database
  try {
    // Update the actual content in database based on type
    // This would need to be implemented based on your content models
    
    // Publish real-time update
    publishContentUpdate(contentId, updates, userId);
    
    return true;
  } catch (error) {
    console.error('Failed to trigger content update:', error);
    return false;
  }
}

export async function triggerAdminContentManipulation(
  contentId: string, 
  action: string, 
  strength: number, 
  adminId: string
) {
  try {
    // Create admin control record
    await db.adminContentControl.create({
      data: {
        contentId,
        contentType: 'UNKNOWN', // This should be determined based on content
        adminId,
        action: action as any,
        strength,
        reason: 'Real-time manipulation',
        isActive: true
      }
    });
    
    // Publish real-time update
    publishAdminManipulation(contentId, action, adminId, { strength });
    
    return true;
  } catch (error) {
    console.error('Failed to trigger admin manipulation:', error);
    return false;
  }
}

// Initialize real-time system (call this on app startup)
export function initializeRealTimeSystem() {
  console.log('Real-time update system initialized');
  
  // Set up periodic trending updates
  setInterval(() => {
    // Recalculate and publish trending updates
    updateTrendingPeriodically();
  }, 5 * 60 * 1000); // Every 5 minutes
}

async function updateTrendingPeriodically() {
  try {
    // This would fetch current trending data and publish updates
    // Implementation depends on your trending calculation logic
    publishTrendingUpdate([]);
  } catch (error) {
    console.error('Failed to update trending periodically:', error);
  }
}

// React import for hooks
import React from 'react';
