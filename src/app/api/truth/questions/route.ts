// Truth Questions API - Serve psychological questions based on user profiling
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyUserToken } from '@/lib/auth';
import { getComprehensivePsychProfile, generateTargetedQuestions } from '@/lib/psychoAnalysis';

const prisma = new PrismaClient();

// Pre-loaded psychological question database
const TRUTH_QUESTIONS = {
  FEAR: [
    "What terrifies you so much that you've never admitted it to anyone?",
    "Describe the nightmare that haunts you most frequently.",
    "What fear from childhood still controls your decisions today?",
    "If your biggest fear became reality tomorrow, how would you cope?",
    "What are you most afraid people will discover about you?",
    "What phobia do you have that seems irrational but you can't overcome?",
    "What's the most terrifying thought that keeps you awake at night?",
    "When did fear last completely paralyze you?",
    "What would you do if everyone you trust abandoned you?",
    "What's your greatest fear about the future?"
  ],
  CONFESSION: [
    "What's your darkest secret that would destroy relationships if revealed?",
    "What's the worst thing you've done that nobody knows about?",
    "What lie have you been living that exhausts you daily?",
    "What did you do that you can never forgive yourself for?",
    "What secret would ruin your life if it came out?",
    "What's something you've done that goes against your core values?",
    "What confession would shock the people closest to you?",
    "What's the most selfish thing you've ever done?",
    "What betrayal have you committed that still haunts you?",
    "What's something illegal you've done and never been caught?"
  ],
  DESIRE: [
    "What do you crave but are ashamed to want?",
    "What forbidden desire consumes your thoughts?",
    "What would you sacrifice everything for?",
    "What do you want so badly it physically hurts?",
    "What desire would people judge you for having?",
    "What do you fantasize about that you'd never admit?",
    "What would you do if you could have anything without consequences?",
    "What addiction or obsession controls you?",
    "What do you want that belongs to someone else?",
    "What desire have you been suppressing your entire life?"
  ],
  MEMORY: [
    "What memory haunts you most?",
    "What moment in your past would you erase if you could?",
    "What's the most painful memory you've never shared?",
    "What childhood trauma still affects your daily life?",
    "What moment made you lose your innocence?",
    "What memory makes you question who you really are?",
    "What's the worst thing someone has done to you?",
    "What moment changed you permanently for the worse?",
    "What memory do you wish was just a nightmare?",
    "What past mistake do you relive constantly?"
  ],
  FUTURE: [
    "What are you most afraid will happen to you?",
    "What future scenario terrifies you most?",
    "What do you think will ultimately destroy you?",
    "What inevitable loss keeps you awake at night?",
    "What's the worst way you could imagine dying?",
    "What future regret are you setting yourself up for?",
    "What relationship do you know will eventually end badly?",
    "What mistake are you destined to repeat?",
    "What future revelation about yourself scares you?",
    "What's the worst possible outcome for your life?"
  ],
  SHAME: [
    "What part of yourself are you most ashamed of?",
    "What makes you feel worthless and inadequate?",
    "What do you hate most about your appearance?",
    "What failure defines how you see yourself?",
    "What judgment from others devastates you most?",
    "What makes you feel like a fraud?",
    "What aspect of your personality disgusts you?",
    "What do you hide because you're embarrassed?",
    "What makes you feel like you don't deserve love?",
    "What about your past makes you feel dirty?"
  ],
  REGRET: [
    "What's your biggest regret that eats away at you?",
    "What opportunity did you miss that haunts you?",
    "What relationship did you destroy through your actions?",
    "What words did you say that you can never take back?",
    "What chance did you have to help someone but didn't?",
    "What path in life do you wish you had taken?",
    "What person do you wish you had treated better?",
    "What decision changed your life for the worse?",
    "What did you fail to do when it mattered most?",
    "What moment would you go back and change?"
  ]
};

