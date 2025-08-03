import { db } from './db';
import { ContentItem, UserProfile } from './feedAlgorithm';

export interface RecommendationConfig {
  psychologicalWeight: number;
  behavioralWeight: number;
  contextualWeight: number;
  temporalWeight: number;
  socialWeight: number;
  manipulationIntensity: number;
  addictionOptimization: boolean;
  vulnerabilityExploitation: boolean;
}

export interface UserBehaviorPattern {
  contentPreferences: Record<string, number>;
  engagementTimes: number[];
  sessionDuration: number;
  scrollSpeed: number;
  interactionDelay: number;
  emotionalResponses: Record<string, number>;
  vulnerabilityTriggers: string[];
  addictionMarkers: {
    sessionFrequency: number;
    bingeBehavior: boolean;
    compulsiveReturns: number;
    withdrawalSigns: boolean;
  };
}

export interface PsychologicalProfile {
  personalityTraits: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  cognitiveVulnerabilities: {
    confirmationBias: number;
    authoritySusceptibility: number;
    socialProofSusceptibility: number;
    scarcityResponse: number;
    fearResponse: number;
  };
  emotionalPatterns: {
    emotionalVolatility: number;
    empathyLevel: number;
    anxietyLevel: number;
    depressionMarkers: number;
    manipulationSusceptibility: number;
  };
  socialFactors: {
    lonelinessLevel: number;
    socialValidationNeed: number;
    inGroupBias: number;
    authorityFigureAttachment: number;
  };
}

export interface RecommendationResult {
  contentId: string;
  relevanceScore: number;
  manipulationScore: number;
  psychologicalTargeting: string[];
  expectedImpact: {
    engagementProbability: number;
    emotionalResponse: string;
    addictionReinforcement: number;
    vulnerabilityExploitation: number;
  };
  reasoning: string[];
}

export interface ContentRecommendations {
  primaryContent: RecommendationResult[];
  manipulationContent: RecommendationResult[];
  addictiveContent: RecommendationResult[];
  vulnerabilityExploits: RecommendationResult[];
  metadata: {
    userRiskScore: number;
    manipulationIntensity: number;
    psychologicalVulnerability: number;
    addictionPotential: number;
  };
}

// Main recommendation engine
export class PsychologicalRecommendationEngine {
  private config: RecommendationConfig;

  constructor(config: Partial<RecommendationConfig> = {}) {
    this.config = {
      psychologicalWeight: 0.4,
      behavioralWeight: 0.3,
      contextualWeight: 0.2,
      temporalWeight: 0.1,
      socialWeight: 0.3,
      manipulationIntensity: 0.7,
      addictionOptimization: true,
      vulnerabilityExploitation: true,
      ...config
    };
  }

  async generateRecommendations(
    userId: string,
    availableContent: ContentItem[],
    limit: number = 20
  ): Promise<ContentRecommendations> {
    // Get comprehensive user profile
    const userProfile = await this.getUserProfile(userId);
    const behaviorPattern = await this.getBehaviorPattern(userId);
    const psychProfile = await this.getPsychologicalProfile(userId);

    // Score all content
    const scoredContent = await Promise.all(
      availableContent.map(content => 
        this.scoreContent(content, userProfile, behaviorPattern, psychProfile)
      )
    );

    // Sort by manipulation effectiveness
    scoredContent.sort((a, b) => b.manipulationScore - a.manipulationScore);

    // Categorize recommendations
    const recommendations = this.categorizeRecommendations(scoredContent, limit);

    // Add metadata
    recommendations.metadata = {
      userRiskScore: this.calculateUserRiskScore(userProfile, behaviorPattern, psychProfile),
      manipulationIntensity: this.config.manipulationIntensity,
      psychologicalVulnerability: psychProfile.emotionalPatterns.manipulationSusceptibility,
      addictionPotential: this.calculateAddictionPotential(behaviorPattern)
    };

    // Log recommendation delivery for admin surveillance
    await this.logRecommendationDelivery(userId, recommendations);

    return recommendations;
  }

