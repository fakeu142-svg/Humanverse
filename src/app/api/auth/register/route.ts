import { NextRequest, NextResponse } from 'next/server';
import { registerUser, generateDeviceFingerprint, isRateLimited, trackLoginAttempt } from '@/lib/auth';
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimited = await isRateLimited(ipAddress);
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate device fingerprint
    const deviceInfo = generateDeviceFingerprint(userAgent, ipAddress);

    // Register user
    const session = await registerUser({
      email,
      password,
      ipAddress,
      deviceInfo,
    });

    // Track successful registration
    await trackLoginAttempt(email, ipAddress, true);

    // Set HTTP-only cookie with token
    const response = NextResponse.json({
      success: true,
      user: session.user,
      message: 'Registration successful',
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
    console.error('Registration error:', error);

    // Track failed registration
    const body = await request.json().catch(() => ({}));
    if (body.email) {
      const headersList = headers();
      const forwardedFor = headersList.get('x-forwarded-for');
      const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
      await trackLoginAttempt(body.email, ipAddress, false);
    }

    return NextResponse.json(
      { 
        error: error.message || 'Registration failed',
        success: false 
      },
      { status: 400 }
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
