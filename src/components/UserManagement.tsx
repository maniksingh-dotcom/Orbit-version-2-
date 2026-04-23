'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: string;
}

interface Props {
  users: User[];
  currentUserId: string;
}

export default function UserManagement({ users: initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const { showToast } = useToast();

  const updateRole = async (userId: string, role: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      showToast(`Role updated to ${role}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update role', 'error');
    }
  };

  return (
    <div className="notes-table">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '48px 1fr 1fr 140px 120px',
        gap: 'var(--space-md)',
        padding: '0.75rem var(--space-md)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-secondary)',
      }}>
        <div></div>
        <div>Name</div>
        <div>Email</div>
        <div style={{ textAlign: 'center' }}>Role</div>
        <div style={{ textAlign: 'center' }}>Joined</div>
      </div>

      {users.map((user) => (
        <div
          key={user.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 1fr 140px 120px',
            gap: 'var(--space-md)',
            padding: '0.75rem var(--space-md)',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div>
            {user.image ? (
              <img
                src={user.image}
                alt=""
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}>
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div>
            <span style={{ fontWeight: 500 }}>{user.name || 'Unknown'}</span>
            {user.id === currentUserId && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginLeft: '0.5rem' }}>
                (you)
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {user.email}
          </div>
          <div style={{ textAlign: 'center' }}>
            {user.id === currentUserId ? (
              <span className={`badge badge-role-${user.role}`}>{user.role}</span>
            ) : (
              <select
                className="form-select"
                value={user.role}
                onChange={(e) => updateRole(user.id, e.target.value)}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              >
                <option value="employee">employee</option>
                <option value="admin">admin</option>
              </select>
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {new Date(user.createdAt).toLocaleDateString('en-GB')}
          </div>
        </div>
      ))}
    </div>
  );
}
