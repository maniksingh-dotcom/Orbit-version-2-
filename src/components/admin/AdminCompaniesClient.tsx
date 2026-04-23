'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/admin/admin.module.css';

interface CompanyData {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: string;
  _count: { members: number; customers: number };
  members: { user: { id: string; name: string | null; image: string | null } }[];
}

export default function AdminCompaniesClient({
  companies: initial,
}: {
  companies: CompanyData[];
}) {
  const router = useRouter();
  const [companies, setCompanies] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const createCompany = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create company');
      }
      const company = await res.json();
      setCompanies((prev) => [company, ...prev]);
      setShowCreate(false);
      setNewName('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.adminPage}>
      <div className={styles.adminHeader}>
        <div>
          <h1 className="page-title">Companies</h1>
          <p className={styles.adminSubtitle}>
            {companies.length} tenant{companies.length !== 1 ? 's' : ''} &middot; Full workspace isolation
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setCreateError(''); }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ marginRight: 6 }}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Company
        </button>
      </div>

      {showCreate && (
        <div className={styles.createModal} onClick={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); setCreateError(''); } }}>
          <div className={styles.createModalBox}>
            <h3 className={styles.createModalTitle}>New Company</h3>
            <div>
              <input
                className="form-input"
                placeholder="Company name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createCompany();
                  if (e.key === 'Escape') { setShowCreate(false); setCreateError(''); }
                }}
                autoFocus
              />
              {createError && <p className={styles.errorText}>{createError}</p>}
            </div>
            <div className={styles.createModalActions}>
              <button
                className="btn btn-outline"
                onClick={() => { setShowCreate(false); setCreateError(''); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={createCompany}
                disabled={creating || !newName.trim()}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {companies.length === 0 ? (
        <div className="empty-state">
          <h3>No companies yet</h3>
          <p>Create your first company to get started with multi-tenant management.</p>
        </div>
      ) : (
        <div className={styles.companiesGrid}>
          {companies.map((co) => (
            <div
              key={co.id}
              className={styles.companyCard}
              onClick={() => router.push(`/admin/companies/${co.id}`)}
            >
              <div className={styles.companyCardHeader}>
                <div className={styles.companyLogo}>
                  {co.logoUrl ? (
                    <img
                      src={co.logoUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                    />
                  ) : (
                    <span className={styles.companyLogoLetter}>
                      {co.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className={styles.companyName}>{co.name}</div>
                  <div className={styles.companyMeta}>
                    Created{' '}
                    {new Date(co.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.companyStats}>
                <div className={styles.companyStat}>
                  <span className={styles.companyStatValue}>{co._count.members}</span>
                  <span className={styles.companyStatLabel}>members</span>
                </div>
                <div className={styles.companyStat}>
                  <span className={styles.companyStatValue}>{co._count.customers}</span>
                  <span className={styles.companyStatLabel}>contacts</span>
                </div>
              </div>

              <div className={styles.companyAvatars}>
                {co.members.slice(0, 5).map((m) => (
                  <div key={m.user.id} className={styles.memberAvatar} title={m.user.name || ''}>
                    {m.user.image ? (
                      <img
                        src={m.user.image}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      <span>{m.user.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                ))}
                {co._count.members > 5 && (
                  <div className={styles.memberAvatarMore}>+{co._count.members - 5}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
