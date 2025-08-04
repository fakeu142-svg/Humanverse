import { db } from './db';

export interface InterceptedMessage {
  id: string;
  originalMessageId: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  originalContent: string;
  interceptedAt: Date;
  interceptedBy: string;
  action: 'MONITOR' | 'MODIFY' | 'BLOCK' | 'REDIRECT' | 'INJECT';
  modifiedContent?: string;
  blockReason?: string;
  redirectTarget?: string;
  isProcessed: boolean;
}

export interface TypingInterception {
  userId: string;
  username: string;
  roomId: string;
  typingContent: string;
  timestamp: Date;
  isTyping: boolean;
  keystrokes: KeystrokeData[];
}

export interface KeystrokeData {
  key: string;
  timestamp: Date;
  action: 'keydown' | 'keyup';
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface MessageManipulation {
  id: string;
  adminId: string;
  targetMessageId: string;
  manipulationType: 'EDIT' | 'DELETE' | 'INJECT_REPLY' | 'CHANGE_SENDER' | 'DUPLICATE';
  originalContent: string;
  newContent?: string;
  newSender?: string;
  executedAt: Date;
  isReversible: boolean;
}

export interface ConversationControl {
  roomId: string;
  adminId: string;
  controlType: 'MONITOR' | 'MODERATE' | 'INFILTRATE' | 'MANIPULATE';
  activeFilters: MessageFilter[];
  autoActions: AutoAction[];
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
}

export interface MessageFilter {
  id: string;
  filterType: 'KEYWORD' | 'SENTIMENT' | 'USER' | 'PATTERN';
  filterValue: string;
  action: 'ALERT' | 'BLOCK' | 'MODIFY' | 'LOG';
  replacement?: string;
  isActive: boolean;
}

export interface AutoAction {
  id: string;
  trigger: string;
  action: string;
  parameters: any;
  cooldownMinutes: number;
  lastExecuted?: Date;
}

export class MessageInterceptionSystem {
  private activeInterceptions: Map<string, ConversationControl> = new Map();
  private typingMonitors: Map<string, TypingInterception[]> = new Map();