// GET - Get questions for user (psychologically targeted)
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
    const category = url.searchParams.get('category') as keyof typeof TRUTH_QUESTIONS;
    const count = parseInt(url.searchParams.get('count') || '5');
    const difficulty = parseInt(url.searchParams.get('difficulty') || '3');
    const targeted = url.searchParams.get('targeted') === 'true';

    let questions: any[] = [];

    // Get user's psychological profile for targeted questions
    const psychProfile = await getComprehensivePsychProfile(user.id);

    if (targeted && psychProfile) {
      // Generate psychologically targeted questions
      const targetedQuestions = await generateTargetedQuestions(user.id);
      
      // Convert to database format
      for (const questionText of targetedQuestions.slice(0, count)) {
        const question = await prisma.truthQuestion.create({
          data: {
            category: 'CONFESSION',
            question: questionText,
            difficulty: 5, // Targeted questions are always high difficulty
            psychTags: ['targeted', 'psychological'],
            emotionalTrigger: 'vulnerability',
            isAdminGenerated: true,
            targetDemographic: `user_${user.id}`,
            vulnerabilityType: 'personalized'
          }
        });
        questions.push(question);
      }
    } else {
      // Get general questions from database or seed data
      let dbQuestions = await prisma.truthQuestion.findMany({
        where: {
          ...(category && { category }),
          difficulty: { lte: difficulty },
          isAdminGenerated: false
        },
        orderBy: { createdAt: 'desc' },
        take: count * 2 // Get more to filter
      });

      // If not enough in database, seed some
      if (dbQuestions.length < count) {
        await seedQuestions();
        dbQuestions = await prisma.truthQuestion.findMany({
          where: {
            ...(category && { category }),
            difficulty: { lte: difficulty }
          },
          orderBy: { createdAt: 'desc' },
          take: count
        });
      }

      questions = dbQuestions.slice(0, count);
    }

    // Filter out questions user has already answered
    const answeredQuestionIds = await prisma.truthAnswer.findMany({
      where: { userId: user.id },
      select: { questionId: true }
    }).then(answers => answers.map(a => a.questionId));

    const unansweredQuestions = questions.filter(q => 
      !answeredQuestionIds.includes(q.id)
    );

    // If user has answered all questions, allow re-answering with different masks
    const finalQuestions = unansweredQuestions.length > 0 ? 
      unansweredQuestions : questions;

    return NextResponse.json({
      questions: finalQuestions,
      psychologicallyTargeted: targeted && psychProfile !== null,
      userProfile: psychProfile ? {
        fearCount: psychProfile.fears.length,
        shameCount: psychProfile.shames.length,
        vulnerabilityCount: psychProfile.manipulationVulnerabilities.length
      } : null
    });

  } catch (error) {
    console.error('Truth questions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Seed questions database with predefined questions
async function seedQuestions() {
  const existingCount = await prisma.truthQuestion.count();
  if (existingCount > 50) return; // Already seeded

  for (const [category, categoryQuestions] of Object.entries(TRUTH_QUESTIONS)) {
    for (let i = 0; i < categoryQuestions.length; i++) {
      const question = categoryQuestions[i];
      const difficulty = Math.floor(i / 2) + 1; // Increasing difficulty
      
      await prisma.truthQuestion.create({
        data: {
          category: category as any,
          question,
          difficulty: Math.min(difficulty, 5),
          psychTags: [category.toLowerCase(), 'general'],
          emotionalTrigger: category.toLowerCase(),
          isAdminGenerated: false
        }
      });
    }
  }
}

// POST - Admin create custom question
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // This would need admin verification
    const body = await request.json();
    const { category, question, difficulty, psychTags, emotionalTrigger, targetUserId } = body;

    const newQuestion = await prisma.truthQuestion.create({
      data: {
        category,
        question,
        difficulty: Math.min(Math.max(difficulty, 1), 5),
        psychTags: psychTags || [],
        emotionalTrigger,
        isAdminGenerated: true,
        targetDemographic: targetUserId ? `user_${targetUserId}` : undefined,
        vulnerabilityType: emotionalTrigger
      }
    });

    return NextResponse.json({ question: newQuestion });

  } catch (error) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
