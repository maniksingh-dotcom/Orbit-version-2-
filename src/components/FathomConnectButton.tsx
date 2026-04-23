'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FathomConnectButtonProps {
  isConnected: boolean;
}

export default function FathomConnectButton({ isConnected }: FathomConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Fetch the OAuth authorization URL from the backend
      // This ensures we use the correct client ID and redirect URI from env
      const response = await fetch('/api/fathom/authorize');
      const data = await response.json();

      if (data.authUrl) {
        // Generate a random state parameter for OAuth security
        const state = crypto.randomUUID();
        sessionStorage.setItem('fathom_oauth_state', state);

        // Redirect to Fathom OAuth authorization URL with state
        window.location.href = `${data.authUrl}&state=${state}`;
      } else {
        alert('Failed to get authorization URL. Please check Fathom OAuth configuration.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      alert('Failed to connect to Fathom. Please try again.');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Fathom account?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/fathom/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to disconnect Fathom account. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting Fathom:', error);
      alert('Failed to disconnect Fathom account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {isConnected ? (
        <>
          <button
            className="btn btn-outline"
            onClick={handleDisconnect}
            disabled={loading}
            style={{ fontSize: '0.875rem' }}
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Your Fathom meetings will automatically sync to Orbit
          </span>
        </>
      ) : (
        <>
          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={loading}
            style={{ fontSize: '0.875rem' }}
          >
            {loading ? 'Connecting...' : 'Connect Fathom'}
          </button>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Click to authorize Orbit to access your Fathom meetings
          </span>
        </>
      )}
    </div>
  );
}
