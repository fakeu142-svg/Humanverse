import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { logSurveillanceAction } from './adminSurveillance';

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret';
const ADMIN_SESSION_TIMEOUT = parseInt(process.env.ADMIN_SESSION_TIMEOUT || '3600'); // 1 hour default

export interface AdminLoginCredentials {
  email: string;
  password: string;
  ipAddress: string;
  deviceInfo: any;
}

export interface AuthAdmin {
  id: string;
  email: string;
  role: AdminRole;
  permissions: any;
  isActive: boolean;
  lastLogin: Date | null;
}

export interface AdminSession {
  token: string;
  admin: AuthAdmin;
  expiresAt: Date;
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
  SURVEILLANCE = 'SURVEILLANCE',
  TECHNICAL = 'TECHNICAL'
}

export interface AdminPermissions {
  surveillance: boolean;
  userManagement: boolean;
  contentModeration: boolean;
  systemSettings: boolean;
  impersonation: boolean;
  dataExport: boolean;
  userCreation: boolean;
  adminManagement: boolean;
}

/**
 * Default permissions by role
 */
const ROLE_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  [AdminRole.SUPER_ADMIN]: {
    surveillance: true,
    userManagement: true,
    contentModeration: true,
    systemSettings: true,
    impersonation: true,
    dataExport: true,
    userCreation: true,
    adminManagement: true,
  },
  [AdminRole.MODERATOR]: {
    surveillance: true,
    userManagement: true,
    contentModeration: true,
    systemSettings: false,
    impersonation: false,
    dataExport: false,
    userCreation: false,
    adminManagement: false,
  },
  [AdminRole.SURVEILLANCE]: {
    surveillance: true,
    userManagement: false,
    contentModeration: false,
    systemSettings: false,
    impersonation: true,
    dataExport: true,
    userCreation: false,
    adminManagement: false,
  },
  [AdminRole.TECHNICAL]: {
    surveillance: false,
    userManagement: false,
    contentModeration: false,
    systemSettings: true,
    impersonation: false,
    dataExport: false,
    userCreation: false,
    adminManagement: false,
  },
};

/**
 * Generate admin JWT token with enhanced security
 */
export function generateAdminToken(adminId: string, sessionId: string, role: AdminRole): string {
  return jwt.sign(
    {
      adminId,
      sessionId,
      role,
      type: 'admin',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: ADMIN_SESSION_TIMEOUT }
  );
}

/**
 * Verify admin JWT token
 */
export function verifyAdminToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Login admin with comprehensive logging
 */
export async function loginAdmin(credentials: AdminLoginCredentials): Promise<AdminSession> {
  try {
    // Check if surveillance mode is enabled
    if (process.env.SURVEILLANCE_MODE !== 'true') {
      throw new Error('Admin access disabled');
    }

    // Find admin by email
    const admin = await prisma.adminUser.findUnique({
      where: { email: credentials.email.toLowerCase() }
    });

    if (!admin || !admin.isActive) {
      // Log failed attempt
      await logFailedAdminLogin(credentials.email, credentials.ipAddress, 'User not found or inactive');
      throw new Error('Invalid admin credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(credentials.password, admin.passwordHash);
    if (!isValidPassword) {
      // Log failed attempt
      await logFailedAdminLogin(credentials.email, credentials.ipAddress, 'Invalid password');
      throw new Error('Invalid admin credentials');
    }

    // Check IP restrictions (if configured)
    const isAllowedIP = await checkIPRestrictions(credentials.ipAddress, admin.id);
    if (!isAllowedIP) {
      await logFailedAdminLogin(credentials.email, credentials.ipAddress, 'IP not allowed');
      throw new Error('Access denied from this IP');
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Create admin session
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TIMEOUT * 1000);
    const sessionData = {
      adminId: admin.id,
      token: '', // Will be updated below
      ipAddress: credentials.ipAddress,
      deviceInfo: credentials.deviceInfo,
      expiresAt,
      isAdminSession: true,
    };

    // Note: We'll create a special admin session record
    const session = await prisma.userSession.create({
      data: {
        ...sessionData,
        userId: admin.id, // Reusing user session table for simplicity
      },
    });

    // Generate token
    const token = generateAdminToken(admin.id, session.id, admin.role as AdminRole);
    
    // Update session with token
    await prisma.userSession.update({
      where: { id: session.id },
      data: { token },
    });

    // Log successful admin login
    await logSurveillanceAction({
      adminId: admin.id,
      action: 'ADMIN_LOGIN',
      data: {
        email: admin.email,
        role: admin.role,
        ipAddress: credentials.ipAddress,
        deviceInfo: credentials.deviceInfo,
      },
      ipAddress: credentials.ipAddress,
    });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role as AdminRole,
        permissions: admin.permissions as AdminPermissions,
        isActive: admin.isActive,
        lastLogin: new Date(),
      },
      expiresAt,
    };
  } catch (error) {
    console.error('Admin login failed:', error);
    throw error;
  }
}

