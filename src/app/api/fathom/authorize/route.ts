import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.FATHOM_OAUTH_CLIENT_ID;
  const redirectUri = process.env.FATHOM_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Fathom OAuth not configured' },
      { status: 500 }
    );
  }

  // Build the authorization URL (without state - client will add it)
  const authUrl = `https://fathom.video/external/v1/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=public_api`;

  return NextResponse.json({ authUrl });
}
