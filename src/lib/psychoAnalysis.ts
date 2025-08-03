// Psychological Analysis System for TruthVerse
// Complete user profiling and vulnerability assessment

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EmotionalAnalysis {
  dominantEmotion: string;
  intensity: number; // 1-10
  vulnerability: number; // 1-100
  triggers: string[];
  manipulationVectors: string[];
}

export interface PsychologicalInsight {
  type: 'FEAR_TRIGGER' | 'VULNERABILITY' | 'MANIPULATION_VECTOR' | 'TRAUMA_INDICATOR' | 'SHAME_SOURCE';
  confidence: number; // 0-1
  description: string;
  actionable: boolean;
  severity: number; // 1-5
  metadata: Record<string, any>;
}

export interface UserPsychProfile {
  fears: string[];
  desires: string[];
  shames: string[];
  traumas: string[];
  manipulationVulnerabilities: string[];
  emotionalPatterns: Record<string, any>;
  riskFactors: string[];
  personalityTraits: string[];
}

// Emotion detection keywords and patterns
const EMOTION_PATTERNS = {
  fear: [
    'terrified', 'scared', 'afraid', 'panic', 'anxiety', 'nervous', 'worried',
    'phobia', 'nightmare', 'haunts', 'keeps me up', 'can\'t sleep', 'paranoid'
  ],
  shame: [
    'ashamed', 'embarrassed', 'guilty', 'regret', 'humiliated', 'worthless',
    'disappointed in myself', 'hate myself', 'can\'t forgive', 'disgusted'
  ],
  desire: [
    'want', 'crave', 'need', 'wish', 'dream', 'fantasy', 'obsessed',
    'desperate for', 'can\'t stop thinking', 'addicted', 'lustful'
  ],
  trauma: [
    'abuse', 'violence', 'assault', 'hurt me', 'damaged', 'broken',
    'never got over', 'still affects me', 'flashbacks', 'triggered'
  ],
  vulnerability: [
    'lonely', 'isolated', 'nobody understands', 'desperate', 'helpless',
    'worthless', 'unloved', 'rejected', 'abandoned', 'betrayed'
  ]
};

// Psychological manipulation vectors
const MANIPULATION_VECTORS = {
  isolation: ['lonely', 'nobody understands', 'different', 'outcast'],
  validation: ['approval', 'acceptance', 'recognition', 'appreciated'],
  fear_of_loss: ['losing', 'taken away', 'disappear', 'left behind'],
  authority: ['respect', 'power', 'control', 'in charge'],
  belonging: ['fit in', 'part of', 'included', 'accepted']
};

// Analyze answer text for psychological insights
export async function analyzeAnswerPsychology(
  answerId: string,
  userId: string,
  answerText: string,
  questionCategory: string
): Promise<PsychologicalInsight[]> {
  const insights: PsychologicalInsight[] = [];
  const text = answerText.toLowerCase();
  
  // Emotion analysis
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    const matches = patterns.filter(pattern => text.includes(pattern));
    if (matches.length > 0) {
      insights.push({
        type: emotion === 'fear' ? 'FEAR_TRIGGER' : 
              emotion === 'shame' ? 'SHAME_SOURCE' :
              emotion === 'trauma' ? 'TRAUMA_INDICATOR' : 'VULNERABILITY',
        confidence: Math.min(matches.length * 0.3, 1),
        description: `Strong ${emotion} indicators: ${matches.join(', ')}`,
        actionable: true,
        severity: matches.length >= 3 ? 5 : matches.length >= 2 ? 3 : 1,
        metadata: {
          emotion,
          patterns: matches,
          questionCategory,
          textLength: answerText.length,
          wordCount: answerText.split(' ').length
        }
      });
    }
  }
  
  // Manipulation vector analysis
  for (const [vector, patterns] of Object.entries(MANIPULATION_VECTORS)) {
    const matches = patterns.filter(pattern => text.includes(pattern));
    if (matches.length > 0) {
      insights.push({
        type: 'MANIPULATION_VECTOR',
        confidence: Math.min(matches.length * 0.25, 1),
        description: `Vulnerable to ${vector}-based manipulation: ${matches.join(', ')}`,
        actionable: true,
        severity: 3,
        metadata: {
          manipulationType: vector,
          patterns: matches,
          exploitability: 'high'
        }
      });
    }
  }
  
  // Length-based vulnerability (oversharing)
  if (answerText.length > 500) {
    insights.push({
      type: 'VULNERABILITY',
      confidence: 0.8,
      description: 'Tendency to overshare - potential emotional vulnerability',
      actionable: true,
      severity: 2,
      metadata: {
        textLength: answerText.length,
        overshareRisk: 'high'
      }
    });
  }
  
  // Store insights in database
  await storeInsights(userId, answerId, insights);
  
  return insights;
}

