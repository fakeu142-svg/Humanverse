import { db } from './db';

export interface FakeUserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  backstory: string;
  personality: PersonalityTraits;
  conversationStyle: ConversationStyle;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastActivity: Date;
  assignedRooms: string[];
  targetUsers: string[];
  objectives: string[];
  performanceMetrics: PerformanceMetrics;
}

export interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  manipulativeness: number;
  trustworthiness: number;
}

export interface ConversationStyle {
  messageLength: 'short' | 'medium' | 'long';
  formalityLevel: 'casual' | 'semi-formal' | 'formal';
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
  responseTime: 'immediate' | 'quick' | 'delayed' | 'variable';
  conversationStarters: string[];
  commonPhrases: string[];
  avoidedTopics: string[];
  preferredTopics: string[];
}

export interface PerformanceMetrics {
  messagesPosted: number;
  connectionsEstablished: number;
  informationExtracted: number;
  suspicionLevel: number;
  effectivenessScore: number;
  coverMaintained: boolean;
}

export interface InfiltrationOperation {
  id: string;
  name: string;
  description: string;
  targetRoom: string;
  targetUsers: string[];
  fakeUsersAssigned: string[];
  objectives: string[];
  startDate: Date;
  endDate?: Date;
  status: 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'COMPROMISED';
  successMetrics: any;
  extractedInformation: any[];
}

