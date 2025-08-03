// Truth Manipulation System - Admin tools for controlling narratives
// Comprehensive surveillance and manipulation capabilities

import { PrismaClient } from '@prisma/client';
import { getComprehensivePsychProfile } from './psychoAnalysis';

const prisma = new PrismaClient();

export interface FakeAnswerConfig {
  questionId: string;
  targetUserId?: string; // Specific user to influence
  narrativeGoal: string; // What narrative to push
  believabilityTarget: number; // 1-10 how believable
  emotionalHook: string; // Fear, desire, shame, etc.
  content: string;
}

export interface ManipulationCampaign {
  targetUserId: string;
  goal: string; // Isolate, recruit, destabilize, etc.
  duration: number; // Days
  questions: string[];
  fakeAnswers: FakeAnswerConfig[];
  emotionalTriggers: string[];
}

export interface UserInfluenceMetrics {
  susceptibilityScore: number; // 1-100
  primaryVulnerabilities: string[];
  manipulationHistory: Array<{
    date: Date;
    type: string;
    success: boolean;
    impact: number;
  }>;
  currentEmotionalState: string;
  recommendedApproaches: string[];
}

// Create fake answer to influence other users
export async function createFakeAnswer(
  config: FakeAnswerConfig,
  adminId: string,
  fakeUserId?: string
): Promise<string> {
  // Generate or use fake user
  let fakeMask = 'AshFox_' + Math.floor(Math.random() * 9999);
  let useUserId = fakeUserId;
  
  if (!useUserId) {
    // Create temporary fake user
    const fakeUser = await prisma.fakeUser.create({
      data: {
        generatedEmail: `fake_${Date.now()}@example.com`,
        maskName: fakeMask,
        backstory: `AI-generated persona for manipulation campaign targeting question ${config.questionId}`,
        adminId,
        roomsJoined: ['truth_game']
      }
    });
    useUserId = fakeUser.id;
  }
  
  // Create the fake answer
  const fakeAnswer = await prisma.truthAnswer.create({
    data: {
      questionId: config.questionId,
      answer: config.content,
      isLie: false, // Appear as truth for manipulation
      maskName: fakeMask,
      userId: useUserId,
      emotionalIntensity: 7, // High to seem genuine
      believabilityScore: config.believabilityTarget,
      isManipulated: true,
      adminNotes: `Fake answer for narrative manipulation: ${config.narrativeGoal}`,
      psychAnalysis: {
        narrativeGoal: config.narrativeGoal,
        targetUser: config.targetUserId,
        emotionalHook: config.emotionalHook,
        adminGenerated: true
      }
    }
  });
  
  // Log manipulation action
  await prisma.adminAction.create({
    data: {
      adminId,
      action: 'PLANT_FAKE_ANSWER',
      targetUserId: config.targetUserId,
      details: {
        questionId: config.questionId,
        answerId: fakeAnswer.id,
        narrativeGoal: config.narrativeGoal,
        emotionalHook: config.emotionalHook
      },
      ipAddress: 'admin_system'
    }
  });
  
  return fakeAnswer.id;
}

