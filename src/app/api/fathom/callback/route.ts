import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Step 1: Check authentication
    console.log('[Fathom OAuth] Step 1: Checking user authentication');
    const session = await auth();
    if (!session?.user?.id) {
      console.error('[Fathom OAuth] No authenticated user found');
      return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
    }
    console.log('[Fathom OAuth] User authenticated:', session.user.id);

    // Step 2: Get OAuth parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('[Fathom OAuth] Step 2: OAuth parameters:', {
      has_code: !!code,
      has_state: !!state,
      error: error || 'none',
    });

    // Handle OAuth errors from Fathom
    if (error) {
      console.error('[Fathom OAuth] Fathom returned error:', error);
      return NextResponse.redirect(
        new URL(`/settings?error=fathom_oauth_failed&message=fathom_error_${error}`, request.url)
      );
    }

    // Validate authorization code
    if (!code) {
      console.error('[Fathom OAuth] No authorization code received');
      return NextResponse.redirect(
        new URL('/settings?error=fathom_oauth_failed&message=no_authorization_code', request.url)
      );
    }

    // Step 3: Verify environment variables
    console.log('[Fathom OAuth] Step 3: Verifying environment variables');
    const clientId = process.env.FATHOM_OAUTH_CLIENT_ID;
    const clientSecret = process.env.FATHOM_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.FATHOM_OAUTH_REDIRECT_URI;

    console.log('[Fathom OAuth] Environment check:', {
      has_client_id: !!clientId,
      client_id_prefix: clientId?.substring(0, 10),
      has_client_secret: !!clientSecret,
      client_secret_prefix: clientSecret?.substring(0, 10),
      redirect_uri: redirectUri,
    });

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('[Fathom OAuth] Missing environment variables:', {
        missing_client_id: !clientId,
        missing_client_secret: !clientSecret,
        missing_redirect_uri: !redirectUri,
      });
      return NextResponse.redirect(
        new URL('/settings?error=fathom_oauth_failed&message=missing_env_vars', request.url)
      );
    }

    // Step 4: Exchange authorization code for access token
    console.log('[Fathom OAuth] Step 4: Exchanging code for access token');

    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    console.log('[Fathom OAuth] Token request params:', {
      grant_type: 'authorization_code',
      client_id: clientId.substring(0, 15) + '...',
      client_secret: clientSecret.substring(0, 10) + '...',
      redirect_uri: redirectUri,
      code_length: code.length,
    });

    const tokenResponse = await fetch('https://fathom.video/external/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString(),
    });

    console.log('[Fathom OAuth] Token response status:', tokenResponse.status, tokenResponse.statusText);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Fathom OAuth] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
      });

      // Parse error if JSON
      let errorDetail = 'unknown';
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.error || errorJson.error_description || 'unknown';
      } catch {
        errorDetail = errorText.substring(0, 50);
      }

      return NextResponse.redirect(
        new URL(`/settings?error=fathom_oauth_failed&message=token_failed_${tokenResponse.status}&detail=${encodeURIComponent(errorDetail)}`, request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('[Fathom OAuth] Token received:', {
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    });

    if (!tokenData.access_token) {
      console.error('[Fathom OAuth] No access token in response:', tokenData);
      return NextResponse.redirect(
        new URL('/settings?error=fathom_oauth_failed&message=no_access_token', request.url)
      );
    }

    // Step 5: Calculate token expiry
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    console.log('[Fathom OAuth] Step 5: Saving token to database');

    // Step 6: Store token in database
    try {
      const fathomAccount = await prisma.fathomAccount.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt,
          scope: tokenData.scope || null,
          tokenType: tokenData.token_type || 'Bearer',
        },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt,
          scope: tokenData.scope || null,
          tokenType: tokenData.token_type || 'Bearer',
        },
      });

      console.log('[Fathom OAuth] Token saved successfully:', {
        fathomAccountId: fathomAccount.id,
        userId: session.user.id,
        expiresAt: expiresAt?.toISOString(),
      });
    } catch (dbError: any) {
      console.error('[Fathom OAuth] Database save failed:', {
        error: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
      });
      return NextResponse.redirect(
        new URL(`/settings?error=fathom_oauth_failed&message=database_error&detail=${encodeURIComponent(dbError.message)}`, request.url)
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Fathom OAuth] SUCCESS! Completed in ${duration}ms`);

    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL('/settings?fathom_connected=true', request.url)
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Fathom OAuth] FATAL ERROR after ${duration}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return NextResponse.redirect(
      new URL(`/settings?error=fathom_oauth_failed&message=server_error&detail=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