/**
 * Validate admin session with role verification
 */
export async function validateAdminSession(token: string): Promise<AuthAdmin | null> {
  try {
    // Verify JWT token
    const decoded = verifyAdminToken(token);
    if (!decoded || decoded.type !== 'admin') {
      return null;
    }

    // Check session in database
    const session = await prisma.userSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date() || !session.isAdminSession) {
      return null;
    }

    // Get admin details
    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.adminId },
    });

    if (!admin || !admin.isActive) {
      return null;
    }

    return {
      id: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
      permissions: admin.permissions as AdminPermissions,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
    };
  } catch (error) {
    console.error('Admin session validation failed:', error);
    return null;
  }
}

/**
 * Check admin permissions for specific action
 */
export function hasPermission(admin: AuthAdmin, permission: keyof AdminPermissions): boolean {
  if (admin.role === AdminRole.SUPER_ADMIN) {
    return true; // Super admin has all permissions
  }
  
  return admin.permissions[permission] === true;
}

/**
 * Logout admin and log action
 */
export async function logoutAdmin(token: string): Promise<void> {
  try {
    // Get admin info before logout
    const admin = await validateAdminSession(token);
    
    // Remove session
    await prisma.userSession.deleteMany({
      where: { token },
    });

    // Log logout
    if (admin) {
      await logSurveillanceAction({
        adminId: admin.id,
        action: 'ADMIN_LOGOUT',
        data: { email: admin.email },
        ipAddress: 'session-end',
      });
    }
  } catch (error) {
    console.error('Admin logout failed:', error);
  }
}

/**
 * Create new admin user (Super Admin only)
 */
export async function createAdminUser(
  creatorAdminId: string,
  adminData: {
    email: string;
    password: string;
    role: AdminRole;
    customPermissions?: Partial<AdminPermissions>;
  },
  ipAddress: string
): Promise<AuthAdmin> {
  try {
    // Verify creator is super admin
    const creator = await prisma.adminUser.findUnique({
      where: { id: creatorAdminId },
    });

    if (!creator || creator.role !== AdminRole.SUPER_ADMIN) {
      throw new Error('Insufficient permissions to create admin users');
    }

    // Check if admin already exists
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: adminData.email.toLowerCase() }
    });

    if (existingAdmin) {
      throw new Error('Admin user already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminData.password, 12);

    // Set permissions based on role or custom
    const permissions = adminData.customPermissions || ROLE_PERMISSIONS[adminData.role];

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        email: adminData.email.toLowerCase(),
        passwordHash,
        role: adminData.role,
        permissions,
        isActive: true,
      },
    });

    // Log admin creation
    await logSurveillanceAction({
      adminId: creatorAdminId,
      action: 'CREATE_ADMIN_USER',
      data: {
        newAdminId: admin.id,
        email: admin.email,
        role: admin.role,
        permissions,
      },
      ipAddress,
    });

    return {
      id: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
      permissions: admin.permissions as AdminPermissions,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
    };
  } catch (error) {
    console.error('Admin user creation failed:', error);
    throw error;
  }
}

