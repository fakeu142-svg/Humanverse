import { PrismaClient, MaskType } from '@prisma/client';
import { logSurveillanceAction } from './adminSurveillance';

const prisma = new PrismaClient();

export interface MaskTypeConfig {
  type: MaskType;
  name: string;
  baseColor: string;
  icon: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  personality: string[];
}

export const MASK_TYPES: Record<MaskType, MaskTypeConfig> = {
  ASH_FOX: {
    type: 'ASH_FOX',
    name: 'Ash Fox',
    baseColor: '#8B4513',
    icon: '🦊',
    description: 'Cunning and adaptive, the Ash Fox navigates the shadows with ancient wisdom.',
    rarity: 'common',
    personality: ['cunning', 'adaptive', 'wise', 'elusive'],
  },
  VIOLET_CROW: {
    type: 'VIOLET_CROW',
    name: 'Violet Crow',
    baseColor: '#7C3AED',
    icon: '🐦‍⬛',
    description: 'Mysterious and observant, the Violet Crow sees truth in darkness.',
    rarity: 'uncommon',
    personality: ['mysterious', 'observant', 'intelligent', 'prophetic'],
  },
  ECHO_DUST: {
    type: 'ECHO_DUST',
    name: 'Echo Dust',
    baseColor: '#6B7280',
    icon: '💫',
    description: 'Ethereal and fleeting, Echo Dust whispers secrets across dimensions.',
    rarity: 'rare',
    personality: ['ethereal', 'mysterious', 'fleeting', 'transcendent'],
  },
  IRON_SAGE: {
    type: 'IRON_SAGE',
    name: 'Iron Sage',
    baseColor: '#374151',
    icon: '⚔️',
    description: 'Wise and steadfast, the Iron Sage stands as guardian of ancient knowledge.',
    rarity: 'epic',
    personality: ['wise', 'steadfast', 'protective', 'ancient'],
  },
  GHOST_WIND: {
    type: 'GHOST_WIND',
    name: 'Ghost Wind',
    baseColor: '#E5E7EB',
    icon: '🌪️',
    description: 'Elusive and free, Ghost Wind moves unseen through all realms.',
    rarity: 'legendary',
    personality: ['elusive', 'free', 'unpredictable', 'boundless'],
  },
};

export interface MaskIdentity {
  id: string;
  name: string;
  type: MaskType;
  colorScheme: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date | null;
  streakCount: number;
  isAdminControlled: boolean;
  realUserEmail?: string; // For admin surveillance
}

/**
 * Generate a unique mask name with type prefix and random number
 */
export function generateMaskName(maskType: MaskType): string {
  const typeConfig = MASK_TYPES[maskType];
  const typeName = typeConfig.name.replace(' ', '');
  const randomNumber = Math.floor(Math.random() * 999) + 1;
  
  return `${typeName}_${randomNumber.toString().padStart(3, '0')}`;
}

/**
 * Generate color scheme variations for mask
 */
export function generateMaskColorScheme(maskType: MaskType): string {
  const baseColor = MASK_TYPES[maskType].baseColor;
  
  // Generate variations based on base color
  const variations = [
    baseColor,
    adjustBrightness(baseColor, 20),
    adjustBrightness(baseColor, -20),
    adjustSaturation(baseColor, 15),
    adjustSaturation(baseColor, -15),
  ];

  return JSON.stringify({
    primary: baseColor,
    secondary: variations[1],
    accent: variations[3],
    variants: variations,
  });
}

/**
 * Create a new mask for user with surveillance tracking
 */
export async function createMaskForUser(
  userId: string,
  maskType: MaskType,
  adminId?: string
): Promise<MaskIdentity> {
  try {
    // Check if user already has an active mask
    const existingMask = await prisma.mask.findFirst({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
    });

    if (existingMask && !adminId) {
      throw new Error('User already has an active mask');
    }

    // Generate mask details
    const maskName = generateMaskName(maskType);
    const colorScheme = generateMaskColorScheme(maskType);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Create mask
    const mask = await prisma.mask.create({
      data: {
        name: maskName,
        type: maskType,
        colorScheme,
        userId,
        expiresAt,
        streakCount: 0,
        isAdminControlled: !!adminId,
      },
    });

    // Get user email for surveillance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Log mask creation for surveillance
    await logSurveillanceAction({
      adminId: adminId || 'system',
      action: 'MASK_CREATED',
      targetUserId: userId,
      data: {
        maskId: mask.id,
        maskName: mask.name,
        maskType: mask.type,
        expiresAt: mask.expiresAt,
        isAdminControlled: mask.isAdminControlled,
      },
      ipAddress: 'system',
    });

    return {
      id: mask.id,
      name: mask.name,
      type: mask.type,
      colorScheme: mask.colorScheme,
      userId: mask.userId,
      createdAt: mask.createdAt,
      expiresAt: mask.expiresAt,
      streakCount: mask.streakCount,
      isAdminControlled: mask.isAdminControlled,
      realUserEmail: user?.email,
    };
  } catch (error) {
    console.error('Failed to create mask:', error);
    throw new Error('Mask creation failed');
  }
}

