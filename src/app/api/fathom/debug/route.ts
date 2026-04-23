import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only allow admins to access this endpoint
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check environment variables
    const envCheck = {
      FATHOM_OAUTH_CLIENT_ID: {
        exists: !!process.env.FATHOM_OAUTH_CLIENT_ID,
        value: process.env.FATHOM_OAUTH_CLIENT_ID?.substring(0, 15) + '...',
        length: process.env.FATHOM_OAUTH_CLIENT_ID?.length || 0,
      },
      FATHOM_OAUTH_CLIENT_SECRET: {
        exists: !!process.env.FATHOM_OAUTH_CLIENT_SECRET,
        value: process.env.FATHOM_OAUTH_CLIENT_SECRET?.substring(0, 10) + '...',
        length: process.env.FATHOM_OAUTH_CLIENT_SECRET?.length || 0,
      },
      FATHOM_WEBHOOK_SECRET: {
        exists: !!process.env.FATHOM_WEBHOOK_SECRET,
        value: process.env.FATHOM_WEBHOOK_SECRET?.substring(0, 10) + '...',
        length: process.env.FATHOM_WEBHOOK_SECRET?.length || 0,
      },
      FATHOM_OAUTH_REDIRECT_URI: {
        exists: !!process.env.FATHOM_OAUTH_REDIRECT_URI,
        value: process.env.FATHOM_OAUTH_REDIRECT_URI,
      },
      DATABASE_URL: {
        exists: !!process.env.DATABASE_URL,
        value: process.env.DATABASE_URL?.substring(0, 30) + '...',
      },
    };

    // Check database connection
    let dbCheck = { connected: false, error: null, fathomAccountExists: false };
    try {
      await prisma.$connect();
      dbCheck.connected = true;

      // Check if FathomAccount table exists by trying to count
      const count = await prisma.fathomAccount.count();
      dbCheck.fathomAccountExists = true;
    } catch (error: any) {
      dbCheck.error = error.message;
    }

    // Check if user has Fathom account
    let userFathomAccount = null;
    try {
      userFathomAccount = await prisma.fathomAccount.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          scope: true,
          tokenType: true,
        },
      });
    } catch (error: any) {
      // Ignore error
    }

    // Test Fathom authorize URL
    const authorizeUrl = process.env.FATHOM_OAUTH_CLIENT_ID
      ? `https://fathom.video/external/v1/oauth2/authorize?client_id=${process.env.FATHOM_OAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.FATHOM_OAUTH_REDIRECT_URI || '')}&response_type=code&scope=public_api`
      : null;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      user: {
        id: session.user.id,
        email: session.user.email,
        role: user?.role,
      },
      environment: envCheck,
      database: dbCheck,
      fathomAccount: userFathomAccount ? {
        connected: true,
        createdAt: userFathomAccount.createdAt,
        expiresAt: userFathomAccount.expiresAt,
        scope: userFathomAccount.scope,
      } : {
        connected: false,
      },
      authorizeUrl,
      recommendations: getRecommendations(envCheck, dbCheck, userFathomAccount),
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug check failed',
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

function getRecommendations(envCheck: any, dbCheck: any, fathomAccount: any): string[] {
  const recommendations: string[] = [];

  if (!envCheck.FATHOM_OAUTH_CLIENT_ID.exists) {
    recommendations.push('❌ FATHOM_OAUTH_CLIENT_ID is missing. Add it to Vercel environment variables.');
  }

  if (!envCheck.FATHOM_OAUTH_CLIENT_SECRET.exists) {
    recommendations.push('❌ FATHOM_OAUTH_CLIENT_SECRET is missing. Add it to Vercel environment variables.');
  }

  if (!envCheck.FATHOM_WEBHOOK_SECRET.exists) {
    recommendations.push('❌ FATHOM_WEBHOOK_SECRET is missing. Add it to Vercel environment variables.');
  }

  if (!envCheck.FATHOM_OAUTH_REDIRECT_URI.exists) {
    recommendations.push('❌ FATHOM_OAUTH_REDIRECT_URI is missing. Add it to Vercel environment variables.');
  }

  if (!dbCheck.connected) {
    recommendations.push('❌ Database connection failed: ' + dbCheck.error);
  }

  if (!dbCheck.fathomAccountExists) {
    recommendations.push('❌ FathomAccount table does not exist. Run Prisma migrations.');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All checks passed! You can try connecting Fathom now.');
  }

  return recommendations;
}