/**
 * Update admin permissions
 */
export async function updateAdminPermissions(
  updaterAdminId: string,
  targetAdminId: string,
  newPermissions: Partial<AdminPermissions>,
  ipAddress: string
): Promise<void> {
  try {
    // Verify updater is super admin
    const updater = await prisma.adminUser.findUnique({
      where: { id: updaterAdminId },
    });

    if (!updater || updater.role !== AdminRole.SUPER_ADMIN) {
      throw new Error('Insufficient permissions to update admin permissions');
    }

    // Update permissions
    await prisma.adminUser.update({
      where: { id: targetAdminId },
      data: { permissions: newPermissions },
    });

    // Log permission update
    await logSurveillanceAction({
      adminId: updaterAdminId,
      action: 'UPDATE_ADMIN_PERMISSIONS',
      targetUserId: targetAdminId,
      data: { newPermissions },
      ipAddress,
    });
  } catch (error) {
    console.error('Admin permission update failed:', error);
    throw error;
  }
}

/**
 * Check IP restrictions for admin access
 */
async function checkIPRestrictions(ipAddress: string, adminId: string): Promise<boolean> {
  // In production, this would check against an IP whitelist
  // For now, allow all IPs
  return true;
}

/**
 * Log failed admin login attempt
 */
async function logFailedAdminLogin(email: string, ipAddress: string, reason: string): Promise<void> {
  try {
    // Log to admin actions table
    await prisma.adminAction.create({
      data: {
        adminId: 'system',
        action: 'FAILED_ADMIN_LOGIN',
        details: {
          email,
          reason,
          timestamp: new Date(),
        },
        timestamp: new Date(),
        ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to log admin login attempt:', error);
  }
}

/**
 * Get all admin users (Super Admin only)
 */
export async function getAllAdminUsers(requestingAdminId: string): Promise<AuthAdmin[]> {
  try {
    // Verify requesting admin is super admin
    const admin = await prisma.adminUser.findUnique({
      where: { id: requestingAdminId },
    });

    if (!admin || admin.role !== AdminRole.SUPER_ADMIN) {
      throw new Error('Insufficient permissions');
    }

    const admins = await prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: { email: 'asc' },
    });

    return admins.map(admin => ({
      id: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
      permissions: admin.permissions as AdminPermissions,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
    }));
  } catch (error) {
    console.error('Failed to get admin users:', error);
    throw error;
  }
}

/**
 * Deactivate admin user
 */
export async function deactivateAdminUser(
  requestingAdminId: string,
  targetAdminId: string,
  ipAddress: string
): Promise<void> {
  try {
    // Verify requesting admin is super admin
    const admin = await prisma.adminUser.findUnique({
      where: { id: requestingAdminId },
    });

    if (!admin || admin.role !== AdminRole.SUPER_ADMIN) {
      throw new Error('Insufficient permissions');
    }

    // Cannot deactivate self
    if (requestingAdminId === targetAdminId) {
      throw new Error('Cannot deactivate your own account');
    }

    // Deactivate admin
    await prisma.adminUser.update({
      where: { id: targetAdminId },
      data: { isActive: false },
    });

    // Invalidate all sessions for this admin
    await prisma.userSession.deleteMany({
      where: { userId: targetAdminId, isAdminSession: true },
    });

    // Log deactivation
    await logSurveillanceAction({
      adminId: requestingAdminId,
      action: 'DEACTIVATE_ADMIN_USER',
      targetUserId: targetAdminId,
      data: { reason: 'Admin deactivated by super admin' },
      ipAddress,
    });
  } catch (error) {
    console.error('Admin deactivation failed:', error);
    throw error;
  }
}