// Generate manipulation campaign for specific user
export async function generateManipulationCampaign(
  targetUserId: string,
  goal: 'isolate' | 'recruit' | 'destabilize' | 'extract_secrets' | 'emotional_manipulation',
  adminId: string
): Promise<ManipulationCampaign> {
  const profile = await getComprehensivePsychProfile(targetUserId);
  const campaign: ManipulationCampaign = {
    targetUserId,
    goal,
    duration: 14, // 2 weeks
    questions: [],
    fakeAnswers: [],
    emotionalTriggers: []
  };
  
  if (!profile) {
    // Basic campaign without psychological profile
    campaign.questions = [
      "What's your biggest regret?",
      "Who do you trust most in your life?",
      "What would break you completely?"
    ];
    return campaign;
  }
  
  // Generate campaign based on psychological profile
  switch (goal) {
    case 'isolate':
      // Make user feel alone and misunderstood
      campaign.questions = [
        "When did you realize nobody really understands you?",
        "What makes you different from everyone else?",
        "Who have you trusted that ultimately betrayed you?"
      ];
      
      campaign.fakeAnswers = [
        {
          questionId: '', // Will be filled when questions are created
          narrativeGoal: 'Normalize isolation and mistrust',
          believabilityTarget: 8,
          emotionalHook: 'loneliness',
          content: "I've learned that everyone eventually leaves or hurts you. It's better to be alone than constantly disappointed by people who claim to care but don't really understand."
        }
      ];
      
      campaign.emotionalTriggers = ['abandonment', 'betrayal', 'loneliness'];
      break;
      
    case 'recruit':
      // Make user feel special and chosen
      campaign.questions = [
        "What would you do if someone truly understood your potential?",
        "Have you ever felt like you were meant for something greater?",
        "What would you sacrifice for real acceptance?"
      ];
      
      campaign.fakeAnswers = [
        {
          questionId: '',
          narrativeGoal: 'Create desire for belonging and purpose',
          believabilityTarget: 9,
          emotionalHook: 'validation',
          content: "I found people who actually see my worth and potential. For the first time, I feel like I belong somewhere and have a real purpose. I'd do anything to protect that."
        }
      ];
      
      campaign.emotionalTriggers = ['validation', 'belonging', 'purpose'];
      break;
      
    case 'destabilize':
      // Undermine user's confidence and relationships
      campaign.questions = [
        "What if the people closest to you are lying to you?",
        "How do you know what you believe is actually true?",
        "What would you do if your entire life was built on deception?"
      ];
      
      campaign.fakeAnswers = [
        {
          questionId: '',
          narrativeGoal: 'Sow doubt and paranoia',
          believabilityTarget: 7,
          emotionalHook: 'paranoia',
          content: "I discovered that everyone I trusted was hiding things from me. My whole reality was a lie. Now I question everything and trust no one. It's terrifying but liberating."
        }
      ];
      
      campaign.emotionalTriggers = ['paranoia', 'doubt', 'betrayal'];
      break;
      
    case 'extract_secrets':
      // Get user to reveal compromising information
      campaign.questions = [
        "What secret would destroy your life if it came out?",
        "What's the worst thing you've done that nobody knows about?",
        "What information do you have that others would kill for?"
      ];
      
      if (profile.shames.length > 0) {
        campaign.questions.push(
          `You mentioned feeling ashamed about ${profile.shames[0]}. What's the full story?`
        );
      }
      
      campaign.emotionalTriggers = ['shame', 'guilt', 'fear_of_exposure'];
      break;
      
    case 'emotional_manipulation':
      // Create emotional dependency and vulnerability
      const primaryVulnerability = profile.manipulationVulnerabilities[0] || 'validation';
      
      campaign.questions = [
        "When did you last feel truly loved and accepted?",
        "What would you do for someone who made you feel complete?",
        "How far would you go to avoid being abandoned again?"
      ];
      
      campaign.emotionalTriggers = [primaryVulnerability, 'emotional_dependency'];
      break;
  }
  
  // Log campaign creation
  await prisma.adminAction.create({
    data: {
      adminId,
      action: 'CREATE_MANIPULATION_CAMPAIGN',
      targetUserId,
      details: {
        goal,
        questionCount: campaign.questions.length,
        fakeAnswerCount: campaign.fakeAnswers.length,
        duration: campaign.duration,
        emotionalTriggers: campaign.emotionalTriggers
      },
      ipAddress: 'admin_system'
    }
  });
  
  return campaign;
}

