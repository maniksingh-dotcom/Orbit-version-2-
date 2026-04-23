'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface Props {
  customerId: string;
  onSync: () => void;
}

export default function FathomSyncButton({ customerId, onSync }: Props) {
  const [syncing, setSyncing] = useState(false);
  const { showToast } = useToast();

  const handleSync = async () => {
    setSyncing(true);

    try {
      const res = await fetch(`/api/fathom?customerId=${customerId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      showToast(`Synced ${data.synced} notes from Fathom`, 'success');
      onSync();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Fathom sync failed',
        'error'
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      className="btn btn-primary btn-sm"
      onClick={handleSync}
      disabled={syncing}
      style={{ gap: '0.5rem' }}
    >
      {syncing ? (
        <>
          <span style={{ animation: 'pulse-glow 1s infinite' }}>&#x21BB;</span>
          Syncing...
        </>
      ) : (
        <>&#x21BB; Sync from Fathom</>
      )}
    </button>
  );
}
