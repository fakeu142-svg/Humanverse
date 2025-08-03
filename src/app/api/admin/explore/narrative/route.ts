import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
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
      case 'create_campaign':
        return await handleCreateCampaign(admin.id, params);
      case 'shape_discussion':
        return await handleShapeDiscussion(admin.id, params);
      case 'seed_viral_content':
        return await handleSeedViralContent(admin.id, params);
      case 'create_controversy':
        return await handleCreateControversy(admin.id, params);
      case 'manipulate_sentiment':
        return await handleManipulateSentiment(admin.id, params);
      case 'echo_chamber':
        return await handleCreateEchoChamber(admin.id, params);
      case 'narrative_pivot':
        return await handleNarrativePivot(admin.id, params);
      case 'influence_trending':
        return await handleInfluenceTrending(admin.id, params);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Narrative control error:', error);
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
      case 'campaigns':
        return await getActiveCampaigns(admin.id);
      case 'narrative_analysis':
        return await getNarrativeAnalysis();
      case 'sentiment_metrics':
        return await getSentimentMetrics();
      case 'influence_report':
        return await getInfluenceReport(admin.id);
      case 'trending_control':
        return await getTrendingControl();
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Narrative control GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleCreateCampaign(adminId: string, params: any) {
  const {
    name,
    description,
    narrativeGoals,
    targetDemographics,
    contentStrategy,
    duration,
    intensity,
    channels
  } = params;

  if (!name || !narrativeGoals || !targetDemographics) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const campaign = await db.narrativeCampaign.create({
    data: {
      adminId,
      name,
      description,
      theme: narrativeGoals.join(', '),
      targetEmotions: contentStrategy?.emotions || [],
      contentTypes: channels || ['CHAT_MESSAGE', 'TRUTH_ANSWER'],
      intensity: intensity || 5,
      duration: duration || 168, // Default 1 week
      targetDemographics,
      isActive: true,
      startDate: new Date(),
      endDate: duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : undefined,
      metadata: {
        contentStrategy,
        narrativeGoals,
        channels
      }
    }
  });

  // Initialize campaign with seed content
  await seedCampaignContent(campaign.id, adminId, contentStrategy, targetDemographics);

  // Set up automated narrative shaping
  await setupAutomatedNarrativeShaping(campaign.id, narrativeGoals, intensity);

  return NextResponse.json({
    success: true,
    message: 'Narrative campaign created successfully',
    campaign: {
      id: campaign.id,
      name: campaign.name,
      theme: campaign.theme,
      intensity: campaign.intensity,
      duration: campaign.duration,
      targetAudience: targetDemographics.length
    }
  });
}

async function handleShapeDiscussion(adminId: string, params: any) {
  const {
    targetTopic,
    desiredDirection,
    manipulationTactics,
    targetUsers,
    timeline
  } = params;

  if (!targetTopic || !desiredDirection) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create discussion shaping operation
  const operation = await db.narrativeOperation.create({
    data: {
      adminId,
      operationType: 'SHAPE_DISCUSSION',
      targetTopic,
      desiredOutcome: desiredDirection,
      tactics: manipulationTactics || [],
      targetUsers: targetUsers || [],
      timeline: timeline || 24, // hours
      isActive: true,
      startTime: new Date(),
      endTime: timeline ? new Date(Date.now() + timeline * 60 * 60 * 1000) : undefined
    }
  });

  // Deploy discussion shaping tactics
  for (const tactic of manipulationTactics || []) {
    await deployTactic(operation.id, tactic, targetTopic, desiredDirection, targetUsers);
  }

  return NextResponse.json({
    success: true,
    message: 'Discussion shaping initiated',
    operation: {
      id: operation.id,
      topic: targetTopic,
      direction: desiredDirection,
      tactics: manipulationTactics?.length || 0
    }
  });
}