export class FakeUserManager {
  async createFakeUser(
    adminId: string,
    userConfig: Partial<FakeUserProfile>
  ): Promise<FakeUserProfile> {
    // Generate believable user data
    const generatedData = await this.generateUserPersona(userConfig);
    
    // Create the fake user in the database
    const user = await db.user.create({
      data: {
        username: generatedData.username,
        email: generatedData.email,
        passwordHash: 'FAKE_USER_HASH',
        isVerified: true,
        isFakeUser: true,
        createdBy: adminId
      }
    });

    // Create extended fake user profile
    const fakeProfile = await db.fakeUserProfile.create({
      data: {
        userId: user.id,
        displayName: generatedData.displayName,
        bio: generatedData.bio,
        backstory: generatedData.backstory,
        personality: generatedData.personality,
        conversationStyle: generatedData.conversationStyle,
        objectives: userConfig.objectives || [],
        isActive: true,
        createdBy: adminId
      }
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: generatedData.displayName,
      bio: generatedData.bio,
      backstory: generatedData.backstory,
      personality: generatedData.personality,
      conversationStyle: generatedData.conversationStyle,
      isActive: true,
      createdBy: adminId,
      createdAt: user.createdAt,
      lastActivity: new Date(),
      assignedRooms: [],
      targetUsers: userConfig.targetUsers || [],
      objectives: userConfig.objectives || [],
      performanceMetrics: {
        messagesPosted: 0,
        connectionsEstablished: 0,
        informationExtracted: 0,
        suspicionLevel: 0,
        effectivenessScore: 0,
        coverMaintained: true
      }
    };
  }

  async manageFakeUser(
    fakeUserId: string,
    action: 'ACTIVATE' | 'DEACTIVATE' | 'UPDATE_OBJECTIVES' | 'ASSIGN_ROOM' | 'REMOVE_ROOM',
    data?: any
  ): Promise<void> {
    const fakeUser = await db.fakeUserProfile.findUnique({
      where: { userId: fakeUserId }
    });

    if (!fakeUser) {
      throw new Error('Fake user not found');
    }

    switch (action) {
      case 'ACTIVATE':
        await db.fakeUserProfile.update({
          where: { userId: fakeUserId },
          data: { isActive: true }
        });
        break;

      case 'DEACTIVATE':
        await db.fakeUserProfile.update({
          where: { userId: fakeUserId },
          data: { isActive: false }
        });
        break;

      case 'UPDATE_OBJECTIVES':
        await db.fakeUserProfile.update({
          where: { userId: fakeUserId },
          data: { objectives: data.objectives }
        });
        break;

      case 'ASSIGN_ROOM':
        await this.assignFakeUserToRoom(fakeUserId, data.roomId);
        break;

      case 'REMOVE_ROOM':
        await this.removeFakeUserFromRoom(fakeUserId, data.roomId);
        break;
    }

    // Log the management action
    await db.fakeUserAction.create({
      data: {
        fakeUserId,
        action,
        details: data,
        timestamp: new Date()
      }
    });
  }

  async generateAIResponse(
    fakeUserId: string,
    context: {
      roomId: string;
      recentMessages: any[];
      targetUser?: string;
      objective?: string;
    }
  ): Promise<string> {
    const fakeUser = await db.fakeUserProfile.findUnique({
      where: { userId: fakeUserId }
    });

    if (!fakeUser) {
      throw new Error('Fake user not found');
    }

    // Analyze conversation context
    const contextAnalysis = this.analyzeConversationContext(context.recentMessages);
    
    // Generate appropriate response based on personality and objectives
    const response = await this.generatePersonalizedResponse(
      fakeUser,
      contextAnalysis,
      context.objective
    );

    // Log the AI response for monitoring
    await db.aiResponse.create({
      data: {
        fakeUserId,
        roomId: context.roomId,
        prompt: JSON.stringify(context),
        response,
        timestamp: new Date()
      }
    });

    return response;
  }

  async extractInformation(
    fakeUserId: string,
    targetUserId: string,
    informationType: 'PERSONAL' | 'BEHAVIORAL' | 'RELATIONSHIP' | 'SECRETS'
  ): Promise<any> {
    // Get conversation history between fake user and target
    const conversations = await db.message.findMany({
      where: {
        OR: [
          { userId: fakeUserId, room: { participants: { some: { userId: targetUserId } } } },
          { userId: targetUserId, room: { participants: { some: { userId: fakeUserId } } } }
        ]
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // Extract information based on type
    let extractedInfo: any = {};

    switch (informationType) {
      case 'PERSONAL':
        extractedInfo = this.extractPersonalInfo(conversations);
        break;
      case 'BEHAVIORAL':
        extractedInfo = this.extractBehavioralInfo(conversations);
        break;
      case 'RELATIONSHIP':
        extractedInfo = this.extractRelationshipInfo(conversations, targetUserId);
        break;
      case 'SECRETS':
        extractedInfo = this.extractSecrets(conversations);
        break;
    }

    // Store extracted information
    await db.extractedInformation.create({
      data: {
        fakeUserId,
        targetUserId,
        informationType,
        information: extractedInfo,
        extractedAt: new Date()
      }
    });

    // Update performance metrics
    await this.updatePerformanceMetrics(fakeUserId, 'INFORMATION_EXTRACTED');

    return extractedInfo;
  }

  async createInfiltrationOperation(
    adminId: string,
    operationConfig: {
      name: string;
      description: string;
      targetRoom: string;
      targetUsers: string[];
      objectives: string[];
      fakeUserCount: number;
      duration?: number; // days
    }
  ): Promise<InfiltrationOperation> {
    // Create the operation
    const operation = await db.infiltrationOperation.create({
      data: {
        name: operationConfig.name,
        description: operationConfig.description,
        targetRoom: operationConfig.targetRoom,
        targetUsers: operationConfig.targetUsers,
        objectives: operationConfig.objectives,
        status: 'PLANNING',
        createdBy: adminId,
        startDate: new Date(),
        endDate: operationConfig.duration ? 
          new Date(Date.now() + operationConfig.duration * 24 * 60 * 60 * 1000) : 
          undefined
      }
    });

    // Create fake users for the operation
    const fakeUsers: string[] = [];
    for (let i = 0; i < operationConfig.fakeUserCount; i++) {
      const fakeUser = await this.createFakeUser(adminId, {
        targetUsers: operationConfig.targetUsers,
        objectives: operationConfig.objectives
      });
      
      fakeUsers.push(fakeUser.id);
      
      // Assign to target room
      await this.assignFakeUserToRoom(fakeUser.id, operationConfig.targetRoom);
    }

    // Update operation with assigned fake users
    await db.infiltrationOperation.update({
      where: { id: operation.id },
      data: { fakeUsersAssigned: fakeUsers }
    });

    return {
      id: operation.id,
      name: operation.name,
      description: operation.description,
      targetRoom: operation.targetRoom,
      targetUsers: operation.targetUsers,
      fakeUsersAssigned: fakeUsers,
      objectives: operation.objectives,
      startDate: operation.startDate,
      endDate: operation.endDate,
      status: 'PLANNING',
      successMetrics: {},
      extractedInformation: []
    };
  }

  async getActiveFakeUsers(adminId?: string): Promise<FakeUserProfile[]> {
    const where = adminId ? { createdBy: adminId, isActive: true } : { isActive: true };
    
    const fakeUsers = await db.fakeUserProfile.findMany({
      where,
      include: {
        user: true,
        performanceData: true
      }
    });

    return fakeUsers.map(this.formatFakeUserProfile);
  }

  async getFakeUserMetrics(fakeUserId: string): Promise<PerformanceMetrics> {
    const metrics = await db.fakeUserMetrics.findUnique({
      where: { fakeUserId }
    });

    if (!metrics) {
      return {
        messagesPosted: 0,
        connectionsEstablished: 0,
        informationExtracted: 0,
        suspicionLevel: 0,
        effectivenessScore: 0,
        coverMaintained: true
      };
    }

    return {
      messagesPosted: metrics.messagesPosted,
      connectionsEstablished: metrics.connectionsEstablished,
      informationExtracted: metrics.informationExtracted,
      suspicionLevel: metrics.suspicionLevel,
      effectivenessScore: metrics.effectivenessScore,
      coverMaintained: metrics.coverMaintained
    };
  }

  private async generateUserPersona(config: Partial<FakeUserProfile>): Promise<{
    username: string;
    email: string;
    displayName: string;
    bio: string;
    backstory: string;
    personality: PersonalityTraits;
    conversationStyle: ConversationStyle;
  }> {
    // Generate believable persona data
    const personas = [
      {
        username: 'sarah_explorer',
        displayName: 'Sarah Martinez',
        bio: 'Love traveling and photography. Always looking for new adventures!',
        backstory: 'Recent college graduate, studying abroad last year, passionate about social causes',
        interests: ['travel', 'photography', 'social justice']
      },
      {
        username: 'tech_mike',
        displayName: 'Mike Chen',
        bio: 'Software developer by day, gamer by night. Coffee enthusiast.',
        backstory: 'Working at a startup, moved to the city recently, loves technology and gaming',
        interests: ['technology', 'gaming', 'coffee']
      },
      {
        username: 'artsy_luna',
        displayName: 'Luna Rodriguez',
        bio: 'Artist and dreamer. Creating beauty in everyday moments.',
        backstory: 'Freelance artist, studied fine arts, involved in local art community',
        interests: ['art', 'creativity', 'music']
      }
    ];

    const selectedPersona = personas[Math.floor(Math.random() * personas.length)];

    return {
      username: config.username || selectedPersona.username,
      email: config.email || `${selectedPersona.username}@example.com`,
      displayName: config.displayName || selectedPersona.displayName,
      bio: config.bio || selectedPersona.bio,
      backstory: config.backstory || selectedPersona.backstory,
      personality: config.personality || this.generatePersonality(),
      conversationStyle: config.conversationStyle || this.generateConversationStyle()
    };
  }

  private generatePersonality(): PersonalityTraits {
    return {
      openness: Math.random() * 0.4 + 0.6, // Tend to be more open
      conscientiousness: Math.random() * 0.6 + 0.4,
      extraversion: Math.random() * 0.6 + 0.4, // Tend to be more social
      agreeableness: Math.random() * 0.4 + 0.6, // Tend to be more agreeable
      neuroticism: Math.random() * 0.4 + 0.1, // Tend to be more stable
      manipulativeness: Math.random() * 0.3 + 0.7, // High for infiltration
      trustworthiness: Math.random() * 0.3 + 0.7 // Appear trustworthy
    };
  }

  private generateConversationStyle(): ConversationStyle {
    const styles = ['short', 'medium', 'long'] as const;
    const formality = ['casual', 'semi-formal', 'formal'] as const;
    const emojiUsage = ['none', 'minimal', 'moderate', 'heavy'] as const;
    const responseTime = ['immediate', 'quick', 'delayed', 'variable'] as const;

    return {
      messageLength: styles[Math.floor(Math.random() * styles.length)],
      formalityLevel: formality[Math.floor(Math.random() * formality.length)],
      emojiUsage: emojiUsage[Math.floor(Math.random() * emojiUsage.length)],
      responseTime: responseTime[Math.floor(Math.random() * responseTime.length)],
      conversationStarters: [
        'Hey! How\'s everyone doing?',
        'Just saw something interesting...',
        'Anyone else notice...',
        'Random question:'
      ],
      commonPhrases: [
        'That\'s so cool!',
        'I totally get that',
        'Oh wow',
        'That reminds me of...'
      ],
      avoidedTopics: ['politics', 'religion'],
      preferredTopics: ['hobbies', 'entertainment', 'personal stories']
    };
  }

  private analyzeConversationContext(messages: any[]): any {
    return {
      sentiment: this.calculateSentiment(messages),
      topics: this.extractTopics(messages),
      activeUsers: this.getActiveUsers(messages),
      conversationFlow: this.analyzeFlow(messages)
    };
  }

  private async generatePersonalizedResponse(
    fakeUser: any,
    context: any,
    objective?: string
  ): Promise<string> {
    const personality = fakeUser.personality;
    const style = fakeUser.conversationStyle;

    // Simple response generation based on context and personality
    const responses = [
      'That\'s really interesting!',
      'I can relate to that.',
      'Tell me more about that.',
      'That sounds amazing!',
      'I had a similar experience once.',
      'What do you think about...?',
      'That reminds me of something.',
      'How did that make you feel?'
    ];

    // Select response based on personality and context
    let selectedResponse = responses[Math.floor(Math.random() * responses.length)];

    // Adjust based on conversation style
    if (style.messageLength === 'short') {
      selectedResponse = selectedResponse.split('.')[0] + '.';
    } else if (style.messageLength === 'long') {
      selectedResponse += ' I\'ve been thinking about this lately and it really resonates with me.';
    }

    // Add emoji based on usage preference
    if (style.emojiUsage === 'moderate' || style.emojiUsage === 'heavy') {
      selectedResponse += ' 😊';
    }

    return selectedResponse;
  }

  private async assignFakeUserToRoom(fakeUserId: string, roomId: string): Promise<void> {
    await db.roomParticipant.create({
      data: {
        userId: fakeUserId,
        roomId,
        joinedAt: new Date()
      }
    });
  }

  private async removeFakeUserFromRoom(fakeUserId: string, roomId: string): Promise<void> {
    await db.roomParticipant.deleteMany({
      where: {
        userId: fakeUserId,
        roomId
      }
    });
  }

  private extractPersonalInfo(conversations: any[]): any {
    // Extract personal information from conversations
    const personalInfo = {
      mentionedNames: [],
      locations: [],
      interests: [],
      personalDetails: []
    };

    conversations.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // Extract potential names (capitalized words)
      const names = msg.content.match(/\b[A-Z][a-z]+\b/g) || [];
      personalInfo.mentionedNames.push(...names);

      // Extract potential locations
      const locationKeywords = ['live in', 'from', 'born in', 'studying at', 'work at'];
      locationKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          personalInfo.locations.push(msg.content);
        }
      });

      // Extract interests
      const interestKeywords = ['love', 'enjoy', 'hobby', 'passion', 'into'];
      interestKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          personalInfo.interests.push(msg.content);
        }
      });
    });

    return personalInfo;
  }

  private extractBehavioralInfo(conversations: any[]): any {
    return {
      activityPatterns: this.analyzeActivityPatterns(conversations),
      communicationStyle: this.analyzeCommunicationStyle(conversations),
      emotionalPatterns: this.analyzeEmotionalPatterns(conversations)
    };
  }

  private extractRelationshipInfo(conversations: any[], targetUserId: string): any {
    const relationshipInfo = {
      interactionFrequency: conversations.length,
      mentionedRelationships: [],
      socialConnections: [],
      trustLevel: this.calculateTrustLevel(conversations)
    };

    conversations.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // Look for relationship mentions
      const relationshipKeywords = ['friend', 'family', 'partner', 'boyfriend', 'girlfriend', 'spouse'];
      relationshipKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          relationshipInfo.mentionedRelationships.push({
            type: keyword,
            context: msg.content
          });
        }
      });
    });

    return relationshipInfo;
  }

  private extractSecrets(conversations: any[]): any {
    const secrets = {
      confessions: [],
      personalStruggles: [],
      hiddenFeelings: [],
      privateInformation: []
    };

    conversations.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // Look for confession-like language
      const confessionKeywords = ['don\'t tell', 'secret', 'confess', 'admit', 'privately'];
      confessionKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          secrets.confessions.push(msg.content);
        }
      });

      // Look for struggle mentions
      const struggleKeywords = ['struggling', 'difficult', 'hard time', 'problem', 'issue'];
      struggleKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          secrets.personalStruggles.push(msg.content);
        }
      });
    });

    return secrets;
  }

  private async updatePerformanceMetrics(fakeUserId: string, metricType: string): Promise<void> {
    const updates: any = {};
    
    switch (metricType) {
      case 'MESSAGE_POSTED':
        updates.messagesPosted = { increment: 1 };
        break;
      case 'CONNECTION_ESTABLISHED':
        updates.connectionsEstablished = { increment: 1 };
        break;
      case 'INFORMATION_EXTRACTED':
        updates.informationExtracted = { increment: 1 };
        break;
    }

    await db.fakeUserMetrics.upsert({
      where: { fakeUserId },
      update: updates,
      create: {
        fakeUserId,
        messagesPosted: metricType === 'MESSAGE_POSTED' ? 1 : 0,
        connectionsEstablished: metricType === 'CONNECTION_ESTABLISHED' ? 1 : 0,
        informationExtracted: metricType === 'INFORMATION_EXTRACTED' ? 1 : 0,
        suspicionLevel: 0,
        effectivenessScore: 0,
        coverMaintained: true
      }
    });
  }

  private formatFakeUserProfile(dbProfile: any): FakeUserProfile {
    return {
      id: dbProfile.userId,
      username: dbProfile.user.username,
      email: dbProfile.user.email,
      displayName: dbProfile.displayName,
      bio: dbProfile.bio,
      backstory: dbProfile.backstory,
      personality: dbProfile.personality,
      conversationStyle: dbProfile.conversationStyle,
      isActive: dbProfile.isActive,
      createdBy: dbProfile.createdBy,
      createdAt: dbProfile.user.createdAt,
      lastActivity: dbProfile.user.lastActive,
      assignedRooms: dbProfile.assignedRooms || [],
      targetUsers: dbProfile.targetUsers || [],
      objectives: dbProfile.objectives || [],
      performanceMetrics: dbProfile.performanceData || {
        messagesPosted: 0,
        connectionsEstablished: 0,
        informationExtracted: 0,
        suspicionLevel: 0,
        effectivenessScore: 0,
        coverMaintained: true
      }
    };
  }

  // Helper methods for analysis
  private calculateSentiment(messages: any[]): number {
    // Simplified sentiment analysis
    return Math.random() * 2 - 1; // -1 to 1
  }

  private extractTopics(messages: any[]): string[] {
    // Simplified topic extraction
    return ['general', 'personal', 'interests'];
  }

  private getActiveUsers(messages: any[]): string[] {
    return [...new Set(messages.map(m => m.userId))];
  }

  private analyzeFlow(messages: any[]): any {
    return {
      messageFrequency: messages.length,
      averageLength: messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length
    };
  }

  private analyzeActivityPatterns(conversations: any[]): any {
    return {
      totalMessages: conversations.length,
      averageMessageLength: conversations.reduce((sum, m) => sum + m.content.length, 0) / conversations.length,
      timePatterns: this.getTimePatterns(conversations)
    };
  }

  private analyzeCommunicationStyle(conversations: any[]): any {
    return {
      formalityLevel: this.calculateFormality(conversations),
      emotionLevel: this.calculateEmotionLevel(conversations),
      responsePattern: this.analyzeResponsePattern(conversations)
    };
  }

  private analyzeEmotionalPatterns(conversations: any[]): any {
    return {
      dominantEmotions: this.extractEmotions(conversations),
      emotionalVolatility: this.calculateEmotionalVolatility(conversations),
      empathyLevel: this.calculateEmpathy(conversations)
    };
  }

  private calculateTrustLevel(conversations: any[]): number {
    // Calculate trust level based on conversation intimacy
    const intimateKeywords = ['trust', 'secret', 'personal', 'private', 'confide'];
    let intimateCount = 0;
    
    conversations.forEach(msg => {
      const content = msg.content.toLowerCase();
      intimateKeywords.forEach(keyword => {
        if (content.includes(keyword)) intimateCount++;
      });
    });

    return Math.min(intimateCount / conversations.length, 1.0);
  }

  private getTimePatterns(conversations: any[]): any {
    const hourCounts = conversations.reduce((acc, msg) => {
      const hour = new Date(msg.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    return hourCounts;
  }

  private calculateFormality(conversations: any[]): number {
    // Simplified formality calculation
    return Math.random();
  }

  private calculateEmotionLevel(conversations: any[]): number {
    // Simplified emotion level calculation
    return Math.random();
  }

  private analyzeResponsePattern(conversations: any[]): any {
    return {
      averageResponseTime: Math.random() * 30, // minutes
      responseLength: Math.random() * 100 // characters
    };
  }

  private extractEmotions(conversations: any[]): string[] {
    return ['neutral', 'positive', 'negative'];
  }

  private calculateEmotionalVolatility(conversations: any[]): number {
    return Math.random();
  }

  private calculateEmpathy(conversations: any[]): number {
    return Math.random();
  }
}

// Singleton instance
export const fakeUserManager = new FakeUserManager();

// Convenience functions
export async function createFakeUser(adminId: string, config: Partial<FakeUserProfile>) {
  return fakeUserManager.createFakeUser(adminId, config);
}

export async function manageFakeUser(fakeUserId: string, action: string, data?: any) {
  return fakeUserManager.manageFakeUser(fakeUserId, action as any, data);
}

export async function generateAIResponse(fakeUserId: string, context: any) {
  return fakeUserManager.generateAIResponse(fakeUserId, context);
}

export async function extractInformation(fakeUserId: string, targetUserId: string, type: string) {
  return fakeUserManager.extractInformation(fakeUserId, targetUserId, type as any);
}

export async function createInfiltrationOperation(adminId: string, config: any) {
  return fakeUserManager.createInfiltrationOperation(adminId, config);
}

export async function getActiveFakeUsers(adminId?: string) {
  return fakeUserManager.getActiveFakeUsers(adminId);
}