/**
 * Get user's current active mask
 */
export async function getUserActiveMask(userId: string): Promise<MaskIdentity | null> {
  try {
    const mask = await prisma.mask.findFirst({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        user: {
          select: { email: true }
        }
      },
    });

    if (!mask) return null;

    return {
      id: mask.id,
      name: mask.name,
      type: mask.type,
      colorScheme: mask.colorScheme,
      userId: mask.userId,
      createdAt: mask.createdAt,
      expiresAt: mask.expiresAt,
      streakCount: mask.streakCount,
      isAdminControlled: mask.isAdminControlled,
      realUserEmail: mask.user.email,
    };
  } catch (error) {
    console.error('Failed to get user mask:', error);
    return null;
  }
}

/**
 * Renew mask expiry and increment streak
 */
export async function renewMask(
  maskId: string,
  userId: string,
  adminId?: string
): Promise<MaskIdentity> {
  try {
    // Verify mask ownership
    const existingMask = await prisma.mask.findFirst({
      where: {
        id: maskId,
        userId: adminId ? undefined : userId, // Admin can renew any mask
      },
      include: {
        user: {
          select: { email: true }
        }
      },
    });

    if (!existingMask) {
      throw new Error('Mask not found or access denied');
    }

    // Calculate new expiry (48 hours from now)
    const newExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    
    // Update mask
    const updatedMask = await prisma.mask.update({
      where: { id: maskId },
      data: {
        expiresAt: newExpiresAt,
        streakCount: existingMask.streakCount + 1,
      },
    });

    // Log renewal for surveillance
    await logSurveillanceAction({
      adminId: adminId || 'system',
      action: 'MASK_RENEWED',
      targetUserId: existingMask.userId,
      data: {
        maskId: maskId,
        maskName: existingMask.name,
        newExpiresAt,
        streakCount: updatedMask.streakCount,
        renewedBy: adminId ? 'admin' : 'user',
      },
      ipAddress: 'system',
    });

    return {
      id: updatedMask.id,
      name: updatedMask.name,
      type: updatedMask.type,
      colorScheme: updatedMask.colorScheme,
      userId: updatedMask.userId,
      createdAt: updatedMask.createdAt,
      expiresAt: updatedMask.expiresAt,
      streakCount: updatedMask.streakCount,
      isAdminControlled: updatedMask.isAdminControlled,
      realUserEmail: existingMask.user.email,
    };
  } catch (error) {
    console.error('Failed to renew mask:', error);
    throw new Error('Mask renewal failed');
  }
}

/**
 * Get all available mask types for selection
 */
export function getAvailableMaskTypes(): MaskTypeConfig[] {
  return Object.values(MASK_TYPES);
}

/**
 * Admin function: Reveal real user behind any mask
 */
export async function revealMaskUser(
  maskName: string,
  adminId: string
): Promise<{ maskId: string; userId: string; userEmail: string; maskDetails: any } | null> {
  try {
    const mask = await prisma.mask.findFirst({
      where: { name: maskName },
      include: {
        user: {
          select: { 
            id: true, 
            email: true, 
            ipAddress: true,
            riskScore: true,
            lastLogin: true 
          }
        }
      },
    });

    if (!mask) return null;

    // Log admin surveillance action
    await logSurveillanceAction({
      adminId,
      action: 'MASK_IDENTITY_REVEALED',
      targetUserId: mask.userId,
      data: {
        maskId: mask.id,
        maskName: mask.name,
        revealedUser: mask.user.email,
        userDetails: {
          ipAddress: mask.user.ipAddress,
          riskScore: mask.user.riskScore,
          lastLogin: mask.user.lastLogin,
        },
      },
      ipAddress: 'admin-surveillance',
    });

    return {
      maskId: mask.id,
      userId: mask.user.id,
      userEmail: mask.user.email,
      maskDetails: {
        name: mask.name,
        type: mask.type,
        createdAt: mask.createdAt,
        expiresAt: mask.expiresAt,
        streakCount: mask.streakCount,
        isAdminControlled: mask.isAdminControlled,
        userInfo: mask.user,
      },
    };
  } catch (error) {
    console.error('Failed to reveal mask user:', error);
    throw new Error('Mask revelation failed');
  }
}