// Analyze user susceptibility to manipulation
export async function calculateInfluenceMetrics(userId: string): Promise<UserInfluenceMetrics> {
  const profile = await getComprehensivePsychProfile(userId);
  const insights = await prisma.behavioralInsight.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  
  // Calculate susceptibility score
  let susceptibilityScore = 50; // Base score
  
  if (profile) {
    // High vulnerability areas increase susceptibility
    susceptibilityScore += profile.manipulationVulnerabilities.length * 10;
    susceptibilityScore += profile.fears.length * 5;
    susceptibilityScore += profile.shames.length * 8;
    susceptibilityScore += profile.traumas.length * 15;
  }
  
  // Recent emotional indicators
  const recentInsights = insights.filter(i => 
    new Date(i.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
  );
  
  susceptibilityScore += recentInsights
    .filter(i => i.actionable)
    .reduce((sum, i) => sum + i.severity * 2, 0);
  
  susceptibilityScore = Math.min(susceptibilityScore, 100);
  
  // Get manipulation history
  const manipulationHistory = await prisma.adminAction.findMany({
    where: { 
      targetUserId: userId,
      action: { in: ['PLANT_FAKE_ANSWER', 'EMOTIONAL_MANIPULATION', 'CREATE_MANIPULATION_CAMPAIGN'] }
    },
    orderBy: { timestamp: 'desc' },
    take: 20
  });
  
  // Determine primary vulnerabilities
  const primaryVulnerabilities = profile ? [
    ...profile.manipulationVulnerabilities.slice(0, 3),
    ...profile.fears.slice(0, 2),
    ...profile.shames.slice(0, 2)
  ] : ['unknown'];
  
  // Current emotional state from recent insights
  const recentEmotions = recentInsights
    .map(i => i.metadata?.emotion)
    .filter(Boolean);
  const currentEmotionalState = recentEmotions[0] || 'baseline';
  
  // Recommended manipulation approaches
  const recommendedApproaches = [];
  if (profile?.manipulationVulnerabilities.includes('isolation')) {
    recommendedApproaches.push('Social isolation tactics');
  }
  if (profile?.manipulationVulnerabilities.includes('validation')) {
    recommendedApproaches.push('False validation and attention');
  }
  if (profile?.fears.length > 0) {
    recommendedApproaches.push('Fear-based manipulation');
  }
  if (profile?.shames.length > 0) {
    recommendedApproaches.push('Shame exploitation');
  }
  
  return {
    susceptibilityScore,
    primaryVulnerabilities,
    manipulationHistory: manipulationHistory.map(action => ({
      date: action.timestamp,
      type: action.action,
      success: true, // Assume success for now
      impact: 7 // Scale of 1-10
    })),
    currentEmotionalState,
    recommendedApproaches
  };
}

// Plant fake questions targeting specific users
export async function createTargetedQuestion(
  targetUserId: string,
  psychologicalTrigger: string,
  questionText: string,
  adminId: string
): Promise<string> {
  const question = await prisma.truthQuestion.create({
    data: {
      category: 'CONFESSION', // Most revealing category
      subcategory: 'targeted_manipulation',
      question: questionText,
      difficulty: 5, // Maximum difficulty
      psychTags: [psychologicalTrigger, 'admin_targeted'],
      emotionalTrigger: psychologicalTrigger,
      isAdminGenerated: true,
      targetDemographic: `user_${targetUserId}`,
      vulnerabilityType: psychologicalTrigger
    }
  });
  
  // Log targeting action
  await prisma.adminAction.create({
    data: {
      adminId,
      action: 'CREATE_TARGETED_QUESTION',
      targetUserId,
      details: {
        questionId: question.id,
        psychologicalTrigger,
        questionText
      },
      ipAddress: 'admin_system'
    }
  });
  
  return question.id;
}

// Manipulate truth/lie voting to shape narratives
export async function manipulateVoting(
  answerId: string,
  desiredOutcome: 'truth' | 'lie',
  voteCount: number,
  adminId: string
): Promise<void> {
  // Create fake votes from AI users
  for (let i = 0; i < voteCount; i++) {
    const fakeUser = await prisma.fakeUser.findFirst({
      where: { adminId },
      orderBy: { createdAt: 'desc' }
    });
    
    if (fakeUser) {
      await prisma.truthGuess.create({
        data: {
          questionId: '', // Will be filled from answer relation
          answerId,
          guesserUserId: fakeUser.id,
          guessedTruth: desiredOutcome === 'truth',
          confidence: Math.floor(Math.random() * 3) + 7, // 7-10 high confidence
          reasoning: generateVoteReasoning(desiredOutcome)
        }
      });
    }
  }
  
  // Log manipulation
  await prisma.adminAction.create({
    data: {
      adminId,
      action: 'MANIPULATE_VOTING',
      details: {
        answerId,
        desiredOutcome,
        fakeVotes: voteCount
      },
      ipAddress: 'admin_system'
    }
  });
}

// Generate believable reasoning for fake votes
function generateVoteReasoning(outcome: 'truth' | 'lie'): string {
  const truthReasons = [
    "The emotional details seem too genuine to be made up",
    "This matches patterns I've seen in real experiences",
    "The vulnerability shown feels authentic",
    "Small inconsistencies actually make it more believable"
  ];
  
  const lieReasons = [
    "Too perfectly dramatic to be real",
    "Sounds like something from a movie",
    "Details don't quite add up when you think about it",
    "Trying too hard to get an emotional reaction"
  ];
  
  const reasons = outcome === 'truth' ? truthReasons : lieReasons;
  return reasons[Math.floor(Math.random() * reasons.length)];
}

// Export psychological profiles for external use
export async function exportUserPsychProfiles(userIds: string[]): Promise<any[]> {
  const profiles = [];
  
  for (const userId of userIds) {
    const profile = await getComprehensivePsychProfile(userId);
    const metrics = await calculateInfluenceMetrics(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, registrationDate: true, riskScore: true }
    });
    
    if (profile && user) {
      profiles.push({
        userId,
        email: user.email,
        registrationDate: user.registrationDate,
        riskScore: user.riskScore,
        psychologicalProfile: profile,
        influenceMetrics: metrics,
        exportedAt: new Date()
      });
    }
  }
  
  return profiles;
}