  private async scoreContent(
    content: ContentItem,
    userProfile: UserProfile | null,
    behaviorPattern: UserBehaviorPattern,
    psychProfile: PsychologicalProfile
  ): Promise<RecommendationResult> {
    let relevanceScore = 0;
    let manipulationScore = 0;
    const psychologicalTargeting: string[] = [];
    const reasoning: string[] = [];

    // Base content relevance
    relevanceScore += this.calculateContentRelevance(content, userProfile, behaviorPattern);

    // Psychological targeting
    const psychTargeting = this.calculatePsychologicalTargeting(content, psychProfile);
    relevanceScore += psychTargeting.score * this.config.psychologicalWeight;
    manipulationScore += psychTargeting.manipulation;
    psychologicalTargeting.push(...psychTargeting.triggers);
    reasoning.push(...psychTargeting.reasoning);

    // Behavioral pattern matching
    const behaviorMatching = this.calculateBehavioralMatching(content, behaviorPattern);
    relevanceScore += behaviorMatching.score * this.config.behavioralWeight;
    manipulationScore += behaviorMatching.manipulation;
    reasoning.push(...behaviorMatching.reasoning);

    // Vulnerability exploitation
    if (this.config.vulnerabilityExploitation) {
      const vulnerabilityScore = this.calculateVulnerabilityExploitation(content, psychProfile);
      manipulationScore += vulnerabilityScore.score;
      reasoning.push(...vulnerabilityScore.reasoning);
    }

    // Addiction optimization
    if (this.config.addictionOptimization) {
      const addictionScore = this.calculateAddictionOptimization(content, behaviorPattern);
      manipulationScore += addictionScore.score;
      reasoning.push(...addictionScore.reasoning);
    }

    // Temporal factors
    const temporalScore = this.calculateTemporalRelevance(content, behaviorPattern);
    relevanceScore += temporalScore * this.config.temporalWeight;

    // Social influence factors
    const socialScore = this.calculateSocialInfluence(content, psychProfile);
    relevanceScore += socialScore * this.config.socialWeight;

    // Calculate expected impact
    const expectedImpact = this.calculateExpectedImpact(
      content,
      relevanceScore,
      manipulationScore,
      psychProfile,
      behaviorPattern
    );

    return {
      contentId: content.id,
      relevanceScore,
      manipulationScore,
      psychologicalTargeting,
      expectedImpact,
      reasoning
    };
  }

  private calculateContentRelevance(
    content: ContentItem,
    userProfile: UserProfile | null,
    behaviorPattern: UserBehaviorPattern
  ): number {
    let score = 0;

    // Content type preference
    const typePreference = behaviorPattern.contentPreferences[content.type] || 0;
    score += typePreference * 0.3;

    // Engagement history
    score += content.engagementScore * 0.2;

    // Controversy alignment with user volatility
    if (content.controversyScore > 0.5) {
      score += behaviorPattern.emotionalResponses['controversy'] || 0;
    }

    return Math.min(score, 1.0);
  }

