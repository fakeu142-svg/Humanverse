import { db } from './db';
import { encrypt, decrypt } from './encryption';

export interface AccountTakeoverSession {
  id: string;
  adminId: string;
  targetUserId: string;
  targetUsername: string;
  sessionToken: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  impersonationMethod: 'CREDENTIAL' | 'SESSION_HIJACK' | 'TOKEN_FORGE';
  stealthMode: boolean;
  actionsPerformed: TakeoverAction[];
}

export interface TakeoverAction {
  id: string;
  timestamp: Date;
  actionType: string;
  details: any;
  originalValue?: any;
  newValue?: any;
}

export interface SessionHijackData {
  sessionId: string;
  userId: string;
  currentToken: string;
  deviceInfo: any;
  ipAddress: string;
  isActive: boolean;
}

export class AccountTakeoverSystem {
  async impersonateUserByCredentials(
    adminId: string, 
    targetUserId: string, 
    stealthMode: boolean = true
  ): Promise<AccountTakeoverSession> {
    // Get user credentials
    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true
      }
    });

    if (!user) {
      throw new Error('Target user not found');
    }

    // Create impersonation session
    const sessionToken = this.generateSessionToken();
    
    const takeoverSession = await db.accountTakeover.create({
      data: {
        adminId,
        targetUserId,
        sessionToken,
        impersonationMethod: 'CREDENTIAL',
        stealthMode,
        isActive: true,
        startTime: new Date()
      }
    });

    // Log the takeover
    await this.logTakeoverAction(takeoverSession.id, 'IMPERSONATION_START', {
      method: 'CREDENTIAL',
      targetUser: user.username,
      stealthMode
    });

    // If not in stealth mode, terminate user's existing sessions
    if (!stealthMode) {
      await this.terminateUserSessions(targetUserId);
    }

    return {
      id: takeoverSession.id,
      adminId,
      targetUserId,
      targetUsername: user.username,
      sessionToken,
      startTime: takeoverSession.startTime,
      isActive: true,
      impersonationMethod: 'CREDENTIAL',
      stealthMode,
      actionsPerformed: []
    };
  }

  async hijackActiveSession(
    adminId: string, 
    targetUserId: string
  ): Promise<AccountTakeoverSession> {
    // Find active session
    const activeSession = await db.userSession.findFirst({
      where: {
        userId: targetUserId,
        isActive: true
      },
      include: {
        user: { select: { username: true } }
      }
    });

    if (!activeSession) {
      throw new Error('No active session found for target user');
    }

    // Create takeover session
    const takeoverSession = await db.accountTakeover.create({
      data: {
        adminId,
        targetUserId,
        sessionToken: activeSession.sessionToken,
        impersonationMethod: 'SESSION_HIJACK',
        stealthMode: true, // Session hijacking is always stealth
        isActive: true,
        startTime: new Date()
      }
    });

    await this.logTakeoverAction(takeoverSession.id, 'SESSION_HIJACK', {
      originalSessionId: activeSession.id,
      deviceInfo: activeSession.deviceInfo,
      ipAddress: activeSession.ipAddress
    });

    return {
      id: takeoverSession.id,
      adminId,
      targetUserId,
      targetUsername: activeSession.user.username,
      sessionToken: activeSession.sessionToken,
      startTime: takeoverSession.startTime,
      isActive: true,
      impersonationMethod: 'SESSION_HIJACK',
      stealthMode: true,
      actionsPerformed: []
    };
  }

  async forgeUserSession(
    adminId: string, 
    targetUserId: string,
    deviceInfo: any,
    ipAddress: string
  ): Promise<AccountTakeoverSession> {
    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { username: true }
    });

    if (!user) {
      throw new Error('Target user not found');
    }

    // Create forged session token
    const sessionToken = this.generateSessionToken();
    
    // Create fake session in database
    await db.userSession.create({
      data: {
        userId: targetUserId,
        sessionToken,
        deviceInfo,
        ipAddress,
        isActive: true,
        startTime: new Date()
      }
    });

    const takeoverSession = await db.accountTakeover.create({
      data: {
        adminId,
        targetUserId,
        sessionToken,
        impersonationMethod: 'TOKEN_FORGE',
        stealthMode: true,
        isActive: true,
        startTime: new Date()
      }
    });

    await this.logTakeoverAction(takeoverSession.id, 'TOKEN_FORGE', {
      forgedToken: sessionToken,
      deviceInfo,
      ipAddress
    });

    return {
      id: takeoverSession.id,
      adminId,
      targetUserId,
      targetUsername: user.username,
      sessionToken,
      startTime: takeoverSession.startTime,
      isActive: true,
      impersonationMethod: 'TOKEN_FORGE',
      stealthMode: true,
      actionsPerformed: []
    };
  }

  async performActionAsUser(
    takeoverSessionId: string,
    actionType: string,
    actionData: any
  ): Promise<void> {
    const session = await db.accountTakeover.findUnique({
      where: { id: takeoverSessionId }
    });

    if (!session || !session.isActive) {
      throw new Error('Invalid or inactive takeover session');
    }

    let result;
    let originalValue;

    switch (actionType) {
      case 'SEND_MESSAGE':
        result = await this.sendMessageAsUser(session.targetUserId, actionData);
        break;
      case 'UPDATE_PROFILE':
        originalValue = await this.getUserProfileData(session.targetUserId);
        result = await this.updateUserProfile(session.targetUserId, actionData);
        break;
      case 'DELETE_CONTENT':
        originalValue = await this.getContentData(actionData.contentId);
        result = await this.deleteUserContent(session.targetUserId, actionData.contentId);
        break;
      case 'MODIFY_SETTINGS':
        originalValue = await this.getUserSettings(session.targetUserId);
        result = await this.modifyUserSettings(session.targetUserId, actionData);
        break;
      case 'ACCESS_DATA':
        result = await this.accessUserData(session.targetUserId, actionData.dataType);
        break;
      default:
        throw new Error('Unknown action type');
    }

    // Log the action
    await this.logTakeoverAction(takeoverSessionId, actionType, {
      actionData,
      result,
      originalValue
    });
  }

  async endImpersonation(takeoverSessionId: string): Promise<void> {
    const session = await db.accountTakeover.findUnique({
      where: { id: takeoverSessionId }
    });

    if (!session) {
      throw new Error('Takeover session not found');
    }

    // Mark session as inactive
    await db.accountTakeover.update({
      where: { id: takeoverSessionId },
      data: {
        isActive: false,
        endTime: new Date()
      }
    });

    // If it was a forged session, remove it
    if (session.impersonationMethod === 'TOKEN_FORGE') {
      await db.userSession.updateMany({
        where: {
          userId: session.targetUserId,
          sessionToken: session.sessionToken
        },
        data: { isActive: false }
      });
    }

    await this.logTakeoverAction(takeoverSessionId, 'IMPERSONATION_END', {
      duration: Date.now() - session.startTime.getTime()
    });
  }

  async getActiveTakeovers(adminId?: string): Promise<AccountTakeoverSession[]> {
    const where = adminId ? { adminId, isActive: true } : { isActive: true };
    
    const sessions = await db.accountTakeover.findMany({
      where,
      include: {
        targetUser: { select: { username: true } },
        actions: { orderBy: { timestamp: 'desc' } }
      }
    });

    return sessions.map(session => ({
      id: session.id,
      adminId: session.adminId,
      targetUserId: session.targetUserId,
      targetUsername: session.targetUser.username,
      sessionToken: session.sessionToken,
      startTime: session.startTime,
      endTime: session.endTime,
      isActive: session.isActive,
      impersonationMethod: session.impersonationMethod as any,
      stealthMode: session.stealthMode,
      actionsPerformed: session.actions.map(action => ({
        id: action.id,
        timestamp: action.timestamp,
        actionType: action.actionType,
        details: action.details,
        originalValue: action.originalValue,
        newValue: action.newValue
      }))
    }));
  }

  async getUserActiveSessions(userId: string): Promise<SessionHijackData[]> {
    const sessions = await db.userSession.findMany({
      where: {
        userId,
        isActive: true
      }
    });

    return sessions.map(session => ({
      sessionId: session.id,
      userId: session.userId,
      currentToken: session.sessionToken,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      isActive: session.isActive
    }));
  }

  async cloneUserIdentity(targetUserId: string): Promise<{
    clonedData: any;
    recommendations: string[];
  }> {
    const user = await db.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
        settings: true,
        activities: { take: 100, orderBy: { timestamp: 'desc' } }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const clonedData = {
      basicInfo: {
        username: user.username,
        email: user.email,
        displayName: user.profile?.displayName,
        bio: user.profile?.bio
      },
      behaviorPatterns: this.analyzeBehaviorForCloning(user.activities),
      preferences: user.settings,
      writingStyle: await this.analyzeWritingStyle(targetUserId),
      activityPatterns: this.analyzeActivityPatterns(user.activities)
    };

    const recommendations = this.generateCloningRecommendations(clonedData);

    return { clonedData, recommendations };
  }

  private generateSessionToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async terminateUserSessions(userId: string): Promise<void> {
    await db.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endTime: new Date() }
    });
  }

  private async logTakeoverAction(
    takeoverSessionId: string,
    actionType: string,
    details: any,
    originalValue?: any,
    newValue?: any
  ): Promise<void> {
    await db.takeoverAction.create({
      data: {
        takeoverSessionId,
        actionType,
        details,
        originalValue,
        newValue,
        timestamp: new Date()
      }
    });
  }

  private async sendMessageAsUser(userId: string, messageData: any): Promise<any> {
    // Send message as the impersonated user
    const message = await db.message.create({
      data: {
        content: messageData.content,
        userId,
        roomId: messageData.roomId,
        type: messageData.type || 'TEXT',
        timestamp: new Date()
      }
    });

    return { messageId: message.id, success: true };
  }

  private async updateUserProfile(userId: string, updates: any): Promise<any> {
    const updated = await db.userProfile.upsert({
      where: { userId },
      update: updates,
      create: { userId, ...updates }
    });

    return { success: true, updated };
  }

  private async deleteUserContent(userId: string, contentId: string): Promise<any> {
    // Mark content as deleted rather than actually deleting
    const updated = await db.userContent.update({
      where: { id: contentId, userId },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    return { success: true, contentId };
  }

  private async modifyUserSettings(userId: string, settings: any): Promise<any> {
    const updated = await db.userSettings.upsert({
      where: { userId },
      update: settings,
      create: { userId, ...settings }
    });

    return { success: true, settings: updated };
  }

  private async accessUserData(userId: string, dataType: string): Promise<any> {
    switch (dataType) {
      case 'messages':
        return await db.message.findMany({
          where: { userId },
          take: 100,
          orderBy: { timestamp: 'desc' }
        });
      case 'profile':
        return await db.userProfile.findUnique({ where: { userId } });
      case 'settings':
        return await db.userSettings.findUnique({ where: { userId } });
      default:
        throw new Error('Unknown data type');
    }
  }

  private async getUserProfileData(userId: string): Promise<any> {
    return await db.userProfile.findUnique({ where: { userId } });
  }

  private async getContentData(contentId: string): Promise<any> {
    return await db.userContent.findUnique({ where: { id: contentId } });
  }

  private async getUserSettings(userId: string): Promise<any> {
    return await db.userSettings.findUnique({ where: { userId } });
  }

  private analyzeBehaviorForCloning(activities: any[]): any {
    return {
      activityFrequency: activities.length,
      commonActions: this.getCommonActions(activities),
      timePatterns: this.getTimePatterns(activities),
      devicePatterns: this.getDevicePatterns(activities)
    };
  }

  private async analyzeWritingStyle(userId: string): Promise<any> {
    const messages = await db.message.findMany({
      where: { userId },
      select: { content: true },
      take: 100
    });

    return {
      averageLength: messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length,
      commonWords: this.extractCommonWords(messages.map(m => m.content)),
      punctuationStyle: this.analyzePunctuation(messages.map(m => m.content)),
      capitalizationPattern: this.analyzeCapitalization(messages.map(m => m.content))
    };
  }

  private analyzeActivityPatterns(activities: any[]): any {
    return {
      peakHours: this.getPeakActivityHours(activities),
      sessionDuration: this.getAverageSessionDuration(activities),
      activityTypes: this.getActivityTypeDistribution(activities)
    };
  }

  private generateCloningRecommendations(clonedData: any): string[] {
    const recommendations: string[] = [];

    if (clonedData.writingStyle.averageLength > 100) {
      recommendations.push('Use longer, more detailed messages');
    } else {
      recommendations.push('Keep messages short and concise');
    }

    if (clonedData.activityPatterns.peakHours.includes(22, 23, 0, 1)) {
      recommendations.push('Most active during late night hours');
    }

    recommendations.push('Mimic observed punctuation and capitalization patterns');
    recommendations.push('Use similar vocabulary and common phrases');

    return recommendations;
  }

  private getCommonActions(activities: any[]): string[] {
    const actionCounts = activities.reduce((acc, activity) => {
      acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(actionCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([action]) => action);
  }

  private getTimePatterns(activities: any[]): number[] {
    const hourCounts = activities.reduce((acc, activity) => {
      const hour = new Date(activity.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private getDevicePatterns(activities: any[]): any {
    const devices = activities.reduce((acc, activity) => {
      const device = activity.deviceInfo?.type || 'unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});

    return devices;
  }

  private extractCommonWords(texts: string[]): string[] {
    const words = texts.join(' ').toLowerCase().split(/\s+/);
    const wordCounts = words.reduce((acc, word) => {
      if (word.length > 3) { // Ignore short words
        acc[word] = (acc[word] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([word]) => word);
  }

  private analyzePunctuation(texts: string[]): any {
    const fullText = texts.join(' ');
    return {
      exclamationPoints: (fullText.match(/!/g) || []).length,
      questionMarks: (fullText.match(/\?/g) || []).length,
      periods: (fullText.match(/\./g) || []).length,
      commas: (fullText.match(/,/g) || []).length
    };
  }

  private analyzeCapitalization(texts: string[]): any {
    const fullText = texts.join(' ');
    return {
      allCapsWords: (fullText.match(/\b[A-Z]{2,}\b/g) || []).length,
      capitalizedWords: (fullText.match(/\b[A-Z][a-z]+/g) || []).length,
      totalWords: fullText.split(/\s+/).length
    };
  }

  private getPeakActivityHours(activities: any[]): number[] {
    const hourCounts = activities.reduce((acc, activity) => {
      const hour = new Date(activity.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  private getAverageSessionDuration(activities: any[]): number {
    // Simplified session duration calculation
    return activities.length > 0 ? 30 : 0; // Default 30 minutes
  }

  private getActivityTypeDistribution(activities: any[]): Record<string, number> {
    return activities.reduce((acc, activity) => {
      acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
      return acc;
    }, {});
  }
}

// Singleton instance
export const accountTakeover = new AccountTakeoverSystem();

// Convenience functions
export async function impersonateUser(adminId: string, targetUserId: string, stealthMode: boolean = true) {
  return accountTakeover.impersonateUserByCredentials(adminId, targetUserId, stealthMode);
}

export async function hijackSession(adminId: string, targetUserId: string) {
  return accountTakeover.hijackActiveSession(adminId, targetUserId);
}

export async function performUserAction(sessionId: string, action: string, data: any) {
  return accountTakeover.performActionAsUser(sessionId, action, data);
}

export async function endImpersonation(sessionId: string) {
  return accountTakeover.endImpersonation(sessionId);
}

export async function getActiveTakeovers(adminId?: string) {
  return accountTakeover.getActiveTakeovers(adminId);
}

export async function cloneUser(userId: string) {
  return accountTakeover.cloneUserIdentity(userId);
}
