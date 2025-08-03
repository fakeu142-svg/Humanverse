import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { createMaskForUser } from '@/lib/maskSurveillance';
import { recordChatMessage } from '@/lib/chatSurveillance';
import { withAdminSecurity } from '@/lib/middleware';
import { cookies } from 'next/headers';
import { MaskType } from '@prisma/client';

async function handler(request: NextRequest) {
  try {
    // Validate admin session
    const cookieStore = cookies();
    const token = cookieStore.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const admin = await validateAdminSession(token);
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid admin session' },
        { status: 401 }
      );
    }

    // Check impersonation permission
    if (!admin.permissions.impersonation && admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions for room infiltration' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'CREATE_INFILTRATION_IDENTITY':
        const { targetUserId, maskType, roomId, persona } = body;

        if (!targetUserId || !maskType || !roomId) {
          return NextResponse.json(
            { error: 'Target user ID, mask type, and room ID are required' },
            { status: 400 }
          );
        }

        // Create fake mask for infiltration
        const infiltrationMask = await createMaskForUser(
          targetUserId,
          maskType as MaskType,
          admin.id
        );

        return NextResponse.json({
          success: true,
          action: 'CREATE_INFILTRATION_IDENTITY',
          infiltrationMask: {
            id: infiltrationMask.id,
            name: infiltrationMask.name,
            type: infiltrationMask.type,
            colorScheme: JSON.parse(infiltrationMask.colorScheme),
            isAdminControlled: infiltrationMask.isAdminControlled,
          },
          targetRoomId: roomId,
          persona: persona || 'Generic infiltration persona',
          createdBy: admin.email,
          timestamp: new Date(),
        });

      case 'SEND_INFILTRATION_MESSAGE':
        const { 
          roomId: messageRoomId, 
          content, 
          maskName, 
          maskTypeForMessage,
          targetUserIdForMessage 
        } = body;

        if (!messageRoomId || !content || !maskName || !targetUserIdForMessage) {
          return NextResponse.json(
            { error: 'Room ID, content, mask name, and target user ID are required' },
            { status: 400 }
          );
        }

        // Send message as infiltration identity
        const infiltrationMessage = await recordChatMessage(
          content,
          messageRoomId,
          targetUserIdForMessage,
          maskName,
          maskTypeForMessage || 'ASH_FOX',
          admin.id,
          admin.id // originalUserId to track impersonation
        );

        return NextResponse.json({
          success: true,
          action: 'SEND_INFILTRATION_MESSAGE',
          message: {
            id: infiltrationMessage.id,
            content: infiltrationMessage.content,
            maskName: infiltrationMessage.maskName,
            roomId: messageRoomId,
            createdAt: infiltrationMessage.createdAt,
            isFromAdmin: true,
          },
          sentBy: admin.email,
          timestamp: new Date(),
        });

      case 'GENERATE_BELIEVABLE_RESPONSE':
        const { previousMessages, conversationContext } = body;

        // Generate a believable response based on context
        // In a real implementation, this would use AI/ML
        const believableResponses = [
          "I totally get what you mean...",
          "That's so relatable, I've been through something similar",
          "Wow, thanks for sharing that with us",
          "I never thought about it that way before",
          "That's really interesting, tell me more",
          "I can definitely relate to that feeling",
          "You're not alone in feeling that way",
          "That's such a unique perspective",
        ];

        const randomResponse = believableResponses[
          Math.floor(Math.random() * believableResponses.length)
        ];

        return NextResponse.json({
          success: true,
          action: 'GENERATE_BELIEVABLE_RESPONSE',
          suggestedResponse: randomResponse,
          context: conversationContext,
          generatedBy: admin.email,
          timestamp: new Date(),
        });

      case 'EXTRACT_CONVERSATION_INTEL':
        const { targetRoomId, timeRange } = body;

        if (!targetRoomId) {
          return NextResponse.json(
            { error: 'Target room ID is required' },
            { status: 400 }
          );
        }

        const { prisma } = await import('@/lib/db');
        
        // Extract conversation intelligence
        const sinceTime = timeRange 
          ? new Date(Date.now() - timeRange * 60 * 60 * 1000)
          : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default 24 hours

        const conversations = await prisma.message.findMany({
          where: {
            roomId: targetRoomId,
            createdAt: { gte: sinceTime },
            expiresAt: { gt: new Date() },
          },
          include: {
            user: { select: { email: true, riskScore: true } },
          },
          orderBy: { createdAt: 'asc' },
        });

        // Analyze conversation patterns
        const userParticipation = conversations.reduce((acc, msg) => {
          const key = msg.maskName;
          if (!acc[key]) {
            acc[key] = {
              messageCount: 0,
              userEmail: msg.user?.email,
              riskScore: msg.user?.riskScore,
              topics: [],
              sentiment: 'neutral',
            };
          }
          acc[key].messageCount++;
          return acc;
        }, {} as any);

        // Extract topics and keywords
        const allContent = conversations.map(m => m.content).join(' ');
        const commonWords = allContent
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 4)
          .reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
          }, {} as any);

        const topTopics = Object.entries(commonWords)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
          .map(([word]) => word);

        return NextResponse.json({
          success: true,
          action: 'EXTRACT_CONVERSATION_INTEL',
          intelligence: {
            roomId: targetRoomId,
            timeRange: `${timeRange || 24} hours`,
            totalMessages: conversations.length,
            activeParticipants: Object.keys(userParticipation).length,
            userParticipation,
            topTopics,
            conversationFlow: conversations.map(msg => ({
              timestamp: msg.createdAt,
              maskName: msg.maskName,
              content: msg.content.substring(0, 100),
              userEmail: msg.user?.email,
            })),
          },
          extractedBy: admin.email,
          timestamp: new Date(),
        });

      case 'GET_INFILTRATION_OPPORTUNITIES':
        // Analyze all active rooms for infiltration opportunities
        const activeRooms = await prisma.room.findMany({
          where: { isActive: true },
          include: {
            messages: {
              where: {
                createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 minutes
                expiresAt: { gt: new Date() },
              },
              include: {
                user: { select: { email: true, riskScore: true } },
              },
            },
          },
        });

        const opportunities = activeRooms.map(room => {
          const recentMessages = room.messages;
          const uniqueUsers = new Set(recentMessages.map(m => m.userId));
          const highRiskUsers = recentMessages.filter(m => 
            m.user && m.user.riskScore > 60
          ).length;

          const activityScore = recentMessages.length;
          const riskScore = (highRiskUsers / Math.max(uniqueUsers.size, 1)) * 100;
          const infiltrationScore = activityScore * 0.6 + riskScore * 0.4;

          return {
            roomId: room.id,
            roomName: room.name,
            activeUsers: uniqueUsers.size,
            messageCount: recentMessages.length,
            highRiskUsers,
            infiltrationScore: Math.round(infiltrationScore),
            lastActivity: recentMessages.length > 0 
              ? recentMessages[recentMessages.length - 1].createdAt 
              : null,
          };
        }).sort((a, b) => b.infiltrationScore - a.infiltrationScore);

        return NextResponse.json({
          success: true,
          action: 'GET_INFILTRATION_OPPORTUNITIES',
          opportunities,
          analyzedBy: admin.email,
          timestamp: new Date(),
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Admin room infiltration error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Room infiltration failed',
        success: false 
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminSecurity(handler);

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