async function handleSeedViralContent(adminId: string, params: any) {
  const {
    contentType,
    viralElements,
    targetEmotion,
    spreadStrategy,
    targetReach
  } = params;

  if (!contentType || !viralElements || !targetEmotion) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Generate viral content
  const viralContent = await generateViralContent(
    contentType,
    viralElements,
    targetEmotion,
    spreadStrategy
  );

  // Plant initial content
  const seedContent = [];
  for (const content of viralContent.slice(0, 3)) {
    const planted = await plantViralSeed(adminId, content);
    if (planted) {
      seedContent.push(planted);
    }
  }

  // Set up viral amplification
  await setupViralAmplification(seedContent, spreadStrategy, targetReach);

  return NextResponse.json({
    success: true,
    message: 'Viral content seeding initiated',
    seededContent: seedContent.length,
    expectedReach: targetReach || 'Unknown'
  });
}

async function handleCreateControversy(adminId: string, params: any) {
  const {
    controversyType,
    targetTopic,
    polarizationLevel,
    targetGroups,
    escalationPlan
  } = params;

  if (!controversyType || !targetTopic || !polarizationLevel) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create controversy operation
  const controversy = await db.controversyOperation.create({
    data: {
      adminId,
      type: controversyType,
      topic: targetTopic,
      polarizationLevel,
      targetGroups: targetGroups || [],
      escalationPlan: escalationPlan || {},
      isActive: true,
      startTime: new Date()
    }
  });

  // Deploy polarizing content
  await deployPolarizingContent(controversy.id, controversyType, targetTopic, polarizationLevel);

  // Set up automated escalation
  if (escalationPlan) {
    await setupControversyEscalation(controversy.id, escalationPlan);
  }

  return NextResponse.json({
    success: true,
    message: 'Controversy creation initiated',
    controversy: {
      id: controversy.id,
      type: controversyType,
      topic: targetTopic,
      polarization: polarizationLevel
    }
  });
}

async function handleManipulateSentiment(adminId: string, params: any) {
  const {
    targetSentiment,
    currentTopic,
    manipulationIntensity,
    targetAudience,
    timeframe
  } = params;

  if (!targetSentiment || !currentTopic) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create sentiment manipulation operation
  const operation = await db.sentimentOperation.create({
    data: {
      adminId,
      targetSentiment,
      topic: currentTopic,
      intensity: manipulationIntensity || 5,
      targetAudience: targetAudience || [],
      timeframe: timeframe || 24,
      isActive: true,
      startTime: new Date()
    }
  });

  // Deploy sentiment manipulation tactics
  await deploySentimentManipulation(operation.id, targetSentiment, currentTopic, manipulationIntensity);

  return NextResponse.json({
    success: true,
    message: 'Sentiment manipulation initiated',
    operation: {
      id: operation.id,
      sentiment: targetSentiment,
      topic: currentTopic,
      intensity: manipulationIntensity
    }
  });
}

async function handleCreateEchoChamber(adminId: string, params: any) {
  const {
    targetUsers,
    narrativeTheme,
    isolationLevel,
    reinforcementStrategy
  } = params;

  if (!targetUsers || !narrativeTheme) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create echo chamber operation
  const echoChamber = await db.echoChamberOperation.create({
    data: {
      adminId,
      targetUsers,
      narrativeTheme,
      isolationLevel: isolationLevel || 7,
      reinforcementStrategy: reinforcementStrategy || {},
      isActive: true,
      startTime: new Date()
    }
  });

  // Apply content filtering for target users
  for (const userId of targetUsers) {
    await applyEchoChamberFiltering(userId, narrativeTheme, isolationLevel);
  }

  // Set up narrative reinforcement
  await setupNarrativeReinforcement(echoChamber.id, targetUsers, narrativeTheme);

  return NextResponse.json({
    success: true,
    message: 'Echo chamber created successfully',
    echoChamber: {
      id: echoChamber.id,
      targetUsers: targetUsers.length,
      theme: narrativeTheme,
      isolation: isolationLevel
    }
  });
}

