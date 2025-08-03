import { NextRequest, NextResponse } from 'next/server';
import { loginAdmin, validateAdminSession, logoutAdmin, generateDeviceFingerprint } from '@/lib/adminAuth';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, action } = body;

    // Get IP address and user agent
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : 
                     headersList.get('x-real-ip') || 
                     request.ip || 
                     'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    if (action === 'login') {
      // Validate input
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        );
      }

      // Generate device fingerprint
      const deviceInfo = generateDeviceFingerprint(userAgent, ipAddress);

      // Attempt admin login
      const session = await loginAdmin({
        email,
        password,
        ipAddress,
        deviceInfo,
      });

      // Set HTTP-only cookie with admin token
      const response = NextResponse.json({
        success: true,
        admin: session.admin,
        message: 'Admin login successful',
      });

      response.cookies.set('admin-token', session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseInt(process.env.ADMIN_SESSION_TIMEOUT || '3600'), // 1 hour default
        path: '/admin',
      });

      return response;

    } else if (action === 'logout') {
      const cookieStore = cookies();
      const token = cookieStore.get('admin-token')?.value;

      if (token) {
        await logoutAdmin(token);
      }

      // Clear cookie
      const response = NextResponse.json({
        success: true,
        message: 'Admin logout successful',
      });

      response.cookies.set('admin-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/admin',
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Admin auth error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Admin authentication failed',
        success: false 
      },
      { status: 401 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const cookieStore = cookies();
    const token = cookieStore.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No admin token provided' },
        { status: 401 }
      );
    }

    const admin = await validateAdminSession(token);

    if (!admin) {
      // Clear invalid cookie
      const response = NextResponse.json(
        { error: 'Invalid or expired admin session' },
        { status: 401 }
      );

      response.cookies.set('admin-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/admin',
      });

      return response;
    }

    return NextResponse.json({
      success: true,
      admin,
    });

  } catch (error: any) {
    console.error('Admin session validation error:', error);

    return NextResponse.json(
      { 
        error: error.message || 'Admin session validation failed',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
