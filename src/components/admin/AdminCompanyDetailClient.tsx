'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import styles from '@/app/admin/admin.module.css';

interface MemberUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

interface Member {
  id: string;
  companyId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: MemberUser;
}

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  pipelineStage: string;
  leadStatus: string;
  companyName: string | null;
  logoUrl: string | null;
  customerStage: string;
  healthScore: number | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

interface CompanyDetail {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt: string;
  members: Member[];
  pendingInvites: PendingInvite[];
  customers: CustomerRow[];
  _count: { members: number; customers: number };
}

type Tab = 'members' | 'contacts';

function getRoleBadgeClass(role: string): string {
  if (role === 'owner') return styles.roleBadgeOwner;
  if (role === 'admin') return styles.roleBadgeAdmin;
  return styles.roleBadgeMember;
}

function getLeadBadgeClass(status: string): string {
  if (status === 'hot') return styles.leadBadgeHot;
  if (status === 'warm') return styles.leadBadgeWarm;
  return styles.leadBadgeCold;
}

export default function AdminCompanyDetailClient({
  company: initial,
}: {
  company: CompanyDetail;
}) {
  const { showToast } = useToast();
  const [company, setCompany] = useState(initial);
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingPendingEmail, setRemovingPendingEmail] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Please enter an email address');
      showToast('Please enter an email address', 'error');
      return;
    }
    setInviting(true);
    setInviteError('');
    try {
      const res = await fetch(`/api/companies/${company.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add member');
      }
      const data = await res.json();
      if (data.pending) {
        // User not in Orbit yet — stored as pending invite
        setCompany((prev) => ({
          ...prev,
          pendingInvites: [
            ...prev.pendingInvites.filter(p => p.email !== data.email),
            { id: data.email, email: data.email, role: data.role, createdAt: new Date().toISOString() },
          ],
        }));
        setInviteEmail('');
        showToast(`Invite saved for ${data.email} — they'll be added when they sign in`, 'success');
      } else {
        const newMember: Member = data;
        setCompany((prev) => {
          const exists = prev.members.some((m) => m.userId === newMember.userId);
          if (exists) {
            return {
              ...prev,
              members: prev.members.map((m) =>
                m.userId === newMember.userId ? newMember : m
              ),
            };
          }
          return {
            ...prev,
            members: [...prev.members, newMember],
            _count: { ...prev._count, members: prev._count.members + 1 },
          };
        });
        setInviteEmail('');
        showToast('Member added successfully', 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setInviteError(msg);
      showToast(msg, 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleRemovePending = async (email: string) => {
    setRemovingPendingEmail(email);
    try {
      await fetch(`/api/companies/${company.id}/members/pending?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
      setCompany(prev => ({ ...prev, pendingInvites: prev.pendingInvites.filter(p => p.email !== email) }));
    } catch {
      showToast('Failed to cancel invite', 'error');
    } finally {
      setRemovingPendingEmail(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this member from the company?')) return;
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/companies/${company.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Failed to remove member');
      setCompany((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.userId !== userId),
        _count: { ...prev._count, members: Math.max(0, prev._count.members - 1) },
      }));
    } catch {
      alert('Failed to remove member. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className={styles.adminPage}>
      {/* Back navigation */}
      <Link href="/admin/companies" className={styles.backLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All Companies
      </Link>

      {/* Company header */}
      <div className={styles.detailHeader}>
        <div className={styles.detailLogo}>
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
            />
          ) : (
            <span className={styles.detailLogoLetter}>
              {company.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className={styles.detailInfo}>
          <div className={styles.detailName}>{company.name}</div>
          <div className={styles.detailStats}>
            <div className={styles.detailStat}>
              <span className={styles.detailStatValue}>{company._count.members}</span>
              <span className={styles.detailStatLabel}>Members</span>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.detailStatValue}>{company._count.customers}</span>
              <span className={styles.detailStatLabel}>Contacts</span>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.detailStatValue}>
                {new Date(company.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <span className={styles.detailStatLabel}>Created</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <button
          className={`tab${activeTab === 'members' ? ' active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
          <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            ({company._count.members})
          </span>
        </button>
        <button
          className={`tab${activeTab === 'contacts' ? ' active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          Contacts
          <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            ({company._count.customers})
          </span>
        </button>
      </div>

      {/* Members tab */}
      {activeTab === 'members' && (
        <div>
          {/* Invite form */}
          <div className={styles.inviteRow}>
            <input
              className={`form-input ${styles.inviteInput}`}
              type="email"
              placeholder="Add member by email address..."
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
            />
            <select
              className="form-input"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
              style={{ width: 'auto', minWidth: 100 }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className="btn btn-primary"
              onClick={handleInvite}
              disabled={inviting}
            >
              {inviting ? 'Adding…' : 'Add'}
            </button>
          </div>
          {inviteError && <p className={styles.errorText} style={{ marginTop: '-1rem', marginBottom: '1rem' }}>{inviteError}</p>}

          <div className={styles.tableCard}>
            {company.members.length === 0 ? (
              <div className={styles.tableEmpty}>No members yet. Add one using the form above.</div>
            ) : (
              <table className={styles.membersTable}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th style={{ textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {company.members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className={styles.memberRow}>
                          <div className={styles.memberRowAvatar}>
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
                          <div>
                            <div className={styles.memberRowName}>{m.user.name || 'Unknown'}</div>
                            <div className={styles.memberRowEmail}>{m.user.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.roleBadge} ${getRoleBadgeClass(m.role)}`}>
                          {m.role}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {m.role !== 'owner' && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRemove(m.userId)}
                            disabled={removingId === m.userId}
                          >
                            {removingId === m.userId ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {company.pendingInvites.map((p) => (
                    <tr key={p.email} style={{ opacity: 0.6 }}>
                      <td>
                        <div className={styles.memberRow}>
                          <div className={styles.memberRowAvatar} style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}>
                            <span>?</span>
                          </div>
                          <div>
                            <div className={styles.memberRowName} style={{ color: 'var(--text-muted)' }}>{p.email}</div>
                            <div className={styles.memberRowEmail} style={{ color: 'var(--accent-primary)', fontSize: '0.72rem' }}>Invite pending — awaiting sign-in</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.roleBadge} ${styles.roleBadgeMember}`} style={{ opacity: 0.6 }}>
                          {p.role}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemovePending(p.email)}
                          disabled={removingPendingEmail === p.email}
                        >
                          {removingPendingEmail === p.email ? 'Cancelling…' : 'Cancel'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Contacts tab */}
      {activeTab === 'contacts' && (
        <div className={styles.tableCard}>
          {company.customers.length === 0 ? (
            <div className={styles.tableEmpty}>
              No contacts assigned to this company yet.
            </div>
          ) : (
            <table className={styles.contactsTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Pipeline Stage</th>
                  <th>Lead Status</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {company.customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/customers/${c.id}`}
                        style={{ textDecoration: 'none' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={styles.contactName}>{c.name}</div>
                        {c.email && <div className={styles.contactEmail}>{c.email}</div>}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      {c.companyName || '—'}
                    </td>
                    <td>
                      <span className={styles.pipelineBadge}>
                        {c.pipelineStage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getLeadBadgeClass(c.leadStatus)}`}>
                        {c.leadStatus}
                      </span>
                    </td>
                    <td>
                      {c.healthScore !== null ? (
                        <span style={{
                          fontWeight: 600,
                          color: c.healthScore >= 70 ? 'var(--success)' : c.healthScore >= 40 ? 'var(--warning)' : 'var(--danger)',
                          fontSize: '0.875rem',
                        }}>
                          {c.healthScore}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