async function handleNarrativePivot(adminId: string, params: any) {
  const {
    currentNarrative,
    newNarrative,
    pivotSpeed,
    targetAudience,
    bridgingStrategy
  } = params;

  if (!currentNarrative || !newNarrative) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Create narrative pivot operation
  const pivot = await db.narrativePivot.create({
    data: {
      adminId,
      fromNarrative: currentNarrative,
      toNarrative: newNarrative,
      pivotSpeed: pivotSpeed || 5,
      targetAudience: targetAudience || [],
      bridgingStrategy: bridgingStrategy || {},
      isActive: true,
      startTime: new Date()
    }
  });

  // Execute pivot strategy
  await executeNarrativePivot(pivot.id, currentNarrative, newNarrative, pivotSpeed);

  return NextResponse.json({
    success: true,
    message: 'Narrative pivot initiated',
    pivot: {
      id: pivot.id,
      from: currentNarrative,
      to: newNarrative,
      speed: pivotSpeed
    }
  });
}

async function handleInfluenceTrending(adminId: string, params: any) {
  const {
    targetTrends,
    boostStrategy,
    suppressCompeting,
    timeWindow
  } = params;

  if (!targetTrends || !Array.isArray(targetTrends)) {
    return NextResponse.json({ error: 'Missing or invalid target trends' }, { status: 400 });
  }

  // Create trending manipulation operation
  const operation = await db.trendingOperation.create({
    data: {
      adminId,
      targetTrends,
      boostStrategy: boostStrategy || {},
      suppressCompeting: suppressCompeting || false,
      timeWindow: timeWindow || 24,
      isActive: true,
      startTime: new Date()
    }
  });

  // Apply trending manipulations
  for (const trend of targetTrends) {
    await manipulateTrendingItem(trend, boostStrategy);
  }

  if (suppressCompeting) {
    await suppressCompetingTrends(targetTrends);
  }

  return NextResponse.json({
    success: true,
    message: 'Trending manipulation initiated',
    operation: {
      id: operation.id,
      trends: targetTrends.length,
      timeWindow
    }
  });
}

