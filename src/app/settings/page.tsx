import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import FathomConnectButton from '@/components/FathomConnectButton';
import SettingsNotification from '@/components/SettingsNotification';
import { Suspense } from 'react';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Check if user has connected their Fathom account
  const fathomAccount = await prisma.fathomAccount.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return (
    <main className="container" style={{ paddingTop: '2rem' }}>
      <Suspense fallback={null}>
        <SettingsNotification />
      </Suspense>
      <h1 className="page-title">Settings</h1>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.375rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Profile</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Name
            </label>
            <div style={{ fontSize: '1rem', marginTop: '0.25rem' }}>
              {session.user.name || 'Not set'}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Email
            </label>
            <div style={{ fontSize: '1rem', marginTop: '0.25rem' }}>
              {session.user.email}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.375rem', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>Integrations</h2>

        <div style={{
          padding: '1.25rem',
          background: 'var(--bg-surface-2)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Fathom
                {fathomAccount && (
                  <span className="badge" style={{
                    background: 'rgba(34, 197, 94, 0.12)',
                    color: 'var(--success)',
                    fontSize: '0.72rem',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                  }}>
                    Connected
                  </span>
                )}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Connect your Fathom account to automatically sync your meeting notes and transcripts.
                {fathomAccount && (
                  <>
                    <br />
                    <span style={{ fontSize: '0.8125rem' }}>
                      Connected on {new Date(fathomAccount.createdAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </p>
              <FathomConnectButton isConnected={!!fathomAccount} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
