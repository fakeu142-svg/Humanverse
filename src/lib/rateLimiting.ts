// Simple in-memory rate limiting for development
// In production, you should use Redis or similar

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      this.storage.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    if (entry.count >= this.maxRequests) {
      return true;
    }

    // Increment counter
    entry.count++;
    this.storage.set(identifier, entry);
    return false;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.storage.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.storage.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return entry.resetTime;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.resetTime) {
        this.storage.delete(key);
      }
    }
  }
}

// Different rate limiters for different actions
export const loginRateLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
export const registerRateLimiter = new RateLimiter(60 * 60 * 1000, 3); // 3 attempts per hour
export const adminLoginRateLimiter = new RateLimiter(15 * 60 * 1000, 3); // 3 attempts per 15 minutes
export const apiRateLimiter = new RateLimiter(1 * 60 * 1000, 60); // 60 requests per minute

// Cleanup interval - run every 15 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    loginRateLimiter.cleanup();
    registerRateLimiter.cleanup();
    adminLoginRateLimiter.cleanup();
    apiRateLimiter.cleanup();
  }, 15 * 60 * 1000);
}

// Rate limit middleware for API routes
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (identifier: string) => {
    const isLimited = limiter.isRateLimited(identifier);
    const remaining = limiter.getRemainingRequests(identifier);
    const resetTime = limiter.getResetTime(identifier);

    return {
      isLimited,
      remaining,
      resetTime,
      resetIn: resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 0,
    };
  };
}

// Get client IP address
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return 'unknown';
}

// Brute force protection
class BruteForceProtector {
  private attempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
  private maxAttempts: number;
  private blockDuration: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, blockDuration: number = 30 * 60 * 1000, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.blockDuration = blockDuration;
    this.windowMs = windowMs;
  }

  recordFailedAttempt(identifier: string): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now - record.lastAttempt > this.windowMs) {
      // First attempt or outside window
      this.attempts.set(identifier, {
        count: 1,
        lastAttempt: now,
      });
      return;
    }

    // Increment attempt count
    record.count++;
    record.lastAttempt = now;

    // Block if too many attempts
    if (record.count >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDuration;
    }

    this.attempts.set(identifier, record);
  }

  recordSuccessfulAttempt(identifier: string): void {
    // Clear attempts on successful login
    this.attempts.delete(identifier);
  }

  isBlocked(identifier: string): boolean {
    const record = this.attempts.get(identifier);
    if (!record || !record.blockedUntil) {
      return false;
    }

    const now = Date.now();
    if (now > record.blockedUntil) {
      // Block expired, clean up
      this.attempts.delete(identifier);
      return false;
    }

    return true;
  }

  getBlockInfo(identifier: string): { isBlocked: boolean; blockedUntil?: number; attempts: number } {
    const record = this.attempts.get(identifier);
    if (!record) {
      return { isBlocked: false, attempts: 0 };
    }

    const now = Date.now();
    const isBlocked = record.blockedUntil ? now < record.blockedUntil : false;

    if (record.blockedUntil && now > record.blockedUntil) {
      // Block expired
      this.attempts.delete(identifier);
      return { isBlocked: false, attempts: 0 };
    }

    return {
      isBlocked,
      blockedUntil: record.blockedUntil,
      attempts: record.count,
    };
  }
}

export const loginBruteForceProtector = new BruteForceProtector(5, 30 * 60 * 1000); // 5 attempts, 30 min block
export const adminBruteForceProtector = new BruteForceProtector(3, 60 * 60 * 1000); // 3 attempts, 60 min block

// Security headers
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Admin-specific security headers
export const ADMIN_SECURITY_HEADERS = {
  ...SECURITY_HEADERS,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0',
};
