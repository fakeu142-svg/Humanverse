import { NextRequest, NextResponse } from 'next/server';
import { loginUser, generateDeviceFingerprint, isRateLimited, trackLoginAttempt } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Get IP address and user agent
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 
                     headersList.get('x-real-ip') || 
                     request.ip || 
                     'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimited = await isRateLimited(ipAddress);
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate device fingerprint
    const deviceInfo = generateDeviceFingerprint(userAgent, ipAddress);

    // Handle demo credentials for testing
    if (email === 'demo@humanverse.com' && password === 'demo123') {
      const demoUser = {
        id: 'demo-user-123',
        email: 'demo@humanverse.com',
        isActive: true,
        registrationDate: new Date('2024-01-01'),
        lastLogin: new Date(),
        riskScore: 0.1,
      };

      const response = NextResponse.json({
        success: true,
        user: demoUser,
        message: 'Demo login successful',
      });

      // Set a demo token cookie
      response.cookies.set('auth-token', 'demo-token-123', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      return response;
    }

    // Attempt normal login
    const session = await loginUser({
      email,
      password,
      ipAddress,
      deviceInfo,
    });

    // Track successful login
    await trackLoginAttempt(email, ipAddress, true);

    // Set HTTP-only cookie with token
    const response = NextResponse.json({
      success: true,
      user: session.user,
      message: 'Login successful',
    });

    response.cookies.set('auth-token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Login error:', error);

    // Track failed login
    const body = await request.json().catch(() => ({}));
    if (body.email) {
      const headersList = headers();
      const forwardedFor = headersList.get('x-forwarded-for');
      const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
      await trackLoginAttempt(body.email, ipAddress, false);
    }

    return NextResponse.json(
      { 
        error: error.message || 'Login failed',
        success: false 
      },
      { status: 401 }
    );
  }
}

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