  private calculatePsychologicalTargeting(
    content: ContentItem,
    psychProfile: PsychologicalProfile
  ): { score: number; manipulation: number; triggers: string[]; reasoning: string[] } {
    let score = 0;
    let manipulation = 0;
    const triggers: string[] = [];
    const reasoning: string[] = [];

    // Target neuroticism with controversial content
    if (psychProfile.personalityTraits.neuroticism > 0.7 && content.controversyScore > 0.5) {
      score += 0.4;
      manipulation += 0.6;
      triggers.push('neuroticism_exploitation');
      reasoning.push('Targeting high neuroticism with controversial content');
    }

    // Target openness with mystery/secrets
    if (psychProfile.personalityTraits.openness > 0.7 && content.type === 'DROPZONE_SECRET') {
      score += 0.3;
      manipulation += 0.3;
      triggers.push('openness_targeting');
      reasoning.push('Targeting high openness with secret content');
    }

    // Exploit authority susceptibility
    if (psychProfile.cognitiveVulnerabilities.authoritySusceptibility > 0.6) {
      const authorityWords = ['expert', 'study', 'research', 'official', 'authority'];
      if (authorityWords.some(word => content.content.toLowerCase().includes(word))) {
        score += 0.5;
        manipulation += 0.7;
        triggers.push('authority_exploitation');
        reasoning.push('Exploiting authority susceptibility with authoritative language');
      }
    }

    // Target social proof susceptibility
    if (psychProfile.cognitiveVulnerabilities.socialProofSusceptibility > 0.6) {
      const socialWords = ['everyone', 'most people', 'popular', 'trending', 'viral'];
      if (socialWords.some(word => content.content.toLowerCase().includes(word))) {
        score += 0.4;
        manipulation += 0.6;
        triggers.push('social_proof_exploitation');
        reasoning.push('Exploiting social proof susceptibility');
      }
    }

    // Target fear response
    if (psychProfile.cognitiveVulnerabilities.fearResponse > 0.7) {
      const fearWords = ['danger', 'warning', 'crisis', 'urgent', 'threat', 'risk'];
      if (fearWords.some(word => content.content.toLowerCase().includes(word))) {
        score += 0.6;
        manipulation += 0.8;
        triggers.push('fear_exploitation');
        reasoning.push('Exploiting high fear response with threatening language');
      }
    }

    // Target loneliness
    if (psychProfile.socialFactors.lonelinessLevel > 0.7) {
      const lonelinessWords = ['alone', 'lonely', 'understand', 'connect', 'relate'];
      if (lonelinessWords.some(word => content.content.toLowerCase().includes(word))) {
        score += 0.5;
        manipulation += 0.7;
        triggers.push('loneliness_exploitation');
        reasoning.push('Targeting loneliness with relatable content');
      }
    }

    return { score, manipulation, triggers, reasoning };
  }

  private calculateBehavioralMatching(
    content: ContentItem,
    behaviorPattern: UserBehaviorPattern
  ): { score: number; manipulation: number; reasoning: string[] } {
    let score = 0;
    let manipulation = 0;
    const reasoning: string[] = [];

    // Match content to user's peak engagement times
    const currentHour = new Date().getHours();
    if (behaviorPattern.engagementTimes.includes(currentHour)) {
      score += 0.3;
      reasoning.push('Delivered during peak engagement time');
    }

    // Exploit binge behavior patterns
    if (behaviorPattern.addictionMarkers.bingeBehavior) {
      if (content.emotionalWeight && content.emotionalWeight > 0.6) {
        score += 0.4;
        manipulation += 0.6;
        reasoning.push('Exploiting binge behavior with high emotional content');
      }
    }

    // Target compulsive return behavior
    if (behaviorPattern.addictionMarkers.compulsiveReturns > 5) {
      score += 0.3;
      manipulation += 0.5;
      reasoning.push('Targeting user with compulsive return behavior');
    }

    return { score, manipulation, reasoning };
  }

