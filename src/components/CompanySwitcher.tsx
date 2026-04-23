'use client';

import { useState, useRef, useEffect } from 'react';
import { useCompany, CompanyStub } from '@/contexts/CompanyContext';
import styles from './CompanySwitcher.module.css';

function CompanyLetter({ name, logoUrl, size = 28 }: { name: string; logoUrl?: string | null; size?: number }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        style={{ width: size, height: size, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div className={styles.companyLetter} style={{ width: size, height: size, fontSize: size * 0.44 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function CompanySwitcher({ collapsed }: { collapsed: boolean }) {
  const { companies, activeCompany, setActiveCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click — must be declared before any early return
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Only show if user has companies
  if (companies.length === 0) return null;

  const toggle = () => setOpen(o => !o);

  const select = (c: CompanyStub) => {
    setActiveCompany(c);
    setOpen(false);
  };

  const displayName = activeCompany?.name ?? 'No Company';

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={`${styles.trigger} ${collapsed ? styles.triggerCollapsed : ''}`}
        onClick={toggle}
        title={collapsed ? displayName : undefined}
      >
        <CompanyLetter name={displayName} logoUrl={activeCompany?.logoUrl} size={26} />
        {!collapsed && (
          <>
            <span className={styles.triggerName}>{displayName}</span>
            <svg
              className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
              width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          ref={dropRef}
          className={styles.dropdown}
          style={collapsed ? { left: 56 } : undefined}
        >
          <div className={styles.dropdownHeader}>Workspaces</div>
          {companies.map(c => {
            const isActive = c.id === activeCompany?.id;
            return (
              <button
                key={c.id}
                className={`${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ''}`}
                onClick={() => select(c)}
              >
                <CompanyLetter name={c.name} logoUrl={c.logoUrl} size={24} />
                <span className={styles.dropdownItemName}>{c.name}</span>
                {isActive && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--accent-primary)' }}>
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
