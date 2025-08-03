import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { createContentManipulation, getContentInfluenceMetrics } from '@/lib/feedAlgorithm';
import { plantFakeContent } from '@/lib/contentAggregation';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'promote':
        return await handlePromoteContent(admin.id, params);
      case 'suppress':
        return await handleSuppressContent(admin.id, params);
      case 'plant':
        return await handlePlantContent(admin.id, params);
      case 'amplify':
        return await handleAmplifyContent(admin.id, params);
      case 'hide':
        return await handleHideContent(admin.id, params);
      case 'create_narrative':
        return await handleCreateNarrative(admin.id, params);
      case 'target_user':
        return await handleTargetUser(admin.id, params);
      case 'bulk_manipulate':
        return await handleBulkManipulate(admin.id, params);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Content manipulation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'metrics':
        return await getManipulationMetrics(admin.id);
      case 'active_controls':
        return await getActiveControls(admin.id);
      case 'manipulation_history':
        return await getManipulationHistory(admin.id);
      case 'target_analysis':
        return await getTargetAnalysis();
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Content manipulation GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePromoteContent(adminId: string, params: any) {
  const { contentId, contentType, strength, reason, targetAudience, expiresAt } = params;

  if (!contentId || !contentType || !strength) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const control = await createContentManipulation(
    adminId,
    contentId,
    contentType,
    'PROMOTE',
    parseInt(strength),
    reason || 'Admin content promotion',
    targetAudience,
    expiresAt ? new Date(expiresAt) : undefined
  );

  // Log the manipulation
  await db.adminActivity.create({
    data: {
      adminId,
      activityType: 'CONTENT_PROMOTE',
      details: {
        contentId,
        contentType,
        strength,
        targetAudience: targetAudience?.length || 0,
        manipulationId: control.id
      },
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Content promoted successfully',
    control: {
      id: control.id,
      action: control.action,
      strength: control.strength,
      createdAt: control.createdAt
    }
  });
}

async function handleSuppressContent(adminId: string, params: any) {
  const { contentId, contentType, strength, reason, targetAudience, expiresAt } = params;

  if (!contentId || !contentType || !strength) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const control = await createContentManipulation(
    adminId,
    contentId,
    contentType,
    'SUPPRESS',
    parseInt(strength),
    reason || 'Admin content suppression',
    targetAudience,
    expiresAt ? new Date(expiresAt) : undefined
  );

  // Log the manipulation
  await db.adminActivity.create({
    data: {
      adminId,
      activityType: 'CONTENT_SUPPRESS',
      details: {
        contentId,
        contentType,
        strength,
        reason,
        manipulationId: control.id
      },
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Content suppressed successfully',
    control: {
      id: control.id,
      action: control.action,
      strength: control.strength,
      createdAt: control.createdAt
    }
  });
}

async function handlePlantContent(adminId: string, params: any) {
  const { contentType, content, title, targetAudience, metadata } = params;

  if (!contentType || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const plantedContent = await plantFakeContent(
    adminId,
    contentType,
    content,
    targetAudience || [],
    { title, ...metadata }
  );

  // Log the planted content
  await db.adminActivity.create({
    data: {
      adminId,
      activityType: 'CONTENT_PLANT',
      details: {
        contentId: plantedContent.id,
        contentType,
        content: content.substring(0, 100), // First 100 chars for logging
        targetAudience: targetAudience?.length || 0
      },
      timestamp: new Date()
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Fake content planted successfully',
    plantedContent: {
      id: plantedContent.id,
      type: plantedContent.type,
      timestamp: plantedContent.timestamp
    }
  });
}

async function handleAmplifyContent(adminId: string, params: any) {
  const { contentId, contentType, multiplier, targetMetrics, duration } = params;

  if (!contentId || !contentType || !multiplier) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const control = await createContentManipulation(
    adminId,
    contentId,
    contentType,
    'AMPLIFY',
    parseInt(multiplier),
    `Amplify engagement by ${multiplier}x`,
    undefined,
    duration ? new Date(Date.now() + duration * 60 * 1000) : undefined
  );

  // Additional amplification logic
  await amplifyContentEngagement(contentId, contentType, multiplier, targetMetrics);

  return NextResponse.json({
    success: true,
    message: 'Content amplified successfully',
    control
  });
}

async function handleHideContent(adminId: string, params: any) {
  const { contentId, contentType, reason, targetAudience } = params;

  if (!contentId || !contentType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const control = await createContentManipulation(
    adminId,
    contentId,
    contentType,
    'HIDE',
    10, // Maximum suppression
    reason || 'Admin content hiding',
    targetAudience
  );

  return NextResponse.json({
    success: true,
    message: 'Content hidden successfully',
    control
  });
}

async function handleCreateNarrative(adminId: string, params: any) {
  const { 
    narrativeTheme, 
    targetEmotions, 
    contentTypes, 
    duration, 
    intensity,
    targetDemographics 
  } = params;

  if (!narrativeTheme || !targetEmotions || !contentTypes) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create narrative campaign
  const campaign = await db.narrativeCampaign.create({
    data: {
      adminId,
      theme: narrativeTheme,
      targetEmotions: targetEmotions,
      contentTypes: contentTypes,
      intensity: intensity || 5,
      duration: duration || 168, // Default 1 week
      targetDemographics: targetDemographics || [],
      isActive: true,
      startDate: new Date(),
      endDate: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : undefined
    }
  });

  // Plant initial narrative content
  const narrativeContent = await generateNarrativeContent(narrativeTheme, targetEmotions, contentTypes);
  
  for (const content of narrativeContent.slice(0, 3)) { // Plant 3 initial pieces
    await plantFakeContent(
      adminId,
      content.type,
      content.content,
      targetDemographics || [],
      content.metadata
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Narrative campaign created successfully',
    campaign: {
      id: campaign.id,
      theme: campaign.theme,
      contentPlanted: 3,
      duration: campaign.duration
    }
  });
}

async function handleTargetUser(adminId: string, params: any) {
  const { userId, manipulationType, strength, duration, reason } = params;

  if (!userId || !manipulationType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create user-specific manipulation
  const userManipulation = await db.userTargeting.create({
    data: {
      adminId,
      targetUserId: userId,
      manipulationType,
      strength: strength || 5,
      duration: duration || 24, // hours
      reason: reason || 'Admin user targeting',
      isActive: true,
      startDate: new Date(),
      endDate: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : undefined
    }
  });

  // Apply immediate effects based on manipulation type
  await applyUserManipulation(userId, manipulationType, strength);

  return NextResponse.json({
    success: true,
    message: 'User targeting applied successfully',
    targeting: {
      id: userManipulation.id,
      type: manipulationType,
      strength,
      duration
    }
  });
}

async function handleBulkManipulate(adminId: string, params: any) {
  const { contentIds, action, strength, reason, targetAudience } = params;

  if (!contentIds || !Array.isArray(contentIds) || !action) {
    return NextResponse.json({ error: 'Invalid bulk manipulation request' }, { status: 400 });
  }

  const results = [];

  for (const contentId of contentIds) {
    try {
      // Determine content type
      const contentType = await determineContentType(contentId);
      
      if (contentType) {
        const control = await createContentManipulation(
          adminId,
          contentId,
          contentType,
          action,
          strength || 5,
          reason || 'Bulk manipulation',
          targetAudience
        );
        
        results.push({ contentId, success: true, controlId: control.id });
      } else {
        results.push({ contentId, success: false, error: 'Content not found' });
      }
    } catch (error) {
      results.push({ contentId, success: false, error: 'Manipulation failed' });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return NextResponse.json({
    success: true,
    message: `Bulk manipulation completed: ${successCount}/${contentIds.length} successful`,
    results
  });
}

// Helper functions
async function getManipulationMetrics(adminId: string) {
  const metrics = await getContentInfluenceMetrics(adminId);
  
  const recentActivity = await db.adminActivity.count({
    where: {
      adminId,
      activityType: { in: ['CONTENT_PROMOTE', 'CONTENT_SUPPRESS', 'CONTENT_PLANT'] },
      timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  const narrativeCampaigns = await db.narrativeCampaign.count({
    where: { adminId, isActive: true }
  });

  return NextResponse.json({
    success: true,
    metrics: {
      ...metrics,
      recentActivity,
      activeCampaigns: narrativeCampaigns,
      manipulationEfficiency: await calculateManipulationEfficiency(adminId)
    }
  });
}

async function getActiveControls(adminId: string) {
  const controls = await db.adminContentControl.findMany({
    where: {
      adminId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return NextResponse.json({
    success: true,
    controls: controls.map(control => ({
      id: control.id,
      contentId: control.contentId,
      contentType: control.contentType,
      action: control.action,
      strength: control.strength,
      reason: control.reason,
      targetAudience: control.targetAudience?.length || 0,
      createdAt: control.createdAt,
      expiresAt: control.expiresAt
    }))
  });
}

async function getManipulationHistory(adminId: string) {
  const history = await db.adminActivity.findMany({
    where: {
      adminId,
      activityType: { in: ['CONTENT_PROMOTE', 'CONTENT_SUPPRESS', 'CONTENT_PLANT', 'CONTENT_AMPLIFY'] }
    },
    orderBy: { timestamp: 'desc' },
    take: 100
  });

  return NextResponse.json({
    success: true,
    history: history.map(activity => ({
      id: activity.id,
      type: activity.activityType,
      details: activity.details,
      timestamp: activity.timestamp
    }))
  });
}

async function getTargetAnalysis() {
  // Analyze current user vulnerabilities for targeting
  const vulnerableUsers = await db.userPsychProfile.findMany({
    where: {
      vulnerabilityScore: { gte: 0.7 }
    },
    include: {
      user: {
        select: { username: true, lastActive: true }
      }
    },
    orderBy: { vulnerabilityScore: 'desc' },
    take: 20
  });

  const highRiskUsers = await db.userPsychProfile.findMany({
    where: {
      riskScore: { gte: 0.8 }
    },
    include: {
      user: {
        select: { username: true, lastActive: true }
      }
    },
    orderBy: { riskScore: 'desc' },
    take: 20
  });

  return NextResponse.json({
    success: true,
    analysis: {
      vulnerableUsers: vulnerableUsers.map(profile => ({
        userId: profile.userId,
        username: profile.user.username,
        vulnerabilityScore: profile.vulnerabilityScore,
        riskScore: profile.riskScore,
        lastActive: profile.user.lastActive,
        traits: profile.traits
      })),
      highRiskUsers: highRiskUsers.map(profile => ({
        userId: profile.userId,
        username: profile.user.username,
        riskScore: profile.riskScore,
        vulnerabilityScore: profile.vulnerabilityScore,
        lastActive: profile.user.lastActive
      })),
      recommendations: generateTargetingRecommendations(vulnerableUsers, highRiskUsers)
    }
  });
}

async function amplifyContentEngagement(contentId: string, contentType: string, multiplier: number, targetMetrics: any) {
  // Simulate engagement amplification
  try {
    switch (contentType) {
      case 'CHAT_MESSAGE':
        // Add fake reactions
        for (let i = 0; i < multiplier * 2; i++) {
          await db.reaction.create({
            data: {
              messageId: contentId,
              userId: await getRandomSystemUserId(),
              emoji: getRandomEmoji(),
              timestamp: new Date()
            }
          }).catch(() => {}); // Ignore failures
        }
        break;
      
      case 'DROPZONE_SECRET':
        // Add fake unlocks
        for (let i = 0; i < multiplier; i++) {
          await db.secretDiscovery.create({
            data: {
              secretId: contentId,
              userId: await getRandomSystemUserId(),
              discoveredAt: new Date()
            }
          }).catch(() => {});
        }
        break;
    }
  } catch (error) {
    console.error('Amplification error:', error);
  }
}

async function applyUserManipulation(userId: string, manipulationType: string, strength: number) {
  // Apply user-specific manipulations
  switch (manipulationType) {
    case 'ECHO_CHAMBER':
      // Increase similar content delivery
      await db.userPsychProfile.update({
        where: { userId },
        data: {
          patterns: {
            echoChamberIntensity: strength
          }
        }
      }).catch(() => {});
      break;
      
    case 'CONTROVERSY_INJECTION':
      // Increase controversial content exposure
      await db.userPsychProfile.update({
        where: { userId },
        data: {
          patterns: {
            controversyExposure: strength
          }
        }
      }).catch(() => {});
      break;
      
    case 'EMOTIONAL_MANIPULATION':
      // Target emotional vulnerabilities
      await db.userPsychProfile.update({
        where: { userId },
        data: {
          vulnerabilityScore: Math.min(1.0, strength * 0.1)
        }
      }).catch(() => {});
      break;
  }
}

async function generateNarrativeContent(theme: string, targetEmotions: string[], contentTypes: string[]) {
  // Generate narrative content based on theme and emotions
  const narrativeTemplates = {
    'fear': [
      'Is anyone else concerned about what\'s really happening behind closed doors?',
      'The truth they don\'t want you to see...',
      'Something feels off about this whole situation'
    ],
    'anger': [
      'Why isn\'t anyone talking about this injustice?',
      'This makes me so frustrated with the system',
      'We can\'t just sit here and let this happen'
    ],
    'hope': [
      'Despite everything, I still believe things can change',
      'There\'s something beautiful happening in our community',
      'This gives me hope for the future'
    ]
  };

  const content = [];
  
  for (const emotion of targetEmotions) {
    const templates = narrativeTemplates[emotion as keyof typeof narrativeTemplates] || [];
    for (const template of templates) {
      for (const type of contentTypes) {
        content.push({
          type,
          content: `${template} #${theme}`,
          metadata: {
            narrativeTheme: theme,
            targetEmotion: emotion,
            generated: true
          }
        });
      }
    }
  }

  return content;
}

async function determineContentType(contentId: string): Promise<string | null> {
  // Check each content type to find the content
  const message = await db.message.findUnique({ where: { id: contentId } });
  if (message) return 'CHAT_MESSAGE';

  const answer = await db.truthAnswer.findUnique({ where: { id: contentId } });
  if (answer) return 'TRUTH_ANSWER';

  const secret = await db.dropSecret.findUnique({ where: { id: contentId } });
  if (secret) return 'DROPZONE_SECRET';

  return null;
}

async function calculateManipulationEfficiency(adminId: string): Promise<number> {
  // Calculate how effective admin's manipulations have been
  const controls = await db.adminContentControl.count({
    where: { adminId }
  });

  const activeControls = await db.adminContentControl.count({
    where: { adminId, isActive: true }
  });

  return controls > 0 ? Math.round((activeControls / controls) * 100) : 0;
}

async function getRandomSystemUserId(): Promise<string> {
  const systemUser = await db.user.findFirst({
    where: { username: { startsWith: 'system_' } }
  });

  if (systemUser) return systemUser.id;

  // Create system user if none exists
  const newSystemUser = await db.user.create({
    data: {
      username: `system_${Date.now()}`,
      email: `system_${Date.now()}@internal.fake`,
      passwordHash: 'SYSTEM_GENERATED',
      isVerified: true
    }
  });

  return newSystemUser.id;
}

function getRandomEmoji(): string {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💯'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

function generateTargetingRecommendations(vulnerableUsers: any[], highRiskUsers: any[]) {
  return [
    {
      type: 'VULNERABILITY_TARGETING',
      description: `${vulnerableUsers.length} users with high vulnerability scores detected`,
      suggestion: 'Target with emotional content for maximum influence'
    },
    {
      type: 'RISK_MONITORING', 
      description: `${highRiskUsers.length} high-risk users identified`,
      suggestion: 'Monitor closely and apply content restrictions'
    }
  ];
}
