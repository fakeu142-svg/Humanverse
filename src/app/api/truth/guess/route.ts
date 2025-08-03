// Truth Guess API - Submit truth/lie guesses and scoring
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyUserToken } from '@/lib/auth';

const prisma = new PrismaClient();

// POST - Submit a truth/lie guess
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
    const { answerId, guessedTruth, confidence, reasoning } = body;

    if (!answerId || guessedTruth === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: answerId, guessedTruth' 
      }, { status: 400 });
    }

    // Verify answer exists and get details
    const answer = await prisma.truthAnswer.findUnique({
      where: { id: answerId },
      include: {
        question: {
          select: {
            id: true,
            category: true,
            difficulty: true
          }
        }
      }
    });

    if (!answer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
    }

    // Prevent guessing on own answers
    if (answer.userId === user.id) {
      return NextResponse.json({ error: 'Cannot guess on your own answers' }, { status: 403 });
    }

    // Check if user already guessed on this answer
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

    // Calculate if guess is correct (truth guess matches !isLie)
    const isCorrect = guessedTruth === !answer.isLie;
    
    // Calculate score for the guess
    const score = calculateGuessScore(
      isCorrect,
      confidence || 5,
      answer.question.difficulty,
      answer.believabilityScore
    );

    // Create the guess
    const guess = await prisma.truthGuess.create({
      data: {
        questionId: answer.questionId,
        answerId,
        guesserUserId: user.id,
        isCorrect,
        guessedTruth,
        confidence: Math.max(1, Math.min(confidence || 5, 10)),
        reasoning: reasoning || '',
        score
      }
    });

    // Update user's truth session statistics
    await updateUserTruthSession(user.id, isCorrect, score);

    // Get updated community statistics for this answer
    const communityStats = await getCommunityGuessStats(answerId);

    // Check if this guess reveals the answer (after certain number of guesses)
    const shouldRevealAnswer = await shouldRevealAnswerNow(answerId);

    return NextResponse.json({
      guess: {
        id: guess.id,
        isCorrect,
        score,
        confidence: guess.confidence
      },
      result: shouldRevealAnswer ? {
        actualAnswer: answer.isLie ? 'lie' : 'truth',
        yourGuess: guessedTruth ? 'truth' : 'lie',
        correctGuess: isCorrect
      } : null,
      communityStats,
      message: isCorrect ? 
        `Correct! You earned ${score} points.` :
        `Incorrect. The answer was a ${answer.isLie ? 'lie' : 'truth'}.`
    });

  } catch (error) {
    console.error('Truth guess error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get guess results and leaderboard
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
    const answerId = url.searchParams.get('answerId');
    const leaderboard = url.searchParams.get('leaderboard') === 'true';

    if (answerId) {
      // Get specific answer guess results
      const guessResults = await getAnswerGuessResults(answerId, user.id);
      return NextResponse.json(guessResults);
    }

    if (leaderboard) {
      // Get truth guessing leaderboard
      const leaderboardData = await getTruthGuessingLeaderboard();
      return NextResponse.json(leaderboardData);
    }

    // Get user's guess history
    const userGuesses = await prisma.truthGuess.findMany({
      where: { guesserUserId: user.id },
      include: {
        answer: {
          select: {
            isLie: true,
            maskName: true,
            question: {
              select: {
                category: true,
                difficulty: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const stats = calculateUserGuessingStats(userGuesses);

    return NextResponse.json({
      recentGuesses: userGuesses.map(guess => ({
        id: guess.id,
        answerId: guess.answerId,
        guessedTruth: guess.guessedTruth,
        isCorrect: guess.isCorrect,
        confidence: guess.confidence,
        score: guess.score,
        reasoning: guess.reasoning,
        createdAt: guess.createdAt,
        answer: {
          actualAnswer: guess.answer.isLie ? 'lie' : 'truth',
          maskName: guess.answer.maskName,
          category: guess.answer.question.category,
          difficulty: guess.answer.question.difficulty
        }
      })),
      stats
    });

  } catch (error) {
    console.error('Get guess results error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Calculate score for a guess
function calculateGuessScore(
  isCorrect: boolean,
  confidence: number,
  questionDifficulty: number,
  believabilityScore: number
): number {
  if (!isCorrect) return 0;

  // Base score for correct guess
  let score = 10;
  
  // Difficulty bonus (harder questions worth more)
  score += questionDifficulty * 5;
  
  // Confidence bonus (higher confidence = higher risk/reward)
  score += confidence;
  
  // Believability challenge bonus (harder to detect lies/truths worth more)
  const believabilityChallenge = Math.abs(believabilityScore - 5); // Distance from neutral
  score += believabilityChallenge * 2;
  
  // Early guess bonus (first few guessers get bonus)
  // This would be calculated in the main function based on guess count
  
  return Math.round(score);
}

// Update user's truth session with guess results
async function updateUserTruthSession(userId: string, isCorrect: boolean, score: number) {
  let session = await prisma.truthSession.findFirst({
    where: {
      userId,
      endedAt: null
    }
  });

  if (!session) {
    // Create new session if none exists
    session = await prisma.truthSession.create({
      data: {
        userId,
        maskName: 'Unknown', // Will be updated when user answers
        questionsAnswered: 0,
        truthsRevealed: 0,
        score: score
      }
    });
  } else {
    await prisma.truthSession.update({
      where: { id: session.id },
      data: {
        score: { increment: score }
      }
    });
  }
}

// Get community guess statistics for an answer
async function getCommunityGuessStats(answerId: string) {
  const guesses = await prisma.truthGuess.findMany({
    where: { answerId },
    select: {
      guessedTruth: true,
      confidence: true,
      isCorrect: true
    }
  });

  const truthGuesses = guesses.filter(g => g.guessedTruth).length;
  const lieGuesses = guesses.filter(g => !g.guessedTruth).length;
  const correctGuesses = guesses.filter(g => g.isCorrect).length;

  return {
    totalGuesses: guesses.length,
    truthPercentage: guesses.length > 0 ? Math.round((truthGuesses / guesses.length) * 100) : 0,
    liePercentage: guesses.length > 0 ? Math.round((lieGuesses / guesses.length) * 100) : 0,
    accuracyPercentage: guesses.length > 0 ? Math.round((correctGuesses / guesses.length) * 100) : 0,
    averageConfidence: guesses.length > 0 ? 
      Math.round(guesses.reduce((sum, g) => sum + g.confidence, 0) / guesses.length) : 0
  };
}

// Determine if answer should be revealed (after enough guesses)
async function shouldRevealAnswerNow(answerId: string): Promise<boolean> {
  const guessCount = await prisma.truthGuess.count({
    where: { answerId }
  });

  // Reveal after 10 guesses or 24 hours, whichever comes first
  if (guessCount >= 10) return true;

  const answer = await prisma.truthAnswer.findUnique({
    where: { id: answerId },
    select: { createdAt: true }
  });

  if (answer) {
    const hoursSinceCreation = (Date.now() - answer.createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation >= 24;
  }

  return false;
}

// Get detailed guess results for a specific answer
async function getAnswerGuessResults(answerId: string, userId: string) {
  const answer = await prisma.truthAnswer.findUnique({
    where: { id: answerId },
    include: {
      question: {
        select: {
          category: true,
          question: true,
          difficulty: true
        }
      },
      guesses: {
        include: {
          user: {
            select: {
              id: true // Don't expose user details
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!answer) return null;

  const userGuess = answer.guesses.find(g => g.guesserUserId === userId);
  const shouldReveal = await shouldRevealAnswerNow(answerId);

  return {
    answer: {
      id: answer.id,
      text: answer.answer,
      maskName: answer.maskName,
      ...(shouldReveal && { actualAnswer: answer.isLie ? 'lie' : 'truth' })
    },
    question: answer.question,
    userGuess: userGuess ? {
      guessedTruth: userGuess.guessedTruth,
      confidence: userGuess.confidence,
      isCorrect: userGuess.isCorrect,
      score: userGuess.score,
      reasoning: userGuess.reasoning
    } : null,
    communityGuesses: {
      total: answer.guesses.length,
      distribution: answer.guesses.reduce((dist, guess) => {
        const key = guess.guessedTruth ? 'truth' : 'lie';
        dist[key] = (dist[key] || 0) + 1;
        return dist;
      }, {} as Record<string, number>),
      timeline: answer.guesses.map((guess, index) => ({
        position: index + 1,
        guessedTruth: guess.guessedTruth,
        confidence: guess.confidence,
        timestamp: guess.createdAt
      }))
    },
    revealed: shouldReveal
  };
}

// Get truth guessing leaderboard
async function getTruthGuessingLeaderboard() {
  // Get top guessers by score
  const topGuessers = await prisma.truthGuess.groupBy({
    by: ['guesserUserId'],
    _sum: { score: true },
    _count: { id: true },
    _avg: { confidence: true },
    orderBy: { _sum: { score: 'desc' } },
    take: 50
  });

  // Get accuracy stats for each user
  const leaderboard = [];
  for (const guesser of topGuessers) {
    const correctGuesses = await prisma.truthGuess.count({
      where: {
        guesserUserId: guesser.guesserUserId,
        isCorrect: true
      }
    });

    // Get mask info for the user
    const userMask = await prisma.mask.findFirst({
      where: { userId: guesser.guesserUserId },
      orderBy: { createdAt: 'desc' },
      select: { name: true, type: true }
    });

    leaderboard.push({
      rank: leaderboard.length + 1,
      maskName: userMask?.name || 'Unknown',
      maskType: userMask?.type || 'GHOST_WIND',
      totalScore: guesser._sum.score || 0,
      totalGuesses: guesser._count.id,
      correctGuesses,
      accuracy: Math.round((correctGuesses / guesser._count.id) * 100),
      averageConfidence: Math.round(guesser._avg.confidence || 0)
    });
  }

  return {
    leaderboard,
    lastUpdated: new Date().toISOString()
  };
}

// Calculate comprehensive user guessing statistics
function calculateUserGuessingStats(guesses: any[]) {
  const correctGuesses = guesses.filter(g => g.isCorrect);
  const totalScore = guesses.reduce((sum, g) => sum + g.score, 0);

  // Calculate streak (consecutive correct guesses)
  let currentStreak = 0;
  for (const guess of guesses) {
    if (guess.isCorrect) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Category performance
  const categoryStats: Record<string, any> = {};
  guesses.forEach(guess => {
    const category = guess.answer.question.category;
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, correct: 0 };
    }
    categoryStats[category].total++;
    if (guess.isCorrect) categoryStats[category].correct++;
  });

  Object.keys(categoryStats).forEach(category => {
    const stats = categoryStats[category];
    stats.accuracy = Math.round((stats.correct / stats.total) * 100);
  });

  return {
    totalGuesses: guesses.length,
    correctGuesses: correctGuesses.length,
    accuracy: guesses.length > 0 ? Math.round((correctGuesses.length / guesses.length) * 100) : 0,
    totalScore,
    averageScore: guesses.length > 0 ? Math.round(totalScore / guesses.length) : 0,
    currentStreak,
    bestCategory: Object.entries(categoryStats)
      .sort(([,a], [,b]) => (b as any).accuracy - (a as any).accuracy)[0]?.[0] || null,
    categoryPerformance: categoryStats,
    averageConfidence: guesses.length > 0 ? 
      Math.round(guesses.reduce((sum, g) => sum + g.confidence, 0) / guesses.length) : 0
  };
}