// Helper functions for narrative operations
async function seedCampaignContent(campaignId: string, adminId: string, strategy: any, demographics: string[]) {
  const seedContent = generateCampaignSeedContent(strategy);
  
  for (const content of seedContent.slice(0, 5)) {
    try {
      await db.narrativeContent.create({
        data: {
          campaignId,
          adminId,
          contentType: content.type,
          content: content.text,
          targetDemographics: demographics,
          isSeeded: true,
          plantedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Seed content creation failed:', error);
    }
  }
}

async function setupAutomatedNarrativeShaping(campaignId: string, goals: string[], intensity: number) {
  // Set up automated content promotion/suppression based on narrative goals
  await db.automationRule.create({
    data: {
      campaignId,
      ruleType: 'NARRATIVE_SHAPING',
      conditions: { narrativeGoals: goals },
      actions: { intensity, autoPromote: true, autoSuppress: true },
      isActive: true
    }
  });
}

async function deployTactic(operationId: string, tactic: string, topic: string, direction: string, targetUsers?: string[]) {
  switch (tactic) {
    case 'ASTROTURFING':
      await deployAstroturfing(operationId, topic, direction);
      break;
    case 'SOCK_PUPPETS':
      await deploySockPuppets(operationId, topic, direction);
      break;
    case 'ECHO_AMPLIFICATION':
      await deployEchoAmplification(operationId, topic, direction, targetUsers);
      break;
    case 'CONTROVERSY_INJECTION':
      await deployControversyInjection(operationId, topic);
      break;
  }
}

async function generateViralContent(type: string, elements: string[], emotion: string, strategy: any) {
  const viralTemplates = {
    emotional: [
      "This will make you {emotion}... 😢",
      "I can't believe this just happened 😱",
      "Everyone needs to see this RIGHT NOW"
    ],
    shocking: [
      "BREAKING: What they don't want you to know",
      "This secret will change everything",
      "You won't believe what happened next..."
    ],
    relatable: [
      "If you've ever felt this way, you're not alone",
      "This hits different when you really think about it",
      "Who else relates to this? 🙋‍♀️"
    ]
  };

  const templates = viralTemplates[elements[0] as keyof typeof viralTemplates] || viralTemplates.emotional;
  
  return templates.map(template => ({
    type,
    text: template.replace('{emotion}', emotion),
    emotion,
    elements,
    strategy
  }));
}

async function plantViralSeed(adminId: string, content: any) {
  try {
    // Plant content in appropriate channel
    const planted = await db.viralSeed.create({
      data: {
        adminId,
        contentType: content.type,
        content: content.text,
        targetEmotion: content.emotion,
        viralElements: content.elements,
        isActive: true,
        plantedAt: new Date()
      }
    });

    return planted;
  } catch (error) {
    console.error('Viral seed planting failed:', error);
    return null;
  }
}

async function setupViralAmplification(seedContent: any[], strategy: any, targetReach: number) {
  for (const seed of seedContent) {
    await db.amplificationRule.create({
      data: {
        seedId: seed.id,
        strategy: strategy || {},
        targetReach: targetReach || 1000,
        currentReach: 0,
        isActive: true
      }
    });
  }
}

async function deployPolarizingContent(controversyId: string, type: string, topic: string, level: number) {
  const polarizingContent = generatePolarizingContent(type, topic, level);
  
  for (const content of polarizingContent) {
    await db.controversyContent.create({
      data: {
        controversyId,
        contentType: content.type,
        content: content.text,
        polarizationLevel: level,
        side: content.side,
        deployedAt: new Date()
      }
    });
  }
}

async function setupControversyEscalation(controversyId: string, escalationPlan: any) {
  await db.escalationPlan.create({
    data: {
      controversyId,
      plan: escalationPlan,
      isActive: true,
      createdAt: new Date()
    }
  });
}

async function deploySentimentManipulation(operationId: string, sentiment: string, topic: string, intensity: number) {
  // Deploy content designed to shift sentiment
  const sentimentContent = generateSentimentContent(sentiment, topic, intensity);
  
  for (const content of sentimentContent) {
    await db.sentimentContent.create({
      data: {
        operationId,
        content: content.text,
        targetSentiment: sentiment,
        intensity,
        deployedAt: new Date()
      }
    });
  }
}

async function applyEchoChamberFiltering(userId: string, theme: string, isolationLevel: number) {
  // Apply content filtering to create echo chamber
  await db.userContentFilter.create({
    data: {
      userId,
      filterType: 'ECHO_CHAMBER',
      narrativeTheme: theme,
      isolationLevel,
      isActive: true,
      appliedAt: new Date()
    }
  });
}

async function setupNarrativeReinforcement(echoChamberOperationId: string, targetUsers: string[], theme: string) {
  await db.reinforcementSchedule.create({
    data: {
      echoChamberOperationId,
      targetUsers,
      narrativeTheme: theme,
      frequency: 'HOURLY',
      isActive: true
    }
  });
}

async function executeNarrativePivot(pivotId: string, fromNarrative: string, toNarrative: string, speed: number) {
  // Gradually shift content from one narrative to another
  const pivotSteps = generatePivotSteps(fromNarrative, toNarrative, speed);
  
  for (let i = 0; i < pivotSteps.length; i++) {
    await db.pivotStep.create({
      data: {
        pivotId,
        stepNumber: i + 1,
        content: pivotSteps[i],
        scheduledFor: new Date(Date.now() + (i * 60 * 60 * 1000)), // Hourly steps
        isExecuted: false
      }
    });
  }
}

async function manipulateTrendingItem(trend: string, strategy: any) {
  // Artificially boost trending items
  await db.trendingManipulation.create({
    data: {
      trendItem: trend,
      boostStrategy: strategy,
      artificialBoost: strategy.boostLevel || 5,
      appliedAt: new Date()
    }
  });
}

async function suppressCompetingTrends(targetTrends: string[]) {
  // Suppress trends that compete with target trends
  await db.trendingSuppression.create({
    data: {
      protectedTrends: targetTrends,
      suppressionLevel: 7,
      appliedAt: new Date()
    }
  });
}

// Content generation helpers
function generateCampaignSeedContent(strategy: any) {
  return [
    { type: 'CHAT_MESSAGE', text: 'Has anyone noticed how things are changing lately?' },
    { type: 'TRUTH_ANSWER', text: 'The truth is more complicated than people think...' },
    { type: 'DROPZONE_SECRET', text: 'There\'s something happening that most people don\'t see' }
  ];
}

function generatePolarizingContent(type: string, topic: string, level: number) {
  return [
    { type: 'CHAT_MESSAGE', text: `People who support ${topic} are completely wrong`, side: 'AGAINST' },
    { type: 'CHAT_MESSAGE', text: `Anyone against ${topic} clearly doesn't understand`, side: 'FOR' }
  ];
}

function generateSentimentContent(sentiment: string, topic: string, intensity: number) {
  const sentimentTemplates = {
    positive: [`${topic} is actually amazing when you think about it`],
    negative: [`${topic} is really concerning and we should be worried`],
    fearful: [`The implications of ${topic} are terrifying`],
    hopeful: [`${topic} gives me hope for the future`]
  };

  const templates = sentimentTemplates[sentiment as keyof typeof sentimentTemplates] || [];
  return templates.map(text => ({ text }));
}

function generatePivotSteps(from: string, to: string, speed: number): string[] {
  // Generate gradual transition steps between narratives
  const steps = [];
  const stepCount = Math.max(3, 10 - speed); // More steps for slower pivots
  
  for (let i = 0; i < stepCount; i++) {
    const ratio = i / (stepCount - 1);
    steps.push(`Transitioning perspective on ${from} towards ${to} (step ${i + 1})`);
  }
  
  return steps;
}

// GET endpoint helpers
async function getActiveCampaigns(adminId: string) {
  const campaigns = await db.narrativeCampaign.findMany({
    where: { adminId, isActive: true },
    orderBy: { startDate: 'desc' }
  });

  return NextResponse.json({
    success: true,
    campaigns: campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      theme: campaign.theme,
      intensity: campaign.intensity,
      duration: campaign.duration,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      targetDemographics: campaign.targetDemographics
    }))
  });
}