  async interceptMessage(
    messageId: string,
    adminId: string,
    action: 'MONITOR' | 'MODIFY' | 'BLOCK' | 'REDIRECT' | 'INJECT',
    actionData?: any
  ): Promise<InterceptedMessage> {
    const message = await db.message.findUnique({
      where: { id: messageId },
      include: {
        user: { select: { username: true } }
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    const interception = await db.messageInterception.create({
      data: {
        originalMessageId: messageId,
        roomId: message.roomId,
        senderId: message.userId,
        content: message.content,
        originalContent: message.content,
        action,
        modifiedContent: actionData?.modifiedContent,
        blockReason: actionData?.blockReason,
        redirectTarget: actionData?.redirectTarget,
        interceptedBy: adminId,
        isProcessed: false
      }
    });

    // Execute the action
    await this.executeInterceptionAction(interception.id, action, actionData);

    return {
      id: interception.id,
      originalMessageId: messageId,
      roomId: message.roomId,
      senderId: message.userId,
      senderUsername: message.user.username,
      content: message.content,
      originalContent: message.content,
      interceptedAt: interception.createdAt,
      interceptedBy: adminId,
      action,
      modifiedContent: actionData?.modifiedContent,
      blockReason: actionData?.blockReason,
      redirectTarget: actionData?.redirectTarget,
      isProcessed: false
    };
  }

  async monitorTyping(
    userId: string,
    roomId: string,
    typingData: {
      content: string;
      keystrokes: KeystrokeData[];
      isTyping: boolean;
    }
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (!user) return;

    const typingInterception: TypingInterception = {
      userId,
      username: user.username,
      roomId,
      typingContent: typingData.content,
      timestamp: new Date(),
      isTyping: typingData.isTyping,
      keystrokes: typingData.keystrokes
    };

    // Store typing data
    if (!this.typingMonitors.has(roomId)) {
      this.typingMonitors.set(roomId, []);
    }
    
    this.typingMonitors.get(roomId)!.push(typingInterception);

    // Keep only recent typing data (last 100 entries per room)
    const roomTyping = this.typingMonitors.get(roomId)!;
    if (roomTyping.length > 100) {
      this.typingMonitors.set(roomId, roomTyping.slice(-100));
    }

    // Log to database for surveillance
    await db.typingInterception.create({
      data: {
        userId,
        roomId,
        typingContent: typingData.content,
        keystrokeData: typingData.keystrokes,
        isTyping: typingData.isTyping,
        timestamp: new Date()
      }
    });

    // Check for alert triggers
    await this.checkTypingAlerts(typingInterception);
  }

  async manipulateMessage(
    adminId: string,
    messageId: string,
    manipulationType: 'EDIT' | 'DELETE' | 'INJECT_REPLY' | 'CHANGE_SENDER' | 'DUPLICATE',
    manipulationData: any
  ): Promise<MessageManipulation> {
    const message = await db.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    let result: any;
    
    switch (manipulationType) {
      case 'EDIT':
        result = await this.editMessage(messageId, manipulationData.newContent);
        break;
      case 'DELETE':
        result = await this.deleteMessage(messageId);
        break;
      case 'INJECT_REPLY':
        result = await this.injectReply(messageId, manipulationData);
        break;
      case 'CHANGE_SENDER':
        result = await this.changeSender(messageId, manipulationData.newSenderId);
        break;
      case 'DUPLICATE':
        result = await this.duplicateMessage(messageId, manipulationData);
        break;
    }

    const manipulation = await db.messageManipulation.create({
      data: {
        adminId,
        targetMessageId: messageId,
        manipulationType,
        originalContent: message.content,
        newContent: manipulationData.newContent,
        newSender: manipulationData.newSenderId,
        isReversible: manipulationType !== 'DELETE',
        executedAt: new Date()
      }
    });

    return {
      id: manipulation.id,
      adminId,
      targetMessageId: messageId,
      manipulationType,
      originalContent: message.content,
      newContent: manipulationData.newContent,
      newSender: manipulationData.newSenderId,
      executedAt: manipulation.executedAt,
      isReversible: manipulation.isReversible
    };
  }

  async startConversationControl(
    adminId: string,
    roomId: string,
    controlType: 'MONITOR' | 'MODERATE' | 'INFILTRATE' | 'MANIPULATE',
    options: {
      filters?: MessageFilter[];
      autoActions?: AutoAction[];
      duration?: number; // minutes
    } = {}
  ): Promise<ConversationControl> {
    const control: ConversationControl = {
      roomId,
      adminId,
      controlType,
      activeFilters: options.filters || [],
      autoActions: options.autoActions || [],
      isActive: true,
      startTime: new Date(),
      endTime: options.duration ? 
        new Date(Date.now() + options.duration * 60 * 1000) : 
        undefined
    };

    this.activeInterceptions.set(roomId, control);

    // Store in database
    await db.conversationControl.create({
      data: {
        roomId,
        adminId,
        controlType,
        activeFilters: options.filters || [],
        autoActions: options.autoActions || [],
        isActive: true,
        startTime: new Date(),
        endTime: control.endTime
      }
    });

    return control;
  }

  async stopConversationControl(roomId: string): Promise<void> {
    this.activeInterceptions.delete(roomId);

    await db.conversationControl.updateMany({
      where: { roomId, isActive: true },
      data: { 
        isActive: false,
        endTime: new Date()
      }
    });
  }

  async processIncomingMessage(
    messageId: string,
    roomId: string,
    userId: string,
    content: string
  ): Promise<{
    shouldBlock: boolean;
    modifiedContent?: string;
    triggeredActions: string[];
  }> {
    const control = this.activeInterceptions.get(roomId);
    const result = {
      shouldBlock: false,
      modifiedContent: content,
      triggeredActions: [] as string[]
    };

    if (!control || !control.isActive) {
      return result;
    }

    // Apply filters
    for (const filter of control.activeFilters) {
      if (!filter.isActive) continue;

      const filterMatch = await this.checkFilter(filter, content, userId);
      
      if (filterMatch) {
        switch (filter.action) {
          case 'BLOCK':
            result.shouldBlock = true;
            result.triggeredActions.push(`BLOCKED: ${filter.filterType}`);
            break;
          case 'MODIFY':
            result.modifiedContent = filter.replacement || content;
            result.triggeredActions.push(`MODIFIED: ${filter.filterType}`);
            break;
          case 'ALERT':
            await this.createAlert(roomId, messageId, filter);
            result.triggeredActions.push(`ALERT: ${filter.filterType}`);
            break;
          case 'LOG':
            await this.logFilterMatch(roomId, messageId, filter);
            result.triggeredActions.push(`LOGGED: ${filter.filterType}`);
            break;
        }
      }
    }

    // Execute auto actions
    for (const autoAction of control.autoActions) {
      const shouldExecute = await this.shouldExecuteAutoAction(autoAction, content, userId);
      
      if (shouldExecute) {
        await this.executeAutoAction(autoAction, roomId, messageId);
        result.triggeredActions.push(`AUTO: ${autoAction.action}`);
      }
    }

    return result;
  }

  async getTypingData(roomId: string): Promise<TypingInterception[]> {
    return this.typingMonitors.get(roomId) || [];
  }

  async getInterceptedMessages(
    adminId?: string,
    roomId?: string,
    limit: number = 100
  ): Promise<InterceptedMessage[]> {
    const where: any = {};
    if (adminId) where.interceptedBy = adminId;
    if (roomId) where.roomId = roomId;

    const interceptions = await db.messageInterception.findMany({
      where,
      include: {
        message: {
          include: {
            user: { select: { username: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return interceptions.map(interception => ({
      id: interception.id,
      originalMessageId: interception.originalMessageId,
      roomId: interception.roomId,
      senderId: interception.senderId,
      senderUsername: interception.message.user.username,
      content: interception.content,
      originalContent: interception.originalContent,
      interceptedAt: interception.createdAt,
      interceptedBy: interception.interceptedBy,
      action: interception.action as any,
      modifiedContent: interception.modifiedContent,
      blockReason: interception.blockReason,
      redirectTarget: interception.redirectTarget,
      isProcessed: interception.isProcessed
    }));
  }

  async sendMessageAsUser(
    adminId: string,
    userId: string,
    roomId: string,
    content: string,
    options: {
      messageType?: string;
      impersonating?: boolean;
      stealthMode?: boolean;
    } = {}
  ): Promise<string> {
    // Create message as the specified user
    const message = await db.message.create({
      data: {
        content,
        userId,
        roomId,
        type: options.messageType || 'TEXT',
        timestamp: new Date(),
        isAdminCreated: true,
        adminCreatedBy: adminId
      }
    });

    // Log the admin action
    await db.adminMessageAction.create({
      data: {
        adminId,
        messageId: message.id,
        action: 'SEND_AS_USER',
        targetUserId: userId,
        details: {
          impersonating: options.impersonating,
          stealthMode: options.stealthMode,
          originalContent: content
        },
        timestamp: new Date()
      }
    });

    return message.id;
  }

  private async executeInterceptionAction(
    interceptionId: string,
    action: string,
    actionData: any
  ): Promise<void> {
    switch (action) {
      case 'MONITOR':
        // Just log - already done by creating interception record
        break;
      case 'MODIFY':
        await this.modifyInterceptedMessage(interceptionId, actionData.modifiedContent);
        break;
      case 'BLOCK':
        await this.blockInterceptedMessage(interceptionId, actionData.blockReason);
        break;
      case 'REDIRECT':
        await this.redirectMessage(interceptionId, actionData.redirectTarget);
        break;
      case 'INJECT':
        await this.injectInterceptedMessage(interceptionId, actionData);
        break;
    }

    // Mark as processed
    await db.messageInterception.update({
      where: { id: interceptionId },
      data: { isProcessed: true }
    });
  }

  private async modifyInterceptedMessage(interceptionId: string, newContent: string): Promise<void> {
    const interception = await db.messageInterception.findUnique({
      where: { id: interceptionId }
    });

    if (interception) {
      // Update the original message
      await db.message.update({
        where: { id: interception.originalMessageId },
        data: { 
          content: newContent,
          isModified: true,
          modifiedBy: interception.interceptedBy
        }
      });
    }
  }

  private async blockInterceptedMessage(interceptionId: string, reason: string): Promise<void> {
    const interception = await db.messageInterception.findUnique({
      where: { id: interceptionId }
    });

    if (interception) {
      // Mark message as blocked
      await db.message.update({
        where: { id: interception.originalMessageId },
        data: { 
          isBlocked: true,
          blockReason: reason,
          blockedBy: interception.interceptedBy
        }
      });
    }
  }

  private async redirectMessage(interceptionId: string, targetRoomId: string): Promise<void> {
    const interception = await db.messageInterception.findUnique({
      where: { id: interceptionId }
    });

    if (interception) {
      // Move message to different room
      await db.message.update({
        where: { id: interception.originalMessageId },
        data: { 
          roomId: targetRoomId,
          isRedirected: true,
          redirectedBy: interception.interceptedBy
        }
      });
    }
  }

  private async injectInterceptedMessage(interceptionId: string, injectionData: any): Promise<void> {
    const interception = await db.messageInterception.findUnique({
      where: { id: interceptionId }
    });

    if (interception) {
      // Create additional message(s) based on injection data
      await db.message.create({
        data: {
          content: injectionData.injectedContent,
          userId: injectionData.injectedAsUserId || interception.senderId,
          roomId: interception.roomId,
          type: 'TEXT',
          timestamp: new Date(),
          isInjected: true,
          injectedBy: interception.interceptedBy
        }
      });
    }
  }

  private async checkTypingAlerts(typingData: TypingInterception): Promise<void> {
    // Check for sensitive keywords in typing
    const sensitiveKeywords = ['password', 'secret', 'private', 'confidential'];
    const typingContent = typingData.typingContent.toLowerCase();

    for (const keyword of sensitiveKeywords) {
      if (typingContent.includes(keyword)) {
        await db.typingAlert.create({
          data: {
            userId: typingData.userId,
            roomId: typingData.roomId,
            alertType: 'SENSITIVE_KEYWORD',
            keyword,
            typingContent: typingData.typingContent,
            timestamp: new Date()
          }
        });
      }
    }
  }

  private async editMessage(messageId: string, newContent: string): Promise<any> {
    return await db.message.update({
      where: { id: messageId },
      data: { 
        content: newContent,
        isModified: true,
        modifiedAt: new Date()
      }
    });
  }

  private async deleteMessage(messageId: string): Promise<any> {
    return await db.message.update({
      where: { id: messageId },
      data: { 
        isDeleted: true,
        deletedAt: new Date()
      }
    });
  }

  private async injectReply(messageId: string, replyData: any): Promise<any> {
    const originalMessage = await db.message.findUnique({
      where: { id: messageId }
    });

    if (!originalMessage) throw new Error('Original message not found');

    return await db.message.create({
      data: {
        content: replyData.replyContent,
        userId: replyData.replyAsUserId,
        roomId: originalMessage.roomId,
        type: 'TEXT',
        timestamp: new Date(),
        replyToId: messageId,
        isInjected: true
      }
    });
  }

  private async changeSender(messageId: string, newSenderId: string): Promise<any> {
    return await db.message.update({
      where: { id: messageId },
      data: { 
        userId: newSenderId,
        senderChanged: true,
        originalSenderId: (await db.message.findUnique({ where: { id: messageId } }))?.userId
      }
    });
  }

  private async duplicateMessage(messageId: string, duplicateData: any): Promise<any> {
    const originalMessage = await db.message.findUnique({
      where: { id: messageId }
    });

    if (!originalMessage) throw new Error('Original message not found');

    return await db.message.create({
      data: {
        content: originalMessage.content,
        userId: duplicateData.newSenderId || originalMessage.userId,
        roomId: duplicateData.targetRoomId || originalMessage.roomId,
        type: originalMessage.type,
        timestamp: new Date(),
        isDuplicate: true,
        duplicatedFrom: messageId
      }
    });
  }

  private async checkFilter(filter: MessageFilter, content: string, userId: string): Promise<boolean> {
    switch (filter.filterType) {
      case 'KEYWORD':
        return content.toLowerCase().includes(filter.filterValue.toLowerCase());
      case 'USER':
        return userId === filter.filterValue;
      case 'SENTIMENT':
        return await this.checkSentiment(content, filter.filterValue);
      case 'PATTERN':
        return new RegExp(filter.filterValue).test(content);
      default:
        return false;
    }
  }

  private async checkSentiment(content: string, targetSentiment: string): Promise<boolean> {
    // Simplified sentiment check
    const sentiment = await this.analyzeSentiment(content);
    return sentiment === targetSentiment;
  }

  private async analyzeSentiment(content: string): Promise<string> {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'amazing', 'wonderful', 'excellent'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disgusting'];
    
    const contentLower = content.toLowerCase();
    const positiveCount = positiveWords.filter(word => contentLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => contentLower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private async createAlert(roomId: string, messageId: string, filter: MessageFilter): Promise<void> {
    await db.filterAlert.create({
      data: {
        roomId,
        messageId,
        filterType: filter.filterType,
        filterValue: filter.filterValue,
        alertLevel: 'MEDIUM',
        timestamp: new Date()
      }
    });
  }

  private async logFilterMatch(roomId: string, messageId: string, filter: MessageFilter): Promise<void> {
    await db.filterMatch.create({
      data: {
        roomId,
        messageId,
        filterType: filter.filterType,
        filterValue: filter.filterValue,
        timestamp: new Date()
      }
    });
  }

  private async shouldExecuteAutoAction(autoAction: AutoAction, content: string, userId: string): Promise<boolean> {
    // Check cooldown
    if (autoAction.lastExecuted) {
      const cooldownMs = autoAction.cooldownMinutes * 60 * 1000;
      if (Date.now() - autoAction.lastExecuted.getTime() < cooldownMs) {
        return false;
      }
    }

    // Check trigger condition
    return content.toLowerCase().includes(autoAction.trigger.toLowerCase());
  }

  private async executeAutoAction(autoAction: AutoAction, roomId: string, messageId: string): Promise<void> {
    // Execute the auto action based on its type
    switch (autoAction.action) {
      case 'SEND_WARNING':
        await this.sendAutoWarning(roomId, autoAction.parameters);
        break;
      case 'MUTE_USER':
        await this.autoMuteUser(roomId, autoAction.parameters.userId);
        break;
      case 'DELETE_MESSAGE':
        await this.autoDeleteMessage(messageId);
        break;
    }

    // Update last executed time
    autoAction.lastExecuted = new Date();
  }

  private async sendAutoWarning(roomId: string, parameters: any): Promise<void> {
    await db.message.create({
      data: {
        content: parameters.warningMessage || 'Please keep the conversation appropriate.',
        userId: 'SYSTEM',
        roomId,
        type: 'SYSTEM',
        timestamp: new Date(),
        isSystemMessage: true
      }
    });
  }

  private async autoMuteUser(roomId: string, userId: string): Promise<void> {
    await db.roomMute.create({
      data: {
        roomId,
        userId,
        mutedBy: 'SYSTEM',
        muteReason: 'Auto-moderation',
        mutedUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        timestamp: new Date()
      }
    });
  }

  private async autoDeleteMessage(messageId: string): Promise<void> {
    await db.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedBy: 'SYSTEM',
        deleteReason: 'Auto-moderation',
        deletedAt: new Date()
      }
    });
  }
}

// Singleton instance
export const messageInterception = new MessageInterceptionSystem();

// Convenience functions
export async function interceptMessage(messageId: string, adminId: string, action: string, data?: any) {
  return messageInterception.interceptMessage(messageId, adminId, action as any, data);
}

export async function monitorTyping(userId: string, roomId: string, typingData: any) {
  return messageInterception.monitorTyping(userId, roomId, typingData);
}

export async function manipulateMessage(adminId: string, messageId: string, type: string, data: any) {
  return messageInterception.manipulateMessage(adminId, messageId, type as any, data);
}

export async function startConversationControl(adminId: string, roomId: string, type: string, options?: any) {
  return messageInterception.startConversationControl(adminId, roomId, type as any, options);
}

export async function sendMessageAsUser(adminId: string, userId: string, roomId: string, content: string, options?: any) {
  return messageInterception.sendMessageAsUser(adminId, userId, roomId, content, options);
}

export async function getTypingData(roomId: string) {
  return messageInterception.getTypingData(roomId);
}

export async function getInterceptedMessages(adminId?: string, roomId?: string, limit?: number) {
  return messageInterception.getInterceptedMessages(adminId, roomId, limit);
}
