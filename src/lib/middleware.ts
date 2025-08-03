import { NextRequest, NextResponse } from 'next/server';
import { 
  createRateLimitMiddleware, 
  getClientIP, 
  loginRateLimiter, 
  registerRateLimiter, 
  adminLoginRateLimiter,
  loginBruteForceProtector,
  adminBruteForceProtector,
  SECURITY_HEADERS,
  ADMIN_SECURITY_HEADERS 
} from './rateLimiting';

export interface SecurityOptions {
  rateLimiter?: 'login' | 'register' | 'admin' | 'api';
  bruteForceProtection?: 'login' | 'admin';
  requireHTTPS?: boolean;
  adminRoute?: boolean;
}

// Apply security middleware to API routes
export function withSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: SecurityOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const clientIP = getClientIP(request);
    
    // HTTPS enforcement in production
    if (options.requireHTTPS && process.env.NODE_ENV === 'production') {
      const proto = request.headers.get('x-forwarded-proto') || 'http';
      if (proto !== 'https') {
        return new NextResponse('HTTPS required', { status: 426 });
      }
    }

    // Rate limiting
    if (options.rateLimiter) {
      let limiter;
      switch (options.rateLimiter) {
        case 'login':
          limiter = createRateLimitMiddleware(loginRateLimiter);
          break;
        case 'register':
          limiter = createRateLimitMiddleware(registerRateLimiter);
          break;
        case 'admin':
          limiter = createRateLimitMiddleware(adminLoginRateLimiter);
          break;
        default:
          limiter = null;
      }

      if (limiter) {
        const rateLimitResult = limiter(clientIP);
        if (rateLimitResult.isLimited) {
          return new NextResponse(
            JSON.stringify({
              error: 'Too many requests',
              retryAfter: rateLimitResult.resetIn,
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': rateLimitResult.resetIn.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
                ...SECURITY_HEADERS,
              },
            }
          );
        }
      }
    }

    // Brute force protection
    if (options.bruteForceProtection) {
      let protector;
      switch (options.bruteForceProtection) {
        case 'login':
          protector = loginBruteForceProtector;
          break;
        case 'admin':
          protector = adminBruteForceProtector;
          break;
      }

      if (protector) {
        const blockInfo = protector.getBlockInfo(clientIP);
        if (blockInfo.isBlocked) {
          const remainingTime = blockInfo.blockedUntil 
            ? Math.ceil((blockInfo.blockedUntil - Date.now()) / 1000) 
            : 0;

          return new NextResponse(
            JSON.stringify({
              error: 'Account temporarily blocked due to too many failed attempts',
              blockedFor: remainingTime,
              attempts: blockInfo.attempts,
            }),
            {
              status: 423, // Locked
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': remainingTime.toString(),
                ...SECURITY_HEADERS,
              },
            }
          );
        }
      }
    }

    try {
      // Execute the handler
      const response = await handler(request);

      // Add security headers
      const headers = options.adminRoute ? ADMIN_SECURITY_HEADERS : SECURITY_HEADERS;
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;

    } catch (error) {
      console.error('API route error:', error);
      
      const errorResponse = new NextResponse(
        JSON.stringify({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? String(error) : 'Something went wrong',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...SECURITY_HEADERS,
          },
        }
      );

      return errorResponse;
    }
  };
}

// Specific middleware for authentication routes
export function withAuthSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: 'login' | 'register'
) {
  return withSecurity(handler, {
    rateLimiter: type,
    bruteForceProtection: type === 'login' ? 'login' : undefined,
    requireHTTPS: true,
  });
}

// Specific middleware for admin routes
export function withAdminSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return withSecurity(handler, {
    rateLimiter: 'admin',
    bruteForceProtection: 'admin',
    requireHTTPS: true,
    adminRoute: true,
  });
}

// IP whitelist for admin routes (if needed)
export function isIPWhitelisted(ip: string): boolean {
  const whitelist = process.env.ADMIN_IP_WHITELIST?.split(',') || [];
  
  if (whitelist.length === 0) {
    return true; // No whitelist configured, allow all
  }

  return whitelist.includes(ip);
}

// Device fingerprinting
export function generateDeviceFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const ip = getClientIP(request);

  // Create a simple fingerprint
  const fingerprint = Buffer.from(
    `${userAgent}:${acceptLanguage}:${acceptEncoding}:${ip}`
  ).toString('base64');

  return fingerprint;
}

// Suspicious activity detection
export function detectSuspiciousActivity(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = getClientIP(request);

  // Basic suspicious patterns
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /postman/i,
  ];

  // Check user agent
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }

  // Check for common attack IPs (this would be a more comprehensive list in production)
  const knownAttackIPs = ['127.0.0.1']; // Placeholder
  if (knownAttackIPs.includes(ip)) {
    return true;
  }

  return false;
}

// Log security events
export interface SecurityEvent {
  type: 'rate_limit' | 'brute_force' | 'suspicious_activity' | 'blocked_access';
  ip: string;
  userAgent?: string;
  timestamp: Date;
  details?: any;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private maxEvents = 10000;

  log(event: SecurityEvent): void {
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // In production, this would be sent to a proper logging service
    console.warn('Security Event:', event);
  }

  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  getEventsByIP(ip: string, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.ip === ip)
      .slice(-limit);
  }
}

export const securityLogger = new SecurityLogger();

// Validate request origin
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  if (!origin && !referer) {
    return false; // No origin information
  }

  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    'http://localhost:3000',
    'http://localhost:8080',
  ].filter(Boolean);

  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return true;
  }

  if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed))) {
    return true;
  }

  return false;
}