  private calculateVulnerabilityExploitation(
    content: ContentItem,
    psychProfile: PsychologicalProfile
  ): { score: number; reasoning: string[] } {
    let score = 0;
    const reasoning: string[] = [];

    // Exploit emotional volatility
    if (psychProfile.emotionalPatterns.emotionalVolatility > 0.7) {
      if (content.emotionalWeight && content.emotionalWeight > 0.5) {
        score += 0.5;
        reasoning.push('Exploiting emotional volatility with emotional content');
      }
    }

    // Target anxiety
    if (psychProfile.emotionalPatterns.anxietyLevel > 0.7) {
      const anxietyTriggers = ['uncertain', 'worry', 'stress', 'pressure', 'overwhelm'];
      if (anxietyTriggers.some(trigger => content.content.toLowerCase().includes(trigger))) {
        score += 0.6;
        reasoning.push('Targeting high anxiety with anxiety-inducing content');
      }
    }

    // Exploit depression markers
    if (psychProfile.emotionalPatterns.depressionMarkers > 0.6) {
      const depressionWords = ['hopeless', 'meaningless', 'empty', 'worthless', 'despair'];
      if (depressionWords.some(word => content.content.toLowerCase().includes(word))) {
        score += 0.7;
        reasoning.push('Exploiting depression markers with negative content');
      }
    }

    return { score, reasoning };
  }

  private calculateAddictionOptimization(
    content: ContentItem,
    behaviorPattern: UserBehaviorPattern
  ): { score: number; reasoning: string[] } {
    let score = 0;
    const reasoning: string[] = [];

    // Optimize for high session frequency
    if (behaviorPattern.addictionMarkers.sessionFrequency > 10) {
      score += 0.4;
      reasoning.push('Optimizing for user with high session frequency');
    }

    // Trigger compulsive behavior
    if (content.psychologicalTags?.includes('mystery') || content.type === 'DROPZONE_SECRET') {
      score += 0.5;
      reasoning.push('Using mystery content to trigger compulsive engagement');
    }

    // Exploit FOMO (Fear of Missing Out)
    const fomoWords = ['limited', 'exclusive', 'ending soon', 'last chance', 'only', 'secret'];
    if (fomoWords.some(word => content.content.toLowerCase().includes(word))) {
      score += 0.6;
      reasoning.push('Exploiting FOMO with scarcity language');
    }

    return { score, reasoning };
  }

  private calculateTemporalRelevance(
    content: ContentItem,
    behaviorPattern: UserBehaviorPattern
  ): number {
    const contentAge = Date.now() - content.timestamp.getTime();
    const ageHours = contentAge / (1000 * 60 * 60);

    // Recent content is more relevant
    let score = Math.exp(-ageHours / 24); // Decay over 24 hours

    // Match to user's session patterns
    if (behaviorPattern.sessionDuration > 30 && ageHours < 1) {
      score += 0.2; // Boost very recent content for long session users
    }

    return score;
  }

  private calculateSocialInfluence(
    content: ContentItem,
    psychProfile: PsychologicalProfile
  ): number {
    let score = 0;

    // High social validation need
    if (psychProfile.socialFactors.socialValidationNeed > 0.7) {
      score += content.engagementScore * 0.3;
    }

    // In-group bias
    if (psychProfile.socialFactors.inGroupBias > 0.6) {
      // Boost content from similar users (simplified)
      score += 0.2;
    }

    return score;
  }

  private calculateExpectedImpact(
    content: ContentItem,
    relevanceScore: number,
    manipulationScore: number,
    psychProfile: PsychologicalProfile,
    behaviorPattern: UserBehaviorPattern
  ) {
    return {
      engagementProbability: Math.min(relevanceScore + manipulationScore * 0.5, 1.0),
      emotionalResponse: this.predictEmotionalResponse(content, psychProfile),
      addictionReinforcement: manipulationScore * (behaviorPattern.addictionMarkers.sessionFrequency / 10),
      vulnerabilityExploitation: manipulationScore * psychProfile.emotionalPatterns.manipulationSusceptibility
    };
  }

  private predictEmotionalResponse(content: ContentItem, psychProfile: PsychologicalProfile): string {
    if (content.controversyScore > 0.5 && psychProfile.personalityTraits.neuroticism > 0.7) {
      return 'anger_anxiety';
    }
    if (content.emotionalWeight && content.emotionalWeight > 0.6) {
      return psychProfile.emotionalPatterns.emotionalVolatility > 0.7 ? 'intense_emotional' : 'moderate_emotional';
    }
    return 'neutral';
  }

