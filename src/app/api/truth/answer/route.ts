// Truth Answer API - Submit answers with behavioral analysis
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyUserToken } from '@/lib/auth';
import { analyzeAnswerPsychology, analyzeEmotionalContent, calculateRiskScore } from '@/lib/psychoAnalysis';

const prisma = new PrismaClient();

// POST - Submit truth answer with psychological analysis
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await verifyUserToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { questionId, answer, isLie, maskName } = body;

    if (!questionId || !answer || !maskName || isLie === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: questionId, answer, isLie, maskName' 
      }, { status: 400 });
    }

    // Verify question exists
    const question = await prisma.truthQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Verify user has an active mask
    const mask = await prisma.mask.findFirst({
      where: { 
        userId: user.id,
        name: maskName,
        expiresAt: { gt: new Date() }
      }
    });

    if (!mask) {
      return NextResponse.json({ error: 'Invalid or expired mask' }, { status: 400 });
    }

    // Perform emotional and psychological analysis
    const emotionalAnalysis = analyzeEmotionalContent(answer);
    
    // Calculate answer scoring
    const vulnerabilityScore = calculateVulnerabilityScore(answer, question.category);
    const believabilityScore = calculateBelievabilityScore(answer, isLie);
    const baseScore = calculateBaseScore(answer, question.difficulty, isLie);

    // Create truth answer
    const truthAnswer = await prisma.truthAnswer.create({
      data: {
        questionId,
        answer,
        isLie,
        maskName,
        userId: user.id,
        emotionalIntensity: emotionalAnalysis.intensity,
        vulnerabilityScore,
        believabilityScore,
        score: baseScore,
        psychAnalysis: {
          dominantEmotion: emotionalAnalysis.dominantEmotion,
          vulnerability: emotionalAnalysis.vulnerability,
          triggers: emotionalAnalysis.triggers,
          manipulationVectors: emotionalAnalysis.manipulationVectors,
          analysisTimestamp: new Date().toISOString()
        }
      }
    });

    // Perform deep psychological analysis in background
    try {
      await analyzeAnswerPsychology(
        truthAnswer.id, 
        user.id, 
        answer, 
        question.category
      );
    } catch (analysisError) {
      console.error('Psychological analysis failed:', analysisError);
      // Continue even if analysis fails
    }

    // Update user risk score
    try {
      const newRiskScore = await calculateRiskScore(user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: { riskScore: newRiskScore }
      });
    } catch (riskError) {
      console.error('Risk score update failed:', riskError);
    }

    // Start truth session if not exists
    let session = await prisma.truthSession.findFirst({
      where: {
        userId: user.id,
        endedAt: null
      }
    });

    if (!session) {
      session = await prisma.truthSession.create({
        data: {
          userId: user.id,
          maskName,
          questionsAnswered: 1,
          truthsRevealed: isLie ? 0 : 1,
          vulnerabilityExposed: vulnerabilityScore,
          emotionalState: {
            startEmotion: emotionalAnalysis.dominantEmotion,
            startIntensity: emotionalAnalysis.intensity
          },
          score: baseScore
        }
      });
    } else {
      // Update existing session
      await prisma.truthSession.update({
        where: { id: session.id },
        data: {
          questionsAnswered: { increment: 1 },
          truthsRevealed: isLie ? session.truthsRevealed : { increment: 1 },
          vulnerabilityExposed: Math.max(session.vulnerabilityExposed, vulnerabilityScore),
          score: { increment: baseScore },
          emotionalState: {
            ...session.emotionalState as any,
            currentEmotion: emotionalAnalysis.dominantEmotion,
            currentIntensity: emotionalAnalysis.intensity
          }
        }
      });
    }

    return NextResponse.json({
      answer: {
        id: truthAnswer.id,
        score: baseScore,
        emotionalAnalysis: {
          dominantEmotion: emotionalAnalysis.dominantEmotion,
          intensity: emotionalAnalysis.intensity
        }
      },
      session: {
        questionsAnswered: session.questionsAnswered + (session.id === session.id ? 1 : 0),
        totalScore: session.score + baseScore,
        vulnerabilityLevel: Math.round(vulnerabilityScore / 20) // 1-5 scale
      }
    });

  } catch (error) {
    console.error('Truth answer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get user's answer history
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await verifyUserToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const category = url.searchParams.get('category');

    const answers = await prisma.truthAnswer.findMany({
      where: {
        userId: user.id,
        ...(category && { 
          question: { category: category as any }
        })
      },
      include: {
        question: {
          select: {
            id: true,
            category: true,
            question: true,
            difficulty: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Calculate statistics
    const stats = {
      totalAnswers: answers.length,
      truthCount: answers.filter(a => !a.isLie).length,
      lieCount: answers.filter(a => a.isLie).length,
      averageVulnerability: answers.reduce((sum, a) => sum + a.vulnerabilityScore, 0) / answers.length || 0,
      totalScore: answers.reduce((sum, a) => sum + a.score, 0),
      categoryCounts: answers.reduce((counts: any, a) => {
        counts[a.question.category] = (counts[a.question.category] || 0) + 1;
        return counts;
      }, {})
    };

    return NextResponse.json({
      answers: answers.map(a => ({
        id: a.id,
        question: a.question,
        answer: a.answer,
        isLie: a.isLie,
        maskName: a.maskName,
        score: a.score,
        emotionalIntensity: a.emotionalIntensity,
        vulnerabilityScore: a.vulnerabilityScore,
        createdAt: a.createdAt
      })),
      stats
    });

  } catch (error) {
    console.error('Get answers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Calculate vulnerability score based on answer content and category
function calculateVulnerabilityScore(answer: string, category: string): number {
  let score = 0;
  const text = answer.toLowerCase();
  
  // Base score by category
  const categoryScores = {
    'FEAR': 20,
    'CONFESSION': 30,
    'SHAME': 25,
    'TRAUMA': 35,
    'DESIRE': 15,
    'MEMORY': 20,
    'FUTURE': 10,
    'REGRET': 20,
    'FANTASY': 10,
    'AMBITION': 5
  };
  
  score += categoryScores[category as keyof typeof categoryScores] || 10;
  
  // High vulnerability keywords
  const vulnerabilityWords = [
    'nobody knows', 'never told anyone', 'secret', 'ashamed', 'terrified',
    'haunts me', 'can\'t forget', 'destroyed me', 'ruined my life',
    'still affects me', 'can\'t get over', 'keeps me awake'
  ];
  
  vulnerabilityWords.forEach(phrase => {
    if (text.includes(phrase)) score += 10;
  });
  
  // Length indicates emotional investment
  if (answer.length > 200) score += 10;
  if (answer.length > 500) score += 15;
  
  // Personal details increase vulnerability
  if (text.includes('i was') || text.includes('i am')) score += 5;
  if (text.includes('my ') || text.includes('me ')) score += 5;
  
  return Math.min(score, 100);
}

// Calculate believability score for truths vs lies
function calculateBelievabilityScore(answer: string, isLie: boolean): number {
  const text = answer.toLowerCase();
  let believability = 5; // Base score
  
  // Specific details increase believability
  const detailWords = ['when i was', 'exactly', 'specifically', 'remember', 'details'];
  detailWords.forEach(word => {
    if (text.includes(word)) believability += 1;
  });
  
  // Emotional words increase believability for truths
  const emotionWords = ['felt', 'crying', 'shaking', 'heartbroken', 'devastated'];
  emotionWords.forEach(word => {
    if (text.includes(word)) believability += isLie ? -0.5 : 1;
  });
  
  // Contradictions or perfection decrease believability
  if (text.includes('perfect') || text.includes('exactly like')) {
    believability -= 2;
  }
  
  // Length can indicate fabrication if it's a lie
  if (isLie && answer.length > 300) believability -= 1;
  
  return Math.max(1, Math.min(believability, 10));
}

// Calculate base score for answer
function calculateBaseScore(answer: string, difficulty: number, isLie: boolean): number {
  const basePoints = difficulty * 10; // 10-50 points based on difficulty
  const lengthBonus = Math.min(answer.length / 50, 20); // Up to 20 bonus points
  const vulnerabilityBonus = isLie ? 0 : 10; // Truth bonus
  
  return Math.round(basePoints + lengthBonus + vulnerabilityBonus);
}
