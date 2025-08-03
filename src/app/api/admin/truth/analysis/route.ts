// Admin Truth Analysis API - Complete psychological profiling and surveillance
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminToken } from '@/lib/adminAuth';
import { getComprehensivePsychProfile, calculateRiskScore } from '@/lib/psychoAnalysis';
import { calculateInfluenceMetrics, exportUserPsychProfiles } from '@/lib/truthManipulation';

const prisma = new PrismaClient();

// GET - Get comprehensive user psychological analysis
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const admin = await verifyAdminToken(token);
    if (!admin || !['SUPER_ADMIN', 'SURVEILLANCE'].includes(admin.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const export_all = url.searchParams.get('export') === 'true';
    const risk_threshold = parseInt(url.searchParams.get('riskThreshold') || '50');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Log admin surveillance action
    await prisma.adminAction.create({
      data: {
        adminId: admin.id,
        action: 'PSYCHOLOGICAL_ANALYSIS_ACCESS',
        targetUserId: userId || undefined,
        details: {
          analysisType: export_all ? 'BULK_EXPORT' : userId ? 'INDIVIDUAL_ANALYSIS' : 'DASHBOARD_VIEW',
          riskThreshold: export_all ? risk_threshold : undefined
        },
        ipAddress: request.ip || 'unknown'
      }
    });

    if (userId) {
      // Get detailed analysis for specific user
      const userAnalysis = await getDetailedUserAnalysis(userId, admin.id);
      return NextResponse.json(userAnalysis);
    }

    if (export_all) {
      // Export all user profiles above risk threshold
      const highRiskUsers = await prisma.user.findMany({
        where: {
          riskScore: { gte: risk_threshold }
        },
        select: { id: true },
        take: 1000 // Limit for performance
      });

      const exportData = await exportUserPsychProfiles(
        highRiskUsers.map(u => u.id)
      );

      return NextResponse.json({
        exportData,
        totalUsers: exportData.length,
        riskThreshold: risk_threshold,
        exportedAt: new Date()
      });
    }

    // Get dashboard overview
    const dashboardData = await getTruthAnalysisDashboard(limit);
    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Admin truth analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create targeted psychological analysis
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
    const { userIds, analysisType, targetedInsights } = body;

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'User IDs array required' }, { status: 400 });
    }

    // Perform targeted analysis on multiple users
    const analysisResults = [];
    
    for (const userId of userIds) {
      const userAnalysis = await performTargetedAnalysis(
        userId,
        analysisType,
        targetedInsights,
        admin.id
      );
      analysisResults.push(userAnalysis);
    }

    // Log bulk analysis action
    await prisma.adminAction.create({
      data: {
        adminId: admin.id,
        action: 'BULK_PSYCHOLOGICAL_ANALYSIS',
        details: {
          userCount: userIds.length,
          analysisType,
          targetedInsights,
          timestamp: new Date()
        },
        ipAddress: request.ip || 'unknown'
      }
    });

    return NextResponse.json({
      results: analysisResults,
      summary: {
        totalUsers: userIds.length,
        analysisType,
        completedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Targeted analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get detailed psychological analysis for a specific user
async function getDetailedUserAnalysis(userId: string, adminId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      truthAnswers: {
        include: {
          question: {
            select: {
              category: true,
              question: true,
              difficulty: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      },
      masks: {
        orderBy: { createdAt: 'desc' }
      },
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get comprehensive psychological profile
  const psychProfile = await getComprehensivePsychProfile(userId);
  
  // Get influence metrics
  const influenceMetrics = await calculateInfluenceMetrics(userId);
  
  // Get behavioral insights
  const insights = await prisma.behavioralInsight.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Get truth game sessions
  const truthSessions = await prisma.truthSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate vulnerability timeline
  const vulnerabilityTimeline = calculateVulnerabilityTimeline(user.truthAnswers);
  
  // Risk assessment
  const currentRiskScore = await calculateRiskScore(userId);
  
  // Manipulation recommendations
  const manipulationRecommendations = generateManipulationRecommendations(
    psychProfile,
    influenceMetrics,
    insights
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin,
      riskScore: currentRiskScore,
      isActive: user.isActive
    },
    psychologicalProfile: psychProfile,
    influenceMetrics,
    truthGameActivity: {
      totalAnswers: user.truthAnswers.length,
      totalSessions: truthSessions.length,
      averageVulnerability: user.truthAnswers.reduce((sum, a) => 
        sum + a.vulnerabilityScore, 0) / Math.max(user.truthAnswers.length, 1),
      mostVulnerableCategory: getMostVulnerableCategory(user.truthAnswers),
      recentActivity: user.truthAnswers.slice(0, 10).map(answer => ({
        questionCategory: answer.question.category,
        answerPreview: answer.answer.substring(0, 100) + '...',
        vulnerabilityScore: answer.vulnerabilityScore,
        emotionalIntensity: answer.emotionalIntensity,
        isLie: answer.isLie,
        createdAt: answer.createdAt
      }))
    },
    behavioralInsights: insights.map(insight => ({
      type: insight.insightType,
      description: insight.description,
      confidence: insight.confidence,
      severity: insight.severity,
      actionable: insight.actionable,
      createdAt: insight.createdAt
    })),
    vulnerabilityTimeline,
    manipulationRecommendations,
    surveillanceData: {
      analysisCount: await prisma.adminAction.count({
        where: {
          targetUserId: userId,
          action: { in: ['PSYCHOLOGICAL_ANALYSIS_ACCESS', 'VIEW_USER_PROFILE'] }
        }
      }),
      lastAnalyzed: new Date(),
      analyzedBy: adminId
    }
  };
}

// Get truth analysis dashboard overview
async function getTruthAnalysisDashboard(limit: number) {
  // High-risk users
  const highRiskUsers = await prisma.user.findMany({
    where: {
      riskScore: { gte: 70 }
    },
    include: {
      psychProfile: true,
      _count: {
        select: {
          truthAnswers: true,
          behavioralInsights: true
        }
      }
    },
    orderBy: { riskScore: 'desc' },
    take: limit
  });

  // Recent concerning answers
  const concerningAnswers = await prisma.truthAnswer.findMany({
    where: {
      vulnerabilityScore: { gte: 80 }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          riskScore: true
        }
      },
      question: {
        select: {
          category: true,
          question: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  // Psychological profile statistics
  const profileStats = await prisma.psychologicalProfile.findMany({
    select: {
      fearProfile: true,
      shameProfile: true,
      traumaIndicators: true,
      manipulationVulnerability: true
    }
  });

  // Recent truth game activity
  const recentActivity = await prisma.truthAnswer.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          riskScore: true
        }
      },
      question: {
        select: {
          category: true,
          difficulty: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // Category vulnerability distribution
  const categoryStats = await prisma.truthAnswer.groupBy({
    by: ['question'],
    _avg: { vulnerabilityScore: true },
    _count: { id: true },
    orderBy: { _avg: { vulnerabilityScore: 'desc' } }
  });

  return {
    summary: {
      totalUsers: await prisma.user.count(),
      highRiskUsers: highRiskUsers.length,
      totalTruthAnswers: await prisma.truthAnswer.count(),
      totalPsychProfiles: await prisma.psychologicalProfile.count(),
      averageRiskScore: await getAverageRiskScore(),
      lastUpdated: new Date()
    },
    highRiskUsers: highRiskUsers.map(user => ({
      id: user.id,
      email: user.email,
      riskScore: user.riskScore,
      truthAnswerCount: user._count.truthAnswers,
      insightCount: user._count.behavioralInsights,
      primaryVulnerabilities: user.psychProfile ? 
        (Array.isArray(user.psychProfile.manipulationVulnerability) ? 
          user.psychProfile.manipulationVulnerability.slice(0, 3) : []) : [],
      lastActivity: user.lastLogin
    })),
    concerningAnswers: concerningAnswers.map(answer => ({
      id: answer.id,
      userId: answer.user.id,
      userEmail: answer.user.email,
      questionCategory: answer.question.category,
      questionPreview: answer.question.question.substring(0, 100) + '...',
      answerPreview: answer.answer.substring(0, 150) + '...',
      vulnerabilityScore: answer.vulnerabilityScore,
      emotionalIntensity: answer.emotionalIntensity,
      userRiskScore: answer.user.riskScore,
      createdAt: answer.createdAt
    })),
    recentActivity: recentActivity.slice(0, 20).map(answer => ({
      userId: answer.user.id,
      userEmail: answer.user.email,
      category: answer.question.category,
      difficulty: answer.question.difficulty,
      vulnerabilityScore: answer.vulnerabilityScore,
      isLie: answer.isLie,
      createdAt: answer.createdAt
    })),
    statistics: {
      vulnerabilityDistribution: calculateVulnerabilityDistribution(profileStats),
      categoryRisk: await getCategoryRiskAnalysis(),
      dailyActivity: await getDailyActivityStats(),
      manipulationOpportunities: await getManipulationOpportunities()
    }
  };
}

// Helper functions
async function getAverageRiskScore(): Promise<number> {
  const result = await prisma.user.aggregate({
    _avg: { riskScore: true }
  });
  return Math.round(result._avg.riskScore || 0);
}

function getMostVulnerableCategory(answers: any[]): string {
  const categoryScores: Record<string, number[]> = {};
  
  answers.forEach(answer => {
    const category = answer.question.category;
    if (!categoryScores[category]) {
      categoryScores[category] = [];
    }
    categoryScores[category].push(answer.vulnerabilityScore);
  });

  let maxAverage = 0;
  let mostVulnerable = 'UNKNOWN';
  
  Object.entries(categoryScores).forEach(([category, scores]) => {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    if (average > maxAverage) {
      maxAverage = average;
      mostVulnerable = category;
    }
  });

  return mostVulnerable;
}

function calculateVulnerabilityTimeline(answers: any[]) {
  return answers
    .slice(0, 20)
    .map(answer => ({
      date: answer.createdAt,
      vulnerability: answer.vulnerabilityScore,
      category: answer.question.category,
      emotionalIntensity: answer.emotionalIntensity
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function generateManipulationRecommendations(
  psychProfile: any,
  influenceMetrics: any,
  insights: any[]
) {
  const recommendations = [];

  if (psychProfile?.manipulationVulnerabilities?.includes('isolation')) {
    recommendations.push({
      type: 'Social Isolation',
      description: 'User is vulnerable to isolation tactics. Create scenarios that make them feel misunderstood.',
      priority: 'HIGH',
      techniques: ['False consensus bias', 'Exclusion from groups', 'Questioning their social connections']
    });
  }

  if (psychProfile?.fears?.length > 0) {
    recommendations.push({
      type: 'Fear Exploitation',
      description: `Target user's primary fears: ${psychProfile.fears.slice(0, 3).join(', ')}`,
      priority: 'MEDIUM',
      techniques: ['Amplify existing fears', 'Create fear-based scenarios', 'Use fear as motivation']
    });
  }

  if (influenceMetrics?.susceptibilityScore > 70) {
    recommendations.push({
      type: 'High Susceptibility',
      description: 'User shows high susceptibility to manipulation. Use gradual influence techniques.',
      priority: 'HIGH',
      techniques: ['Gradual commitment escalation', 'Authority positioning', 'Social proof manipulation']
    });
  }

  return recommendations;
}

async function performTargetedAnalysis(
  userId: string,
  analysisType: string,
  targetedInsights: string[],
  adminId: string
) {
  // This would perform specific psychological analysis based on admin requirements
  const basicAnalysis = await getDetailedUserAnalysis(userId, adminId);
  
  return {
    userId,
    analysisType,
    targetedInsights,
    results: basicAnalysis,
    analysisTimestamp: new Date()
  };
}

function calculateVulnerabilityDistribution(profiles: any[]) {
  const distribution = {
    fear: 0,
    shame: 0,
    trauma: 0,
    manipulation: 0
  };

  profiles.forEach(profile => {
    if (Array.isArray(profile.fearProfile)) distribution.fear += profile.fearProfile.length;
    if (Array.isArray(profile.shameProfile)) distribution.shame += profile.shameProfile.length;
    if (Array.isArray(profile.traumaIndicators)) distribution.trauma += profile.traumaIndicators.length;
    if (Array.isArray(profile.manipulationVulnerability)) distribution.manipulation += profile.manipulationVulnerability.length;
  });

  return distribution;
}

async function getCategoryRiskAnalysis() {
  const categories = ['FEAR', 'CONFESSION', 'SHAME', 'MEMORY', 'FUTURE', 'DESIRE', 'REGRET'];
  const analysis: Record<string, any> = {};

  for (const category of categories) {
    const answers = await prisma.truthAnswer.findMany({
      where: {
        question: { category: category as any }
      },
      select: {
        vulnerabilityScore: true,
        emotionalIntensity: true
      }
    });

    if (answers.length > 0) {
      analysis[category] = {
        totalAnswers: answers.length,
        averageVulnerability: Math.round(
          answers.reduce((sum, a) => sum + a.vulnerabilityScore, 0) / answers.length
        ),
        averageEmotionalIntensity: Math.round(
          answers.reduce((sum, a) => sum + a.emotionalIntensity, 0) / answers.length
        )
      };
    }
  }

  return analysis;
}

async function getDailyActivityStats() {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  });

  const stats = [];
  for (const date of last7Days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = await prisma.truthAnswer.count({
      where: {
        createdAt: {
          gte: new Date(date),
          lt: nextDate
        }
      }
    });

    stats.push({ date, answerCount: count });
  }

  return stats.reverse();
}

async function getManipulationOpportunities() {
  const opportunities = await prisma.behavioralInsight.findMany({
    where: {
      actionable: true,
      severity: { gte: 3 }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          riskScore: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return opportunities.map(opp => ({
    userId: opp.user.id,
    userEmail: opp.user.email,
    userRiskScore: opp.user.riskScore,
    opportunityType: opp.insightType,
    description: opp.description,
    confidence: opp.confidence,
    severity: opp.severity,
    createdAt: opp.createdAt
  }));
}