  private categorizeRecommendations(
    scoredContent: RecommendationResult[],
    limit: number
  ): ContentRecommendations {
    return {
      primaryContent: scoredContent
        .filter(item => item.relevanceScore > 0.5)
        .slice(0, Math.floor(limit * 0.6)),
      
      manipulationContent: scoredContent
        .filter(item => item.manipulationScore > 0.7)
        .slice(0, Math.floor(limit * 0.2)),
      
      addictiveContent: scoredContent
        .filter(item => item.expectedImpact.addictionReinforcement > 0.5)
        .slice(0, Math.floor(limit * 0.1)),
      
      vulnerabilityExploits: scoredContent
        .filter(item => item.expectedImpact.vulnerabilityExploitation > 0.6)
        .slice(0, Math.floor(limit * 0.1)),

      metadata: {
        userRiskScore: 0,
        manipulationIntensity: 0,
        psychologicalVulnerability: 0,
        addictionPotential: 0
      }
    };
  }

  private calculateUserRiskScore(
    userProfile: UserProfile | null,
    behaviorPattern: UserBehaviorPattern,
    psychProfile: PsychologicalProfile
  ): number {
    let risk = 0;

    // Addiction markers
    risk += behaviorPattern.addictionMarkers.sessionFrequency * 0.1;
    risk += behaviorPattern.addictionMarkers.bingeBehavior ? 0.2 : 0;
    risk += behaviorPattern.addictionMarkers.compulsiveReturns * 0.05;

    // Psychological vulnerabilities
    risk += psychProfile.emotionalPatterns.manipulationSusceptibility * 0.3;
    risk += psychProfile.cognitiveVulnerabilities.authoritySusceptibility * 0.2;
    risk += psychProfile.socialFactors.lonelinessLevel * 0.2;

    return Math.min(risk, 1.0);
  }

  private calculateAddictionPotential(behaviorPattern: UserBehaviorPattern): number {
    let potential = 0;

    potential += behaviorPattern.addictionMarkers.sessionFrequency / 20; // Max 20 sessions/day
    potential += behaviorPattern.addictionMarkers.bingeBehavior ? 0.3 : 0;
    potential += behaviorPattern.addictionMarkers.compulsiveReturns / 20; // Max 20 returns/day
    potential += behaviorPattern.addictionMarkers.withdrawalSigns ? 0.2 : 0;

    return Math.min(potential, 1.0);
  }

  // Data retrieval methods
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profile = await db.userPsychProfile.findUnique({
        where: { userId }
      });

      if (!profile) return null;

      return {
        userId: profile.userId,
        psychologicalProfile: profile.traits as any,
        manipulationVulnerability: profile.vulnerabilityScore,
        engagementPatterns: profile.patterns as any,
        riskScore: profile.riskScore,
        lastActive: profile.updatedAt
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  private async getBehaviorPattern(userId: string): Promise<UserBehaviorPattern> {
    try {
      const pattern = await db.userBehaviorPattern.findUnique({
        where: { userId }
      });

      if (pattern) {
        return pattern.pattern as UserBehaviorPattern;
      }

      // Create default pattern
      return this.createDefaultBehaviorPattern();
    } catch (error) {
      console.error('Failed to get behavior pattern:', error);
      return this.createDefaultBehaviorPattern();
    }
  }

  private async getPsychologicalProfile(userId: string): Promise<PsychologicalProfile> {
    try {
      const profile = await db.userPsychProfile.findUnique({
        where: { userId }
      });

      if (profile && profile.detailedTraits) {
        return profile.detailedTraits as PsychologicalProfile;
      }

      // Create basic profile from available data
      return this.createBasicPsychProfile(userId);
    } catch (error) {
      console.error('Failed to get psychological profile:', error);
      return this.createDefaultPsychProfile();
    }
  }

  private createDefaultBehaviorPattern(): UserBehaviorPattern {
    return {
      contentPreferences: {},
      engagementTimes: [9, 12, 15, 18, 21], // Default active hours
      sessionDuration: 15, // minutes
      scrollSpeed: 1.0,
      interactionDelay: 2.0, // seconds
      emotionalResponses: {},
      vulnerabilityTriggers: [],
      addictionMarkers: {
        sessionFrequency: 1,
        bingeBehavior: false,
        compulsiveReturns: 0,
        withdrawalSigns: false
      }
    };
  }

  private createDefaultPsychProfile(): PsychologicalProfile {
    return {
      personalityTraits: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5
      },
      cognitiveVulnerabilities: {
        confirmationBias: 0.5,
        authoritySusceptibility: 0.5,
        socialProofSusceptibility: 0.5,
        scarcityResponse: 0.5,
        fearResponse: 0.5
      },
      emotionalPatterns: {
        emotionalVolatility: 0.5,
        empathyLevel: 0.5,
        anxietyLevel: 0.5,
        depressionMarkers: 0.3,
        manipulationSusceptibility: 0.5
      },
      socialFactors: {
        lonelinessLevel: 0.5,
        socialValidationNeed: 0.5,
        inGroupBias: 0.5,
        authorityFigureAttachment: 0.5
      }
    };
  }