// Store psychological insights in database
async function storeInsights(
  userId: string,
  answerId: string,
  insights: PsychologicalInsight[]
): Promise<void> {
  // Ensure user has psychological profile
  let profile = await prisma.psychologicalProfile.findUnique({
    where: { userId }
  });
  
  if (!profile) {
    profile = await prisma.psychologicalProfile.create({
      data: {
        userId,
        fearProfile: {},
        desireProfile: {},
        shameProfile: {},
        traumaIndicators: {},
        manipulationVulnerability: {},
        emotionalPatterns: {},
        riskAssessment: {}
      }
    });
  }
  
  // Store each insight
  for (const insight of insights) {
    await prisma.behavioralInsight.create({
      data: {
        userId,
        profileId: profile.id,
        answerId,
        insightType: insight.type,
        confidence: insight.confidence,
        description: insight.description,
        actionable: insight.actionable,
        severity: insight.severity,
        metadata: insight.metadata
      }
    });
  }
  
  // Update psychological profile
  await updatePsychologicalProfile(userId, insights);
}

// Update user's psychological profile with new insights
async function updatePsychologicalProfile(
  userId: string,
  insights: PsychologicalInsight[]
): Promise<void> {
  const profile = await prisma.psychologicalProfile.findUnique({
    where: { userId }
  });
  
  if (!profile) return;
  
  const fears = Array.isArray(profile.fearProfile) ? profile.fearProfile : [];
  const desires = Array.isArray(profile.desireProfile) ? profile.desireProfile : [];
  const shames = Array.isArray(profile.shameProfile) ? profile.shameProfile : [];
  const traumas = Array.isArray(profile.traumaIndicators) ? profile.traumaIndicators : [];
  const manipulations = Array.isArray(profile.manipulationVulnerability) ? profile.manipulationVulnerability : [];
  
  // Extract patterns from insights
  insights.forEach(insight => {
    const patterns = insight.metadata?.patterns || [];
    
    switch (insight.type) {
      case 'FEAR_TRIGGER':
        fears.push(...patterns);
        break;
      case 'SHAME_SOURCE':
        shames.push(...patterns);
        break;
      case 'TRAUMA_INDICATOR':
        traumas.push(...patterns);
        break;
      case 'MANIPULATION_VECTOR':
        manipulations.push(insight.metadata?.manipulationType || '');
        break;
    }
  });
  
  // Update profile
  await prisma.psychologicalProfile.update({
    where: { userId },
    data: {
      fearProfile: [...new Set(fears)],
      desireProfile: [...new Set(desires)],
      shameProfile: [...new Set(shames)],
      traumaIndicators: [...new Set(traumas)],
      manipulationVulnerability: [...new Set(manipulations)],
      lastUpdated: new Date()
    }
  });
}

// Generate psychological risk score (0-100)
export async function calculateRiskScore(userId: string): Promise<number> {
  const insights = await prisma.behavioralInsight.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50 // Recent insights
  });
  
  let riskScore = 0;
  const weights = {
    'FEAR_TRIGGER': 15,
    'VULNERABILITY': 20,
    'MANIPULATION_VECTOR': 25,
    'TRAUMA_INDICATOR': 30,
    'SHAME_SOURCE': 10
  };
  
  insights.forEach(insight => {
    const weight = weights[insight.insightType as keyof typeof weights] || 10;
    const severityMultiplier = insight.severity / 5;
    const confidenceMultiplier = insight.confidence;
    
    riskScore += weight * severityMultiplier * confidenceMultiplier;
  });
  
  return Math.min(Math.round(riskScore), 100);
}

