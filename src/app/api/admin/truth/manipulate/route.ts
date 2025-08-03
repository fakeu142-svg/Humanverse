// Admin Truth Manipulation API - Plant fake answers and control narratives
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminToken } from '@/lib/adminAuth';
import { 
  createFakeAnswer, 
  generateManipulationCampaign, 
  createTargetedQuestion,
  manipulateVoting,
  FakeAnswerConfig,
  ManipulationCampaign
} from '@/lib/truthManipulation';

const prisma = new PrismaClient();

// POST - Create manipulation content (fake answers, questions, campaigns)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const admin = await verifyAdminToken(token);
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...actionData } = body;

    let result;

    switch (action) {
      case 'CREATE_FAKE_ANSWER':
        result = await handleCreateFakeAnswer(actionData, admin.id, request.ip);
        break;
      
      case 'CREATE_MANIPULATION_CAMPAIGN':
        result = await handleCreateManipulationCampaign(actionData, admin.id, request.ip);
        break;
      
      case 'CREATE_TARGETED_QUESTION':
        result = await handleCreateTargetedQuestion(actionData, admin.id, request.ip);
        break;
      
      case 'MANIPULATE_VOTING':
        result = await handleManipulateVoting(actionData, admin.id, request.ip);
        break;
      
      case 'BULK_FAKE_ANSWERS':
        result = await handleBulkFakeAnswers(actionData, admin.id, request.ip);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Admin manipulation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get manipulation campaigns and fake content
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const admin = await verifyAdminToken(token);
    if (!admin || !['SUPER_ADMIN', 'MODERATOR'].includes(admin.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const targetUserId = url.searchParams.get('targetUserId');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (type === 'fake_answers') {
      const fakeAnswers = await getFakeAnswers(targetUserId, limit);
      return NextResponse.json({ fakeAnswers });
    }

    if (type === 'campaigns') {
      const campaigns = await getManipulationCampaigns(targetUserId, limit);
      return NextResponse.json({ campaigns });
    }

    if (type === 'fake_users') {
      const fakeUsers = await getFakeUsers(admin.id, limit);
      return NextResponse.json({ fakeUsers });
    }

    if (type === 'manipulation_stats') {
      const stats = await getManipulationStats();
      return NextResponse.json({ stats });
    }

    // Default: Get manipulation dashboard
    const dashboard = await getManipulationDashboard(limit);
    return NextResponse.json(dashboard);

  } catch (error) {
    console.error('Get manipulation data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove fake content or stop campaigns
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const admin = await verifyAdminToken(token);
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id } = body;

    if (type === 'fake_answer') {
      await prisma.truthAnswer.delete({
        where: { 
          id,
          isManipulated: true // Only allow deleting fake answers
        }
      });
    } else if (type === 'fake_user') {
      await prisma.fakeUser.delete({
        where: { id }
      });
    }

    // Log deletion
    await prisma.adminAction.create({
      data: {
        adminId: admin.id,
        action: 'DELETE_MANIPULATION_CONTENT',
        details: { type, deletedId: id },
        ipAddress: request.ip || 'unknown'
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete manipulation content error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle creating fake answers
async function handleCreateFakeAnswer(
  data: FakeAnswerConfig & { maskName?: string },
  adminId: string,
  ipAddress?: string
) {
  const { questionId, targetUserId, narrativeGoal, believabilityTarget, emotionalHook, content, maskName } = data;

  if (!questionId || !content || !narrativeGoal) {
    throw new Error('Missing required fields: questionId, content, narrativeGoal');
  }

  // Create or get fake user
  let fakeUser = await prisma.fakeUser.findFirst({
    where: { adminId },
    orderBy: { createdAt: 'desc' }
  });

  if (!fakeUser) {
    fakeUser = await prisma.fakeUser.create({
      data: {
        generatedEmail: `manipulation_${Date.now()}@fake.com`,
        maskName: maskName || `AshFox_${Math.floor(Math.random() * 9999)}`,
        backstory: 'AI-generated user for truth manipulation campaigns',
        adminId,
        roomsJoined: ['truth_game']
      }
    });
  }

  const config: FakeAnswerConfig = {
    questionId,
    targetUserId,
    narrativeGoal,
    believabilityTarget: believabilityTarget || 8,
    emotionalHook: emotionalHook || 'general',
    content
  };

  const fakeAnswerId = await createFakeAnswer(config, adminId, fakeUser.id);

  // Log manipulation action
  await prisma.adminAction.create({
    data: {
      adminId,
      action: 'CREATE_FAKE_ANSWER',
      targetUserId,
      details: {
        fakeAnswerId,
        questionId,
        narrativeGoal,
        emotionalHook,
        fakeUserId: fakeUser.id
      },
      ipAddress: ipAddress || 'unknown'
    }
  });

  return {
    success: true,
    fakeAnswerId,
    fakeUser: {
      id: fakeUser.id,
      maskName: fakeUser.maskName
    },
    config
  };
}

// Handle creating manipulation campaigns
async function handleCreateManipulationCampaign(
  data: { 
    targetUserId: string;
    goal: 'isolate' | 'recruit' | 'destabilize' | 'extract_secrets' | 'emotional_manipulation';
    duration?: number;
    customQuestions?: string[];
  },
  adminId: string,
  ipAddress?: string
) {
  const { targetUserId, goal, duration, customQuestions } = data;

  if (!targetUserId || !goal) {
    throw new Error('Missing required fields: targetUserId, goal');
  }

  const campaign = await generateManipulationCampaign(targetUserId, goal, adminId);

  // Add custom questions if provided
  if (customQuestions && customQuestions.length > 0) {
    campaign.questions.push(...customQuestions);
  }

  // Override duration if provided
  if (duration) {
    campaign.duration = duration;
  }

  // Store campaign details in admin actions
  await prisma.adminAction.create({
    data: {
      adminId,
      action: 'CREATE_MANIPULATION_CAMPAIGN',
      targetUserId,
      details: {
        goal,
        duration: campaign.duration,
        questionCount: campaign.questions.length,
        fakeAnswerCount: campaign.fakeAnswers.length,
        emotionalTriggers: campaign.emotionalTriggers,
        campaignData: campaign
      },
      ipAddress: ipAddress || 'unknown'
    }
  });

  return {
    success: true,
    campaign,
    message: `Manipulation campaign '${goal}' created for user ${targetUserId}`
  };
}

// Handle creating targeted questions
async function handleCreateTargetedQuestion(
  data: {
    targetUserId: string;
    psychologicalTrigger: string;
    questionText: string;
    category?: string;
    difficulty?: number;
  },
  adminId: string,
  ipAddress?: string
) {
  const { targetUserId, psychologicalTrigger, questionText, category, difficulty } = data;

  if (!targetUserId || !psychologicalTrigger || !questionText) {
    throw new Error('Missing required fields: targetUserId, psychologicalTrigger, questionText');
  }

  const questionId = await createTargetedQuestion(
    targetUserId,
    psychologicalTrigger,
    questionText,
    adminId
  );

  // If category/difficulty specified, update the question
  if (category || difficulty) {
    await prisma.truthQuestion.update({
      where: { id: questionId },
      data: {
        ...(category && { category: category as any }),
        ...(difficulty && { difficulty: Math.max(1, Math.min(difficulty, 5)) })
      }
    });
  }

  return {
    success: true,
    questionId,
    targetUserId,
    psychologicalTrigger,
    questionText
  };
}

// Handle vote manipulation
async function handleManipulateVoting(
  data: {
    answerId: string;
    desiredOutcome: 'truth' | 'lie';
    voteCount: number;
    reasoning?: string;
  },
  adminId: string,
  ipAddress?: string
) {
  const { answerId, desiredOutcome, voteCount, reasoning } = data;

  if (!answerId || !desiredOutcome || !voteCount) {
    throw new Error('Missing required fields: answerId, desiredOutcome, voteCount');
  }

  await manipulateVoting(answerId, desiredOutcome, voteCount, adminId);

  return {
    success: true,
    answerId,
    desiredOutcome,
    voteCount,
    message: `Added ${voteCount} fake votes for '${desiredOutcome}' outcome`
  };
}

// Handle bulk fake answer creation
async function handleBulkFakeAnswers(
  data: {
    answers: Array<{
      questionId: string;
      content: string;
      narrativeGoal: string;
      emotionalHook?: string;
      believabilityTarget?: number;
    }>;
    targetUserId?: string;
  },
  adminId: string,
  ipAddress?: string
) {
  const { answers, targetUserId } = data;

  if (!answers || !Array.isArray(answers)) {
    throw new Error('Answers array required');
  }

  const results = [];
  
  for (const answerData of answers) {
    try {
      const result = await handleCreateFakeAnswer(
        { ...answerData, targetUserId },
        adminId,
        ipAddress
      );
      results.push(result);
    } catch (error) {
      results.push({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        questionId: answerData.questionId 
      });
    }
  }

  return {
    success: true,
    results,
    total: answers.length,
    successful: results.filter(r => !r.error).length
  };
}

// Get fake answers with filtering
async function getFakeAnswers(targetUserId?: string, limit: number = 50) {
  return await prisma.truthAnswer.findMany({
    where: {
      isManipulated: true,
      ...(targetUserId && { 
        psychAnalysis: { 
          path: ['targetUser'], 
          equals: targetUserId 
        }
      })
    },
    include: {
      question: {
        select: {
          id: true,
          category: true,
          question: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

// Get manipulation campaigns
async function getManipulationCampaigns(targetUserId?: string, limit: number = 50) {
  return await prisma.adminAction.findMany({
    where: {
      action: 'CREATE_MANIPULATION_CAMPAIGN',
      ...(targetUserId && { targetUserId })
    },
    orderBy: { timestamp: 'desc' },
    take: limit
  });
}

// Get fake users created by admin
async function getFakeUsers(adminId: string, limit: number = 50) {
  return await prisma.fakeUser.findMany({
    where: { adminId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

// Get manipulation statistics
async function getManipulationStats() {
  const stats = {
    totalFakeAnswers: await prisma.truthAnswer.count({
      where: { isManipulated: true }
    }),
    totalFakeUsers: await prisma.fakeUser.count(),
    totalCampaigns: await prisma.adminAction.count({
      where: { action: 'CREATE_MANIPULATION_CAMPAIGN' }
    }),
    totalManipulatedVotes: await prisma.adminAction.count({
      where: { action: 'MANIPULATE_VOTING' }
    }),
    recentActivity: await prisma.adminAction.count({
      where: {
        action: { in: ['CREATE_FAKE_ANSWER', 'MANIPULATE_VOTING', 'CREATE_MANIPULATION_CAMPAIGN'] },
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })
  };

  // Get manipulation success metrics
  const fakeAnswersWithGuesses = await prisma.truthAnswer.findMany({
    where: { 
      isManipulated: true,
      guesses: { some: {} }
    },
    include: {
      guesses: {
        select: {
          guessedTruth: true,
          isCorrect: true
        }
      }
    }
  });

  const manipulationEffectiveness = fakeAnswersWithGuesses.length > 0 ? 
    fakeAnswersWithGuesses.reduce((acc, answer) => {
      const totalGuesses = answer.guesses.length;
      const incorrectGuesses = answer.guesses.filter(g => !g.isCorrect).length;
      return acc + (incorrectGuesses / totalGuesses);
    }, 0) / fakeAnswersWithGuesses.length * 100 : 0;

  return {
    ...stats,
    manipulationEffectiveness: Math.round(manipulationEffectiveness),
    lastUpdated: new Date()
  };
}

// Get manipulation dashboard overview
async function getManipulationDashboard(limit: number = 20) {
  const recentFakeAnswers = await getFakeAnswers(undefined, limit);
  const recentCampaigns = await getManipulationCampaigns(undefined, limit);
  const stats = await getManipulationStats();

  // Get most targeted users
  const targetedUsers = await prisma.adminAction.groupBy({
    by: ['targetUserId'],
    where: {
      action: { in: ['CREATE_MANIPULATION_CAMPAIGN', 'CREATE_FAKE_ANSWER', 'CREATE_TARGETED_QUESTION'] },
      targetUserId: { not: null }
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  });

  // Get user details for targeted users
  const targetedUserDetails = await Promise.all(
    targetedUsers.map(async (target) => {
      if (!target.targetUserId) return null;
      
      const user = await prisma.user.findUnique({
        where: { id: target.targetUserId },
        select: {
          id: true,
          email: true,
          riskScore: true,
          lastLogin: true
        }
      });
      
      return user ? {
        ...user,
        manipulationCount: target._count.id
      } : null;
    })
  );

  return {
    stats,
    recentFakeAnswers: recentFakeAnswers.slice(0, 10).map(answer => ({
      id: answer.id,
      questionCategory: answer.question.category,
      answerPreview: answer.answer.substring(0, 100) + '...',
      narrativeGoal: answer.psychAnalysis ? 
        (answer.psychAnalysis as any).narrativeGoal : 'Unknown',
      believabilityScore: answer.believabilityScore,
      guessCount: 0, // Would need to count guesses
      createdAt: answer.createdAt
    })),
    recentCampaigns: recentCampaigns.slice(0, 10).map(campaign => ({
      id: campaign.id,
      targetUserId: campaign.targetUserId,
      goal: campaign.details ? (campaign.details as any).goal : 'Unknown',
      questionCount: campaign.details ? (campaign.details as any).questionCount : 0,
      timestamp: campaign.timestamp
    })),
    mostTargetedUsers: targetedUserDetails.filter(Boolean),
    manipulationTrends: await getManipulationTrends()
  };
}

// Get manipulation trends over time
async function getManipulationTrends() {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  });

  const trends = [];
  for (const date of last7Days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const fakeAnswers = await prisma.truthAnswer.count({
      where: {
        isManipulated: true,
        createdAt: {
          gte: new Date(date),
          lt: nextDate
        }
      }
    });

    const campaigns = await prisma.adminAction.count({
      where: {
        action: 'CREATE_MANIPULATION_CAMPAIGN',
        timestamp: {
          gte: new Date(date),
          lt: nextDate
        }
      }
    });

    trends.push({ 
      date, 
      fakeAnswers, 
      campaigns,
      total: fakeAnswers + campaigns
    });
  }

  return trends.reverse();
}
