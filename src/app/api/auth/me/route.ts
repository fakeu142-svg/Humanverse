import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or header
    const cookieStore = cookies();
    const tokenFromCookie = cookieStore.get('auth-token')?.value;
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Validate session
    const user = await validateUserSession(token);

    if (!user) {
      // Clear invalid cookie
      const response = NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );

      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (error: any) {
    console.error('Session validation error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Session validation failed',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