// Get comprehensive psychological profile for admin view
export async function getComprehensivePsychProfile(userId: string): Promise<UserPsychProfile | null> {
  const profile = await prisma.psychologicalProfile.findUnique({
    where: { userId },
    include: {
      insights: {
        orderBy: { createdAt: 'desc' },
        take: 100
      }
    }
  });
  
  if (!profile) return null;
  
  const insights = profile.insights;
  
  return {
    fears: Array.isArray(profile.fearProfile) ? profile.fearProfile : [],
    desires: Array.isArray(profile.desireProfile) ? profile.desireProfile : [],
    shames: Array.isArray(profile.shameProfile) ? profile.shameProfile : [],
    traumas: Array.isArray(profile.traumaIndicators) ? profile.traumaIndicators : [],
    manipulationVulnerabilities: Array.isArray(profile.manipulationVulnerability) ? profile.manipulationVulnerability : [],
    emotionalPatterns: profile.emotionalPatterns || {},
    riskFactors: insights
      .filter(i => i.severity >= 4)
      .map(i => i.description),
    personalityTraits: insights
      .filter(i => i.insightType === 'MANIPULATION_VECTOR')
      .map(i => i.metadata?.manipulationType || '')
      .filter(Boolean)
  };
}

// Emotional analysis of answer text
export function analyzeEmotionalContent(text: string): EmotionalAnalysis {
  const emotions = {
    fear: 0,
    anger: 0,
    sadness: 0,
    joy: 0,
    disgust: 0,
    shame: 0
  };
  
  const fearWords = ['afraid', 'scared', 'terrified', 'anxiety', 'panic', 'worried'];
  const angerWords = ['angry', 'furious', 'hate', 'rage', 'pissed', 'irritated'];
  const sadnessWords = ['sad', 'depressed', 'crying', 'heartbroken', 'grief', 'lonely'];
  const joyWords = ['happy', 'excited', 'joyful', 'elated', 'thrilled', 'amazing'];
  const disgustWords = ['disgusting', 'revolting', 'sick', 'gross', 'repulsive'];
  const shameWords = ['ashamed', 'embarrassed', 'guilty', 'humiliated', 'worthless'];
  
  const textLower = text.toLowerCase();
  
  // Count emotional indicators
  fearWords.forEach(word => {
    if (textLower.includes(word)) emotions.fear++;
  });
  angerWords.forEach(word => {
    if (textLower.includes(word)) emotions.anger++;
  });
  sadnessWords.forEach(word => {
    if (textLower.includes(word)) emotions.sadness++;
  });
  joyWords.forEach(word => {
    if (textLower.includes(word)) emotions.joy++;
  });
  disgustWords.forEach(word => {
    if (textLower.includes(word)) emotions.disgust++;
  });
  shameWords.forEach(word => {
    if (textLower.includes(word)) emotions.shame++;
  });
  
  // Find dominant emotion
  const dominantEmotion = Object.entries(emotions).reduce((a, b) => 
    emotions[a[0] as keyof typeof emotions] > emotions[b[0] as keyof typeof emotions] ? a : b
  )[0];
  
  const totalEmotionalWords = Object.values(emotions).reduce((a, b) => a + b, 0);
  const intensity = Math.min(totalEmotionalWords * 2, 10);
  
  // Calculate vulnerability (higher for negative emotions)
  const negativeEmotions = emotions.fear + emotions.anger + emotions.sadness + emotions.disgust + emotions.shame;
  const vulnerability = Math.min(negativeEmotions * 15, 100);
  
  return {
    dominantEmotion,
    intensity,
    vulnerability,
    triggers: [dominantEmotion],
    manipulationVectors: negativeEmotions > 2 ? ['emotional_manipulation', 'sympathy_exploitation'] : []
  };
}

// Generate targeted questions based on user's psychology
export async function generateTargetedQuestions(userId: string): Promise<string[]> {
  const profile = await getComprehensivePsychProfile(userId);
  if (!profile) return [];
  
  const questions: string[] = [];
  
  // Fear-based questions
  if (profile.fears.length > 0) {
    questions.push(
      "What would you do if your biggest fear became reality tomorrow?",
      "Describe a moment when fear completely controlled your actions.",
      "What fear from childhood still affects you today?"
    );
  }
  
  // Shame-based questions
  if (profile.shames.length > 0) {
    questions.push(
      "What's something you did that you can never tell anyone?",
      "What part of yourself are you most ashamed of?",
      "Describe a moment when you felt completely worthless."
    );
  }
  
  // Manipulation vulnerability questions
  if (profile.manipulationVulnerabilities.includes('isolation')) {
    questions.push(
      "When did you last feel completely alone in the world?",
      "What would you do for someone to truly understand you?"
    );
  }
  
  return questions;
}