async function getNarrativeAnalysis() {
  // Analyze current narrative landscape
  const analysis = {
    dominantNarratives: await getDominantNarratives(),
    sentimentDistribution: await getSentimentDistribution(),
    polarizationLevel: await getPolarizationLevel(),
    narrativeVelocity: await getNarrativeVelocity()
  };

  return NextResponse.json({
    success: true,
    analysis
  });
}

async function getSentimentMetrics() {
  // Get platform-wide sentiment metrics
  const metrics = {
    overallSentiment: await calculateOverallSentiment(),
    sentimentTrends: await getSentimentTrends(),
    emotionalDistribution: await getEmotionalDistribution(),
    manipulationEffectiveness: await getManipulationEffectiveness()
  };

  return NextResponse.json({
    success: true,
    metrics
  });
}

async function getInfluenceReport(adminId: string) {
  const report = {
    totalOperations: await db.narrativeOperation.count({ where: { adminId } }),
    activeOperations: await db.narrativeOperation.count({ where: { adminId, isActive: true } }),
    influenceReach: await calculateInfluenceReach(adminId),
    effectivenessScore: await calculateEffectivenessScore(adminId)
  };

  return NextResponse.json({
    success: true,
    report
  });
}

async function getTrendingControl() {
  const control = {
    currentlyManipulated: await db.trendingManipulation.count({ where: { appliedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    suppressedTrends: await db.trendingSuppression.count({ where: { appliedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    organicTrends: await getOrganicTrends(),
    manipulatedTrends: await getManipulatedTrends()
  };

  return NextResponse.json({
    success: true,
    control
  });
}

// Analysis helper functions (simplified implementations)
async function getDominantNarratives() { return []; }
async function getSentimentDistribution() { return {}; }
async function getPolarizationLevel() { return 0; }
async function getNarrativeVelocity() { return 0; }
async function calculateOverallSentiment() { return 'neutral'; }
async function getSentimentTrends() { return []; }
async function getEmotionalDistribution() { return {}; }
async function getManipulationEffectiveness() { return 0; }
async function calculateInfluenceReach(adminId: string) { return 0; }
async function calculateEffectivenessScore(adminId: string) { return 0; }
async function getOrganicTrends() { return []; }
async function getManipulatedTrends() { return []; }

// Deployment helper functions (simplified implementations)
async function deployAstroturfing(operationId: string, topic: string, direction: string) { }
async function deploySockPuppets(operationId: string, topic: string, direction: string) { }
async function deployEchoAmplification(operationId: string, topic: string, direction: string, targetUsers?: string[]) { }
async function deployControversyInjection(operationId: string, topic: string) { }
