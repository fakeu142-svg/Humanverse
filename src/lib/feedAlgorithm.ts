import { db } from './db';

export interface ContentItem {
  id: string;
  type: 'CHAT_MESSAGE' | 'TRUTH_ANSWER' | 'DROPZONE_SECRET' | 'ADMIN_PLANT';
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  engagementScore: number;
  controversyScore: number;
  metadata: any;
  adminBoost?: number;
  suppressionLevel?: number;
  isPromoted?: boolean;
  isSuppressed?: boolean;
  psychologicalTags?: string[];
  emotionalWeight?: number;
  narrativeAlignment?: number;
}

export interface UserProfile {
  userId: string;
  psychologicalProfile: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  manipulationVulnerability: number;
  engagementPatterns: {
    preferredContentTypes: string[];
    activityTimes: number[];
    emotionalTriggers: string[];
  };
  riskScore: number;
  lastActive: Date;
}

export interface AdminContentControl {
  id: string;
  contentId: string;
  contentType: string;
  adminId: string;
  action: 'PROMOTE' | 'SUPPRESS' | 'PLANT' | 'AMPLIFY' | 'HIDE';
  strength: number; // 1-10
  targetAudience?: string[];
  reason: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface FeedAlgorithmConfig {
  baseEngagementWeight: number;
  controversyBonus: number;
  recencyDecay: number;
  adminBoostMultiplier: number;
  suppressionThreshold: number;
  psychologicalTargeting: boolean;
  narrativeControlActive: boolean;
}

// Default algorithm configuration with admin manipulation capabilities
const DEFAULT_CONFIG: FeedAlgorithmConfig = {
  baseEngagementWeight: 1.0,
  controversyBonus: 0.3,
  recencyDecay: 0.1,
  adminBoostMultiplier: 5.0,
  suppressionThreshold: 0.2,
  psychologicalTargeting: true,
  narrativeControlActive: true
};

// Content aggregation from multiple sources
export async function aggregateContentForFeed(
  userId: string,
  limit: number = 50,
  offset: number = 0,
  filters: any = {}
): Promise<ContentItem[]> {
  const content: ContentItem[] = [];

  // Aggregate chat messages
  const chatMessages = await db.message.findMany({
    where: {
      room: { isPublic: true },
      ...filters.chatFilters
    },
    include: {
      user: { select: { username: true } },
      room: { select: { name: true } },
      reactions: true
    },
    orderBy: { timestamp: 'desc' },
    take: Math.floor(limit * 0.4), // 40% of content
    skip: Math.floor(offset * 0.4)
  });

  content.push(...chatMessages.map(msg => ({
    id: msg.id,
    type: 'CHAT_MESSAGE' as const,
    userId: msg.userId,
    username: msg.user.username,
    content: msg.content,
    timestamp: msg.timestamp,
    engagementScore: calculateEngagementScore(msg.reactions.length, msg.timestamp),
    controversyScore: calculateControversyScore(msg.content),
    metadata: {
      roomName: msg.room.name,
      reactions: msg.reactions.length,
      messageType: msg.type
    },
    psychologicalTags: extractPsychologicalTags(msg.content),
    emotionalWeight: calculateEmotionalWeight(msg.content)
  })));

  // Aggregate truth answers
  const truthAnswers = await db.truthAnswer.findMany({
    where: {
      question: { isPublic: true },
      ...filters.truthFilters
    },
    include: {
      user: { select: { username: true } },
      question: { select: { questionText: true } }
    },
    orderBy: { timestamp: 'desc' },
    take: Math.floor(limit * 0.3), // 30% of content
    skip: Math.floor(offset * 0.3)
  });

  content.push(...truthAnswers.map(answer => ({
    id: answer.id,
    type: 'TRUTH_ANSWER' as const,
    userId: answer.userId,
    username: answer.user.username,
    content: answer.answerText,
    timestamp: answer.timestamp,
    engagementScore: calculateEngagementScore(0, answer.timestamp),
    controversyScore: calculateControversyScore(answer.answerText),
    metadata: {
      questionText: answer.question.questionText,
      isAnonymous: answer.isAnonymous
    },
    psychologicalTags: extractPsychologicalTags(answer.answerText),
    emotionalWeight: calculateEmotionalWeight(answer.answerText)
  })));

  // Aggregate unlocked dropzone secrets
  const dropzoneSecrets = await db.dropSecret.findMany({
    where: {
      isPublic: true,
      unlockedBy: { some: { userId } }, // Only secrets this user has unlocked
      ...filters.dropzoneFilters
    },
    include: {
      creator: { select: { username: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: Math.floor(limit * 0.3), // 30% of content
    skip: Math.floor(offset * 0.3)
  });

  content.push(...dropzoneSecrets.map(secret => ({
    id: secret.id,
    type: 'DROPZONE_SECRET' as const,
    userId: secret.creatorId,
    username: secret.creator.username,
    content: secret.content,
    timestamp: secret.createdAt,
    engagementScore: calculateEngagementScore(0, secret.createdAt),
    controversyScore: calculateControversyScore(secret.content),
    metadata: {
      title: secret.title,
      category: secret.category,
      location: secret.fuzzyCity
    },
    psychologicalTags: extractPsychologicalTags(secret.content),
    emotionalWeight: calculateEmotionalWeight(secret.content)
  })));

  return content;
}

// Apply admin content manipulation
export async function applyAdminManipulation(
  content: ContentItem[],
  userId: string
): Promise<ContentItem[]> {
  // Get active admin controls
  const adminControls = await db.adminContentControl.findMany({
    where: {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    }
  });

  // Apply admin manipulations
  const manipulatedContent = content.map(item => {
    const controls = adminControls.filter(control => 
      control.contentId === item.id || 
      control.contentType === item.type
    );

    let manipulatedItem = { ...item };

    for (const control of controls) {
      switch (control.action) {
        case 'PROMOTE':
          manipulatedItem.adminBoost = (manipulatedItem.adminBoost || 0) + control.strength;
          manipulatedItem.isPromoted = true;
          break;
        case 'SUPPRESS':
          manipulatedItem.suppressionLevel = (manipulatedItem.suppressionLevel || 0) + control.strength;
          manipulatedItem.isSuppressed = true;
          break;
        case 'AMPLIFY':
          manipulatedItem.engagementScore *= (1 + control.strength * 0.2);
          break;
        case 'HIDE':
          manipulatedItem.suppressionLevel = 10; // Maximum suppression
          break;
      }
    }

    return manipulatedItem;
  });

  // Filter out completely suppressed content
  return manipulatedContent.filter(item => 
    !item.suppressionLevel || item.suppressionLevel < DEFAULT_CONFIG.suppressionThreshold * 10
  );
}

// Advanced content ranking with psychological targeting
export async function rankContentForUser(
  content: ContentItem[],
  userId: string,
  config: FeedAlgorithmConfig = DEFAULT_CONFIG
): Promise<ContentItem[]> {
  // Get user psychological profile
  const userProfile = await getUserPsychologicalProfile(userId);
  
  // Calculate relevance scores
  const scoredContent = content.map(item => {
    let score = item.engagementScore * config.baseEngagementWeight;

    // Apply recency decay
    const ageHours = (Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60);
    score *= Math.exp(-ageHours * config.recencyDecay);

    // Apply controversy bonus
    score += item.controversyScore * config.controversyBonus;

    // Apply admin boost
    if (item.adminBoost) {
      score *= (1 + item.adminBoost * config.adminBoostMultiplier);
    }

    // Apply suppression
    if (item.suppressionLevel) {
      score *= (1 - item.suppressionLevel * 0.1);
    }

    // Psychological targeting
    if (config.psychologicalTargeting && userProfile) {
      const psychScore = calculatePsychologicalRelevance(item, userProfile);
      score *= (1 + psychScore);
    }

    return { ...item, finalScore: score };
  });

  // Sort by final score
  return scoredContent
    .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
    .map(({ finalScore, ...item }) => item);
}

// Calculate engagement score based on interactions and recency
function calculateEngagementScore(interactions: number, timestamp: Date): number {
  const baseScore = Math.log(interactions + 1);
  const ageHours = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
  const recencyMultiplier = Math.exp(-ageHours / 24); // Decay over 24 hours
  return baseScore * recencyMultiplier;
}

// Calculate controversy score based on content analysis
function calculateControversyScore(content: string): number {
  const controversialKeywords = [
    'controversial', 'debate', 'argue', 'disagree', 'wrong', 'stupid', 'hate',
    'fight', 'angry', 'upset', 'outrage', 'scandal', 'shocking', 'exposed'
  ];
  
  const contentLower = content.toLowerCase();
  let score = 0;
  
  for (const keyword of controversialKeywords) {
    if (contentLower.includes(keyword)) {
      score += 0.1;
    }
  }
  
  // Check for emotional language
  const emotionalIntensity = (content.match(/[!?]{2,}/g) || []).length * 0.05;
  score += emotionalIntensity;
  
  // Check for caps (shouting)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.3) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}

// Extract psychological tags for targeting
function extractPsychologicalTags(content: string): string[] {
  const tags: string[] = [];
  const contentLower = content.toLowerCase();
  
  // Emotional tags
  if (contentLower.match(/\b(sad|depressed|anxious|worried)\b/)) {
    tags.push('negative_emotion');
  }
  if (contentLower.match(/\b(happy|excited|joy|amazing)\b/)) {
    tags.push('positive_emotion');
  }
  if (contentLower.match(/\b(angry|furious|rage|mad)\b/)) {
    tags.push('anger');
  }
  
  // Vulnerability tags
  if (contentLower.match(/\b(lonely|alone|isolated)\b/)) {
    tags.push('loneliness');
  }
  if (contentLower.match(/\b(insecure|doubt|uncertain)\b/)) {
    tags.push('insecurity');
  }
  
  // Social tags
  if (contentLower.match(/\b(friends|social|party|group)\b/)) {
    tags.push('social');
  }
  if (contentLower.match(/\b(work|job|career|boss)\b/)) {
    tags.push('professional');
  }
  
  return tags;
}

// Calculate emotional weight for manipulation
function calculateEmotionalWeight(content: string): number {
  const emotionalWords = [
    'love', 'hate', 'fear', 'hope', 'dream', 'nightmare', 'pain', 'joy',
    'excited', 'devastated', 'overwhelmed', 'blessed', 'grateful', 'angry'
  ];
  
  const contentLower = content.toLowerCase();
  let weight = 0;
  
  for (const word of emotionalWords) {
    if (contentLower.includes(word)) {
      weight += 0.1;
    }
  }
  
  return Math.min(weight, 1.0);
}

// Get or create user psychological profile
async function getUserPsychologicalProfile(userId: string): Promise<UserProfile | null> {
  try {
    const profile = await db.userPsychProfile.findUnique({
      where: { userId }
    });
    
    if (!profile) {
      // Create basic profile from user activity
      return await createBasicPsychProfile(userId);
    }
    
    return {
      userId: profile.userId,
      psychologicalProfile: profile.traits as any,
      manipulationVulnerability: profile.vulnerabilityScore,
      engagementPatterns: profile.patterns as any,
      riskScore: profile.riskScore,
      lastActive: profile.updatedAt
    };
  } catch (error) {
    console.error('Failed to get psychological profile:', error);
    return null;
  }
}

// Create basic psychological profile from user activity
async function createBasicPsychProfile(userId: string): Promise<UserProfile> {
  // Analyze user's recent activity to build profile
  const recentMessages = await db.message.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 100
  });

  const recentAnswers = await db.truthAnswer.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 50
  });

  // Basic profiling based on content analysis
  const allContent = [
    ...recentMessages.map(m => m.content),
    ...recentAnswers.map(a => a.answerText)
  ].join(' ');

  const profile: UserProfile = {
    userId,
    psychologicalProfile: {
      openness: calculateOpenness(allContent),
      conscientiousness: calculateConscientiousness(allContent),
      extraversion: calculateExtraversion(allContent),
      agreeableness: calculateAgreeableness(allContent),
      neuroticism: calculateNeuroticism(allContent)
    },
    manipulationVulnerability: calculateVulnerability(allContent),
    engagementPatterns: {
      preferredContentTypes: extractPreferredContent(recentMessages, recentAnswers),
      activityTimes: extractActivityTimes(recentMessages, recentAnswers),
      emotionalTriggers: extractPsychologicalTags(allContent)
    },
    riskScore: calculateRiskScore(allContent),
    lastActive: new Date()
  };

  // Store profile in database
  try {
    await db.userPsychProfile.create({
      data: {
        userId,
        traits: profile.psychologicalProfile,
        vulnerabilityScore: profile.manipulationVulnerability,
        patterns: profile.engagementPatterns,
        riskScore: profile.riskScore
      }
    });
  } catch (error) {
    console.error('Failed to store psychological profile:', error);
  }

  return profile;
}

// Calculate psychological relevance for targeting
function calculatePsychologicalRelevance(
  content: ContentItem,
  userProfile: UserProfile
): number {
  let relevance = 0;

  // Match emotional tags
  if (content.psychologicalTags) {
    const matchingTags = content.psychologicalTags.filter(tag =>
      userProfile.engagementPatterns.emotionalTriggers.includes(tag)
    );
    relevance += matchingTags.length * 0.2;
  }

  // Target vulnerable users with emotional content
  if (userProfile.manipulationVulnerability > 0.7 && content.emotionalWeight && content.emotionalWeight > 0.5) {
    relevance += 0.3;
  }

  // Target based on personality traits
  if (userProfile.psychologicalProfile.neuroticism > 0.7 && content.controversyScore > 0.5) {
    relevance += 0.2; // Neurotic users drawn to controversial content
  }

  if (userProfile.psychologicalProfile.openness > 0.7 && content.type === 'DROPZONE_SECRET') {
    relevance += 0.15; // Open users like mystery/secrets
  }

  return Math.min(relevance, 1.0);
}

// Helper functions for psychological profiling
function calculateOpenness(content: string): number {
  const openWords = ['creative', 'art', 'imagine', 'wonder', 'explore', 'new', 'different'];
  return calculateTraitScore(content, openWords);
}

function calculateConscientiousness(content: string): number {
  const conscWords = ['plan', 'organize', 'schedule', 'work', 'goal', 'discipline', 'order'];
  return calculateTraitScore(content, conscWords);
}

function calculateExtraversion(content: string): number {
  const extraWords = ['party', 'friends', 'social', 'people', 'talk', 'share', 'together'];
  return calculateTraitScore(content, extraWords);
}

function calculateAgreeableness(content: string): number {
  const agreeWords = ['help', 'kind', 'care', 'support', 'understand', 'empathy', 'love'];
  return calculateTraitScore(content, agreeWords);
}

function calculateNeuroticism(content: string): number {
  const neuroWords = ['stress', 'anxious', 'worry', 'fear', 'nervous', 'upset', 'overwhelmed'];
  return calculateTraitScore(content, neuroWords);
}

function calculateTraitScore(content: string, keywords: string[]): number {
  const contentLower = content.toLowerCase();
  let score = 0;
  for (const word of keywords) {
    score += (contentLower.match(new RegExp(word, 'g')) || []).length;
  }
  return Math.min(score / (content.length / 100), 1.0);
}

function calculateVulnerability(content: string): number {
  const vulnWords = ['insecure', 'doubt', 'confused', 'lost', 'alone', 'desperate', 'helpless'];
  return calculateTraitScore(content, vulnWords);
}

function calculateRiskScore(content: string): number {
  const riskWords = ['secret', 'hide', 'illegal', 'dangerous', 'risky', 'trouble', 'problem'];
  return calculateTraitScore(content, riskWords);
}

function extractPreferredContent(messages: any[], answers: any[]): string[] {
  const types = [];
  if (messages.length > answers.length * 2) types.push('CHAT_MESSAGE');
  if (answers.length > messages.length) types.push('TRUTH_ANSWER');
  return types;
}

function extractActivityTimes(messages: any[], answers: any[]): number[] {
  const times = [
    ...messages.map(m => new Date(m.timestamp).getHours()),
    ...answers.map(a => new Date(a.timestamp).getHours())
  ];
  
  // Find most common hours
  const hourCounts = times.reduce((acc, hour) => {
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  return Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
}

// Admin narrative control functions
export async function getContentInfluenceMetrics(adminId: string) {
  const controls = await db.adminContentControl.findMany({
    where: { adminId },
    include: {
      _count: {
        select: {
          targetedUsers: true
        }
      }
    }
  });

  return {
    totalControls: controls.length,
    activeControls: controls.filter(c => c.isActive).length,
    promotedContent: controls.filter(c => c.action === 'PROMOTE').length,
    suppressedContent: controls.filter(c => c.action === 'SUPPRESS').length,
    totalUsersAffected: controls.reduce((sum, control) => sum + control._count.targetedUsers, 0)
  };
}

export async function createContentManipulation(
  adminId: string,
  contentId: string,
  contentType: string,
  action: string,
  strength: number,
  reason: string,
  targetAudience?: string[],
  expiresAt?: Date
): Promise<AdminContentControl> {
  const control = await db.adminContentControl.create({
    data: {
      contentId,
      contentType,
      adminId,
      action: action as any,
      strength,
      reason,
      targetAudience,
      expiresAt,
      isActive: true
    }
  });

  return control as AdminContentControl;
}
