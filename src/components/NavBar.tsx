'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import NotificationBell from './NotificationBell';

export default function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { role, isAdmin } = useRole();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/customers', label: 'People' },
    { href: '/leads', label: 'Leads' },
    { href: '/pipeline', label: 'Pipeline' },
    { href: '/meetings', label: 'Meetings' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/intelligence', label: 'Intelligence' },
    { href: '/team', label: 'Team' },
    ...(isAdmin ? [{ href: '/admin/users', label: 'Users' }] : []),
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="navbar">
      <div className="container nav-content">
        <Link href="/" className="logo">
          Orbit<span>.</span>
        </Link>
        <div className="nav-links">
          {session?.user && links.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                style={isActive ? { color: '#fff' } : undefined}
              >
                {link.label}
              </Link>
            );
          })}

          {session?.user ? (
            <>
            <NotificationBell />
            <div className="nav-user" ref={dropdownRef}>
              <button
                className="nav-user-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="nav-avatar"
                  />
                ) : (
                  <div className="nav-avatar nav-avatar-fallback">
                    {session.user.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <span className={`badge badge-role-${role}`}>{role}</span>
              </button>

              {showDropdown && (
                <div className="nav-dropdown">
                  <div className="nav-dropdown-header">
                    <span className="nav-dropdown-name">{session.user.name}</span>
                    <span className="nav-dropdown-email">{session.user.email}</span>
                  </div>
                  <div className="nav-dropdown-divider" />
                  <Link
                    href="/settings"
                    className="nav-dropdown-item"
                    onClick={() => setShowDropdown(false)}
                  >
                    Settings
                  </Link>
                  <button
                    className="nav-dropdown-item"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