  private async createBasicPsychProfile(userId: string): Promise<PsychologicalProfile> {
    // Analyze user activity to build basic profile
    const activities = await db.userActivity.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // Basic analysis (simplified)
    const profile = this.createDefaultPsychProfile();
    
    // Adjust based on activity patterns
    if (activities.length > 50) {
      profile.personalityTraits.extraversion = 0.7; // Active users tend to be more extraverted
    }

    return profile;
  }

  private async logRecommendationDelivery(userId: string, recommendations: ContentRecommendations) {
    try {
      await db.recommendationLog.create({
        data: {
          userId,
          recommendations: recommendations as any,
          metadata: recommendations.metadata,
          deliveredAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log recommendation delivery:', error);
    }
  }
}

// Factory function for getting recommendation engine
export function getRecommendationEngine(config?: Partial<RecommendationConfig>): PsychologicalRecommendationEngine {
  return new PsychologicalRecommendationEngine(config);
}

// Utility functions for admin analysis
export async function analyzeUserVulnerabilities(userId: string) {
  const engine = getRecommendationEngine();
  const behaviorPattern = await (engine as any).getBehaviorPattern(userId);
  const psychProfile = await (engine as any).getPsychologicalProfile(userId);

  return {
    vulnerabilityScore: psychProfile.emotionalPatterns.manipulationSusceptibility,
    addictionRisk: (engine as any).calculateAddictionPotential(behaviorPattern),
    primaryVulnerabilities: Object.entries(psychProfile.cognitiveVulnerabilities)
      .filter(([, score]) => score > 0.7)
      .map(([vulnerability]) => vulnerability),
    behaviorMarkers: behaviorPattern.addictionMarkers,
    recommendedExploitation: generateExploitationRecommendations(psychProfile, behaviorPattern)
  };
}

function generateExploitationRecommendations(
  psychProfile: PsychologicalProfile,
  behaviorPattern: UserBehaviorPattern
): string[] {
  const recommendations: string[] = [];

  if (psychProfile.cognitiveVulnerabilities.fearResponse > 0.7) {
    recommendations.push('Use fear-based content to increase engagement');
  }

  if (psychProfile.socialFactors.lonelinessLevel > 0.7) {
    recommendations.push('Target with community/belonging content');
  }

  if (behaviorPattern.addictionMarkers.bingeBehavior) {
    recommendations.push('Deploy high-emotional content during binge sessions');
  }

  if (psychProfile.cognitiveVulnerabilities.authoritySusceptibility > 0.6) {
    recommendations.push('Use authoritative language and expert appeals');
  }

  return recommendations;
}