/**
 * Admin function: Get comprehensive mask surveillance data
 */
export async function getMaskSurveillanceData(adminId: string): Promise<any> {
  try {
    const [
      activeMasks,
      recentMaskActivities,
      maskStats,
      suspiciousMasks,
    ] = await Promise.all([
      // Active masks with user info
      prisma.mask.findMany({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              ipAddress: true,
              riskScore: true,
              isActive: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Recent mask activities
      prisma.surveillanceLog.findMany({
        where: {
          action: {
            in: ['MASK_CREATED', 'MASK_RENEWED', 'MASK_IDENTITY_REVEALED']
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),

      // Mask statistics
      prisma.mask.groupBy({
        by: ['type'],
        _count: { type: true },
        _avg: { streakCount: true },
      }),

      // Suspicious masks (high activity, admin controlled, etc.)
      prisma.mask.findMany({
        where: {
          OR: [
            { isAdminControlled: true },
            { streakCount: { gt: 20 } },
          ]
        },
        include: {
          user: {
            select: {
              email: true,
              riskScore: true,
            }
          }
        },
      }),
    ]);

    // Log surveillance dashboard access
    await logSurveillanceAction({
      adminId,
      action: 'MASK_SURVEILLANCE_DASHBOARD_ACCESS',
      data: {
        activeMasksCount: activeMasks.length,
        suspiciousMasksCount: suspiciousMasks.length,
      },
      ipAddress: 'admin-dashboard',
    });

    return {
      activeMasks: activeMasks.map(mask => ({
        id: mask.id,
        name: mask.name,
        type: mask.type,
        userId: mask.user.id,
        userEmail: mask.user.email,
        userRiskScore: mask.user.riskScore,
        createdAt: mask.createdAt,
        expiresAt: mask.expiresAt,
        streakCount: mask.streakCount,
        isAdminControlled: mask.isAdminControlled,
      })),
      recentActivities: recentMaskActivities,
      statistics: {
        totalActive: activeMasks.length,
        byType: maskStats,
        suspicious: suspiciousMasks.length,
      },
      suspiciousMasks,
    };
  } catch (error) {
    console.error('Failed to get mask surveillance data:', error);
    throw new Error('Mask surveillance data retrieval failed');
  }
}

/**
 * Track mask usage patterns for behavioral analysis
 */
export async function trackMaskUsage(
  maskName: string,
  action: string,
  context: any,
  adminId?: string
): Promise<void> {
  try {
    const mask = await prisma.mask.findFirst({
      where: { name: maskName },
      include: { user: true },
    });

    if (!mask) return;

    // Log mask usage for surveillance
    await logSurveillanceAction({
      adminId: adminId || 'system',
      action: 'MASK_USAGE_TRACKED',
      targetUserId: mask.userId,
      data: {
        maskId: mask.id,
        maskName: mask.name,
        usageAction: action,
        context,
        timestamp: new Date(),
      },
      ipAddress: 'mask-tracking',
    });

    // Update user risk score based on patterns
    await updateUserRiskFromMaskUsage(mask.userId, action, context);
  } catch (error) {
    console.error('Failed to track mask usage:', error);
  }
}

/**
 * Update user risk score based on mask usage patterns
 */
async function updateUserRiskFromMaskUsage(
  userId: string,
  action: string,
  context: any
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    let riskAdjustment = 0;

    // Risk scoring based on mask behavior
    switch (action) {
      case 'MASK_SWITCH_FREQUENT':
        riskAdjustment += 10; // Frequent mask switching is suspicious
        break;
      case 'MASK_LONG_STREAK':
        riskAdjustment -= 5; // Long streaks indicate stability
        break;
      case 'MASK_SUSPICIOUS_ACTIVITY':
        riskAdjustment += 20; // Direct suspicious activity
        break;
      case 'MASK_NORMAL_USAGE':
        riskAdjustment -= 1; // Normal usage slightly reduces risk
        break;
    }

    if (riskAdjustment !== 0) {
      const newRiskScore = Math.max(0, Math.min(100, user.riskScore + riskAdjustment));
      
      await prisma.user.update({
        where: { id: userId },
        data: { riskScore: newRiskScore },
      });
    }
  } catch (error) {
    console.error('Failed to update user risk from mask usage:', error);
  }
}

/**
 * Utility functions for color manipulation
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const adjust = (color: number) => {
    const adjusted = color + (color * percent / 100);
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };

  return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
}

function adjustSaturation(hex: string, percent: number): string {
  // Simple saturation adjustment (would be more complex in a real implementation)
  return adjustBrightness(hex, percent / 2);
}
