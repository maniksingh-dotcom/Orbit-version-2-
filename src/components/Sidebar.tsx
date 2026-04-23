'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { useRole } from '@/hooks/useRole';
import NotificationBell from './NotificationBell';
import CompanySwitcher from './CompanySwitcher';
import styles from './Sidebar.module.css';

/* ── Inline SVG Icons ──────────────────────────────────────── */
const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const PeopleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4"/>
    <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
    <path d="M21 21v-2a4 4 0 00-3-3.87"/>
  </svg>
);

const MeetingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <path d="M9 16l2 2 4-4"/>
  </svg>
);

const TasksIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
    <path d="M3 17l2 2 4-4"/>
    <line x1="5" y1="21" x2="5" y2="14"/>
  </svg>
);

const TeamIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="17" cy="7" r="3"/>
    <circle cx="7" cy="7" r="3"/>
    <path d="M1 21v-2a4 4 0 014-4h4"/>
    <path d="M23 21v-2a4 4 0 00-4-4h-4a4 4 0 00-4 4v2"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const ReportsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/>
    <path d="M9 21V9"/>
    <rect x="13" y="13" width="3" height="5" rx="0.5" fill="currentColor" stroke="none"/>
    <rect x="7" y="11" width="3" height="7" rx="0.5" fill="currentColor" stroke="none" opacity="0.5"/>
  </svg>
);

const SuccessIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const CompaniesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
);

const LeadsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);

const PipelineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="18" rx="1"/>
    <rect x="10" y="7" width="5" height="14" rx="1"/>
    <rect x="17" y="11" width="4" height="10" rx="1"/>
  </svg>
);

const IntelligenceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a6 6 0 016 6c0 2.5-1.5 4.5-3.5 5.5V16H9.5v-2.5C7.5 12.5 6 10.5 6 8a6 6 0 016-6z"/>
    <line x1="9.5" y1="19" x2="14.5" y2="19"/>
    <line x1="10.5" y1="22" x2="13.5" y2="22"/>
  </svg>
);

const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 300ms ease-out' }}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const SignOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ── Nav Item ──────────────────────────────────────────────── */
interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active: boolean;
}

function NavItem({ href, icon, label, collapsed, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
      title={collapsed ? label : undefined}
    >
      <span className={styles.navIcon}>{icon}</span>
      <span className={`${styles.navLabel} ${collapsed ? styles.navLabelHidden : ''}`}>{label}</span>
      {collapsed && <span className={styles.tooltip}>{label}</span>}
    </Link>
  );
}

/* ── Sidebar ───────────────────────────────────────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { role, isAdmin } = useRole();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Persist collapse state + initialise CSS variable
  useEffect(() => {
    const saved = localStorage.getItem('orbit-sidebar-collapsed');
    if (saved === 'true') {
      setCollapsed(true);
      document.documentElement.style.setProperty('--current-sidebar-width', 'var(--sidebar-collapsed-width)');
    } else {
      document.documentElement.style.setProperty('--current-sidebar-width', 'var(--sidebar-width)');
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('orbit-sidebar-collapsed', String(next));
    document.documentElement.style.setProperty(
      '--current-sidebar-width',
      next ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
    );
  };

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const navLinks = [
    { href: '/',             icon: <HomeIcon />,          label: 'Home' },
    { href: '/customers',    icon: <PeopleIcon />,        label: 'People' },
    { href: '/leads',        icon: <LeadsIcon />,         label: 'Leads' },
    { href: '/pipeline',     icon: <PipelineIcon />,      label: 'Pipeline' },
    { href: '/meetings',     icon: <MeetingsIcon />,      label: 'Meetings' },
    { href: '/tasks',        icon: <TasksIcon />,         label: 'Tasks' },
    { href: '/intelligence', icon: <IntelligenceIcon />,  label: 'Intelligence' },
    { href: '/reports',      icon: <ReportsIcon />,       label: 'Reports' },
    { href: '/success',      icon: <SuccessIcon />,       label: 'Success' },
    { href: '/team',         icon: <TeamIcon />,          label: 'Team' },
    ...(isAdmin ? [
      { href: '/admin/companies', icon: <CompaniesIcon />, label: 'Companies' },
      { href: '/admin/users',     icon: <UsersIcon />,     label: 'Users' },
    ] : []),
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const firstName = session?.user?.name?.split(' ')[0] || '';
  const initials  = session?.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  if (!session?.user) return null;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Mobile scrim */}
      {mobileOpen && (
        <div className={styles.scrim} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>

        {/* Header */}
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoDot}>O</span>
            <span className={`${styles.logoText} ${collapsed ? styles.navLabelHidden : ''}`}>rbit.</span>
          </Link>
          <button
            className={styles.collapseBtn}
            onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        {/* Company Switcher */}
        <CompanySwitcher collapsed={collapsed} />

        {/* Navigation */}
        <nav className={styles.nav}>
          {navLinks.map(link => (
            <NavItem
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              collapsed={collapsed}
              active={isActive(link.href)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.footerActions}>
            <NotificationBell />
            <NavItem
              href="/settings"
              icon={<SettingsIcon />}
              label="Settings"
              collapsed={collapsed}
              active={isActive('/settings')}
            />
          </div>

          {/* User profile */}
          <div className={styles.userSection} ref={userMenuRef}>
            <button
              className={styles.userBtn}
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={collapsed ? session.user.name || '' : undefined}
            >
              {session.user.image ? (
                <img src={session.user.image} alt="" className={styles.avatar} />
              ) : (
                <div className={styles.avatarFallback}>{initials}</div>
              )}
              <div className={`${styles.userInfo} ${collapsed ? styles.navLabelHidden : ''}`}>
                <span className={styles.userName}>{firstName}</span>
                <span className={`badge badge-role-${role}`}>{role}</span>
              </div>
            </button>

            {showUserMenu && (
              <div className={styles.userMenu}>
                <div className={styles.userMenuHeader}>
                  <span className={styles.userMenuName}>{session.user.name}</span>
                  <span className={styles.userMenuEmail}>{session.user.email}</span>
                </div>
                <div className={styles.userMenuDivider} />
                <button
                  className={styles.userMenuItem}
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  <SignOutIcon />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
