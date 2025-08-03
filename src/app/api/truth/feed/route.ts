// Truth Feed API - Global truth feed for guessing game
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyUserToken } from '@/lib/auth';

const prisma = new PrismaClient();

// GET - Get anonymous truth feed for guessing
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
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const category = url.searchParams.get('category');
    const difficulty = url.searchParams.get('difficulty');
    const excludeOwn = url.searchParams.get('excludeOwn') !== 'false'; // Default true

    // Get answers user hasn't guessed on yet
    const guessedAnswerIds = await prisma.truthGuess.findMany({
      where: { guesserUserId: user.id },
      select: { answerId: true }
    }).then(guesses => guesses.map(g => g.answerId));

    const answers = await prisma.truthAnswer.findMany({
      where: {
        // Exclude answers user has already guessed on
        id: { notIn: guessedAnswerIds },
        // Exclude user's own answers if specified
        ...(excludeOwn && { userId: { not: user.id } }),
        // Filter by category if specified
        ...(category && { 
          question: { category: category as any }
        }),
        // Filter by difficulty if specified
        ...(difficulty && { 
          question: { difficulty: parseInt(difficulty) }
        }),
        // Only include recent answers (last 7 days) for freshness
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        question: {
          select: {
            id: true,
            category: true,
            question: true,
            difficulty: true,
            psychTags: true
          }
        },
        _count: {
          select: {
            guesses: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { score: 'desc' }
      ],
      take: limit * 2 // Get more to randomize
    });

    // Randomize and limit results
    const shuffledAnswers = answers
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);

    // Format for public consumption (hide sensitive data)
    const publicAnswers = shuffledAnswers.map(answer => ({
      id: answer.id,
      question: {
        id: answer.question.id,
        text: answer.question.question,
        category: answer.question.category,
        difficulty: answer.question.difficulty
      },
      answer: answer.answer,
      maskName: answer.maskName,
      maskType: answer.maskType,
      emotionalIntensity: answer.emotionalIntensity,
      believabilityScore: answer.believabilityScore,
      score: answer.score,
      guessCount: answer._count.guesses,
      createdAt: answer.createdAt,
      // Hide whether it's truth or lie - that's what users guess
      metadata: {
        hasEmotionalTriggers: answer.psychAnalysis ? 
          Object.keys(answer.psychAnalysis as any).length > 0 : false,
        vulnerabilityLevel: Math.ceil(answer.vulnerabilityScore / 20), // 1-5 scale
        textLength: answer.answer.length,
        timeToAnswer: calculateEstimatedAnswerTime(answer.answer)
      }
    }));

    // Get user's guessing statistics
    const userStats = await getUserGuessingStats(user.id);

    return NextResponse.json({
      answers: publicAnswers,
      stats: userStats,
      feedMetadata: {
        totalAvailable: answers.length,
        filterApplied: { category, difficulty, excludeOwn },
        freshness: '7 days',
        randomized: true
      }
    });

  } catch (error) {
    console.error('Truth feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET specific answer details for guessing
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
    const { answerId } = body;

    if (!answerId) {
      return NextResponse.json({ error: 'Answer ID required' }, { status: 400 });
    }

    // Get detailed answer for analysis
    const answer = await prisma.truthAnswer.findUnique({
      where: { id: answerId },
      include: {
        question: {
          select: {
            id: true,
            category: true,
            question: true,
            difficulty: true,
            psychTags: true,
            emotionalTrigger: true
          }
        },
        guesses: {
          select: {
            guessedTruth: true,
            confidence: true,
            reasoning: true
          }
        }
      }
    });

    if (!answer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
    }

    // Don't allow viewing own answers
    if (answer.userId === user.id) {
      return NextResponse.json({ error: 'Cannot view own answers' }, { status: 403 });
    }

    // Check if user already guessed
    const existingGuess = await prisma.truthGuess.findUnique({
      where: {
        answerId_guesserUserId: {
          answerId,
          guesserUserId: user.id
        }
      }
    });

    if (existingGuess) {
      return NextResponse.json({ error: 'Already guessed on this answer' }, { status: 400 });
    }

    // Calculate guess difficulty and hints
    const guessingData = calculateGuessingHints(answer);

    return NextResponse.json({
      answer: {
        id: answer.id,
        text: answer.answer,
        maskName: answer.maskName,
        maskType: answer.maskType,
        emotionalIntensity: answer.emotionalIntensity,
        believabilityScore: answer.believabilityScore,
        createdAt: answer.createdAt
      },
      question: answer.question,
      guessingData,
      communityGuesses: {
        totalGuesses: answer.guesses.length,
        truthPercentage: answer.guesses.length > 0 ? 
          Math.round((answer.guesses.filter(g => g.guessedTruth).length / answer.guesses.length) * 100) : 0,
        averageConfidence: answer.guesses.length > 0 ?
          Math.round(answer.guesses.reduce((sum, g) => sum + g.confidence, 0) / answer.guesses.length) : 0
      }
    });

  } catch (error) {
    console.error('Answer details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get user's guessing statistics
async function getUserGuessingStats(userId: string) {
  const guesses = await prisma.truthGuess.findMany({
    where: { guesserUserId: userId },
    include: {
      answer: {
        select: {
          isLie: true,
          question: {
            select: { category: true, difficulty: true }
          }
        }
      }
    }
  });

  const correctGuesses = guesses.filter(guess => 
    guess.guessedTruth === !guess.answer.isLie
  );

  const stats = {
    totalGuesses: guesses.length,
    correctGuesses: correctGuesses.length,
    accuracy: guesses.length > 0 ? Math.round((correctGuesses.length / guesses.length) * 100) : 0,
    averageConfidence: guesses.length > 0 ? 
      Math.round(guesses.reduce((sum, g) => sum + g.confidence, 0) / guesses.length) : 0,
    categoryAccuracy: {} as Record<string, number>,
    difficultyAccuracy: {} as Record<string, number>,
    streak: calculateGuessingStreak(guesses),
    totalScore: correctGuesses.reduce((sum, g) => sum + g.score, 0)
  };

  // Calculate accuracy by category
  const categoryCounts: Record<string, { total: number, correct: number }> = {};
  guesses.forEach(guess => {
    const category = guess.answer.question.category;
    if (!categoryCounts[category]) {
      categoryCounts[category] = { total: 0, correct: 0 };
    }
    categoryCounts[category].total++;
    if (guess.guessedTruth === !guess.answer.isLie) {
      categoryCounts[category].correct++;
    }
  });

  Object.entries(categoryCounts).forEach(([category, counts]) => {
    stats.categoryAccuracy[category] = Math.round((counts.correct / counts.total) * 100);
  });

  return stats;
}

// Calculate current guessing streak
function calculateGuessingStreak(guesses: any[]): number {
  const sortedGuesses = guesses
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  let streak = 0;
  for (const guess of sortedGuesses) {
    const isCorrect = guess.guessedTruth === !guess.answer.isLie;
    if (isCorrect) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Calculate hints and difficulty for guessing
function calculateGuessingHints(answer: any) {
  const hints = [];
  const analysis = answer.psychAnalysis || {};
  
  // Text analysis hints
  if (answer.answer.length > 300) {
    hints.push("This is a detailed response - does extra detail suggest truth or fabrication?");
  }
  
  if (answer.answer.length < 50) {
    hints.push("This is a brief response - is it evasive or just concise?");
  }
  
  // Emotional intensity hints
  if (answer.emotionalIntensity > 7) {
    hints.push("High emotional intensity detected - strong emotions can indicate truth or overacting");
  }
  
  // Believability hints
  if (answer.believabilityScore > 8) {
    hints.push("This answer seems very believable - but is it too perfect?");
  } else if (answer.believabilityScore < 4) {
    hints.push("This answer has some suspicious elements - but does that make it a lie?");
  }
  
  // Time-based hints
  const estimatedTime = calculateEstimatedAnswerTime(answer.answer);
  if (estimatedTime < 30) {
    hints.push("This appears to be answered very quickly - prepared lie or immediate truth?");
  } else if (estimatedTime > 180) {
    hints.push("This took time to craft - careful truth or elaborate fabrication?");
  }
  
  return {
    hints,
    difficulty: Math.ceil(answer.question.difficulty * (answer.believabilityScore / 5)),
    analysisClues: {
      emotionalIntensity: answer.emotionalIntensity,
      believabilityScore: answer.believabilityScore,
      textLength: answer.answer.length,
      estimatedAnswerTime: estimatedTime
    }
  };
}

// Estimate how long an answer took based on content
function calculateEstimatedAnswerTime(answer: string): number {
  // Rough estimation: 2-3 seconds per word + thinking time
  const wordCount = answer.split(' ').length;
  const typingTime = wordCount * 2.5;
  const thinkingTime = Math.min(wordCount * 1.5, 120); // Max 2 minutes thinking
  
  return Math.round(typingTime + thinkingTime);
}
