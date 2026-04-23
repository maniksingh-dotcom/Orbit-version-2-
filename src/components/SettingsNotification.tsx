'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

export default function SettingsNotification() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const fathomConnected = searchParams.get('fathom_connected');
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const detail = searchParams.get('detail');

    if (fathomConnected === 'true') {
      showToast('Fathom account connected successfully!', 'success');
      // Clear the query params and refresh the page to show updated connection status
      router.replace('/settings');
      router.refresh();
    } else if (error && message) {
      const errorMessage = getErrorMessage(message, detail);
      showToast(errorMessage, 'error');
      // Clear the query params
      router.replace('/settings');
    }
  }, [searchParams, router, showToast]);

  return null;
}

function getErrorMessage(message: string, detail: string | null): string {
  // Parse the error message and provide user-friendly text
  if (message.startsWith('token_failed_')) {
    const statusCode = message.replace('token_failed_', '');
    if (statusCode === '400') {
      return `OAuth failed: Invalid request. ${detail ? `(${detail})` : 'Check your Fathom OAuth configuration.'}`;
    }
    if (statusCode === '401') {
      return `OAuth failed: Invalid credentials. ${detail ? `(${detail})` : 'Check FATHOM_WEBHOOK_SECRET in Vercel.'}`;
    }
    if (statusCode === '403') {
      return `OAuth failed: Access denied. ${detail ? `(${detail})` : 'Check your Fathom OAuth app permissions.'}`;
    }
    return `OAuth failed (${statusCode}). ${detail || 'Check Vercel logs for details.'}`;
  }

  if (message === 'missing_env_vars') {
    return 'OAuth configuration missing. Check FATHOM_OAUTH_CLIENT_ID, FATHOM_WEBHOOK_SECRET, and FATHOM_OAUTH_REDIRECT_URI in Vercel.';
  }

  if (message === 'no_authorization_code') {
    return 'No authorization code received from Fathom. Please try again.';
  }

  if (message === 'no_access_token') {
    return 'No access token received. Check Vercel logs for details.';
  }

  if (message === 'database_error') {
    return `Database error: ${detail || 'Could not save Fathom connection'}. Check if migrations are applied.`;
  }

  if (message === 'server_error') {
    return `Server error: ${detail || 'Unknown error occurred'}. Check Vercel logs.`;
  }

  if (message.startsWith('fathom_error_')) {
    const fathomError = message.replace('fathom_error_', '');
    return `Fathom returned error: ${fathomError}`;
  }

  // Fallback
  return detail || 'Failed to connect Fathom. Check Vercel logs for details.';
}
