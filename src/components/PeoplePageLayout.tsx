'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import styles from '@/app/customers/customers.module.css';
import CalendarPicker from './CalendarPicker';
import DealRiskBadge from './DealRiskBadge';

interface CustomerStub {
  id: string;
  name: string;
  companyName: string | null;
  logoUrl: string | null;
  customerType: string;
  country: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  pipelineStage: string;
  leadStatus: string;
  contactedVia: string;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  riskLevel: string | null;
  _count: { notes: number; documents: number };
}

interface PeoplePageLayoutProps {
  customers: CustomerStub[];
  canAddCustomer: boolean;
}


const LEAD_STATUSES = [
  { key: 'hot',           label: 'Hot',          color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    dot: '🔴' },
  { key: 'active',        label: 'Active',       color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    dot: '🟢' },
  { key: 'cold',          label: 'Cold',         color: '#64748b', bg: 'rgba(100,116,139,0.1)', dot: '🔵' },
  { key: 'not_interested',label: 'Not Interested',color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', dot: '⚫' },
];

const CONTACTED_VIA = [
  { key: '',          label: '—',            color: 'var(--text-muted)', bg: 'transparent' },
  { key: 'email',     label: 'Email',        color: '#6366f1',           bg: 'rgba(99,102,241,0.1)' },
  { key: 'phone',     label: 'Phone',        color: '#22c55e',           bg: 'rgba(34,197,94,0.1)' },
  { key: 'whatsapp',  label: 'WhatsApp',     color: '#16a34a',           bg: 'rgba(22,163,74,0.1)' },
  { key: 'fb',        label: 'FB Lead',      color: '#3b82f6',           bg: 'rgba(59,130,246,0.1)' },
  { key: 'insta',     label: 'Insta Lead',   color: '#ec4899',           bg: 'rgba(236,72,153,0.1)' },
  { key: 'website',   label: 'Website',      color: '#8b5cf6',           bg: 'rgba(139,92,246,0.1)' },
];

function formatLastContacted(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNextFollowUp(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dCopy = new Date(d);
  dCopy.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dCopy.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays}d`;
  if (diffDays < 30) return `In ${Math.floor(diffDays / 7)}w`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 12 && m === 0) return '—'; // noon = no explicit time set
  const h12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
}

function InlineBadge({
  value,
  options,
  onSelect,
  renderSelected,
}: {
  value: string;
  options: { key: string; label: string; color: string; bg: string }[];
  onSelect: (key: string) => void;
  renderSelected: (opt: { key: string; label: string; color: string; bg: string }) => React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setPos(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pos]);

  const current = options.find(o => o.key === value) || options[0];

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pos) { setPos(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  };

  return (
    <>
      <button ref={btnRef} className={styles.badgeBtn} onClick={toggle}>
        {renderSelected(current)}
      </button>
      {pos && (
        <div
          ref={dropRef}
          className={styles.inlineDropdown}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
        >
          {options.map(opt => (
            <button
              key={opt.key}
              className={`${styles.inlineDropdownItem} ${opt.key === value ? styles.inlineDropdownItemActive : ''}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(opt.key); setPos(null); }}
            >
              <span className={styles.pipelineBadge} style={{ color: opt.color, background: opt.bg }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default function PeoplePageLayout({ customers: initialCustomers, canAddCustomer }: PeoplePageLayoutProps) {
  const { showToast } = useToast();
  const { activeCompany } = useCompany();
  const { stages: pipelineStageConfigs } = usePipelineStages();
  const [customers, setCustomers] = useState(initialCustomers);

  const PIPELINE_STAGES = useMemo(() => pipelineStageConfigs.map(s => ({
    key: s.key,
    label: s.label,
    color: s.color,
    bg: s.color.startsWith('#') ? `${s.color}1a` : 'var(--bg-surface-2)',
  })), [pipelineStageConfigs]);

  // Refetch when active company changes
  useEffect(() => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (activeCompany?.id) headers['X-Company-Id'] = activeCompany.id;
    fetch('/api/customers', { headers })
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setCustomers(data as CustomerStub[]);
      })
      .catch(() => {});
  }, [activeCompany?.id]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterPipeline, setFilterPipeline] = useState<string>('all');
  const [filterLead, setFilterLead] = useState<string>('all');

  // Unified calendar state
  const [calendarState, setCalendarState] = useState<{
    customerId: string;
    field: 'lastContactedAt' | 'nextFollowUpAt';
    currentDate: string | null;
    pos: { top: number; left: number };
  } | null>(null);

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Inline add row
  const [addingRow, setAddingRow] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newPipeline, setNewPipeline] = useState('new');
  const [newLead, setNewLead] = useState('hot');
  const [newVia, setNewVia] = useState('');
  const [newLastContacted, setNewLastContacted] = useState('');
  const [newNextFollowUp, setNewNextFollowUp] = useState('');
  const [savingRow, setSavingRow] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingRow) setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [addingRow]);

  const updateStage = useCallback(async (id: string, patch: {
    pipelineStage?: string;
    leadStatus?: string;
    contactedVia?: string;
    lastContactedAt?: string | null;
    nextFollowUpAt?: string | null;
  }) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    try {
      await fetch(`/api/customers/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {
      setCustomers(initialCustomers);
    }
  }, [initialCustomers]);

  const openCalendar = (e: React.MouseEvent, customerId: string, field: 'lastContactedAt' | 'nextFollowUpAt', currentDate: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCalendarState({ customerId, field, currentDate, pos: { top: rect.bottom + 6, left: rect.left } });
  };

  const handleCalendarSelect = (isoDate: string) => {
    if (calendarState) {
      updateStage(calendarState.customerId, { [calendarState.field]: isoDate });
    }
    setCalendarState(null);
  };

  const deleteCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCustomers(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteId(null);
      showToast('Person deleted', 'success');
    } catch {
      showToast('Failed to delete', 'error');
      setConfirmDeleteId(null);
    }
  };

  const saveNewRow = async () => {
    if (!newName.trim()) return;
    setSavingRow(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (activeCompany?.id) headers['X-Company-Id'] = activeCompany.id;
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim() || null,
          phone: newPhone.trim() || null,
          country: newCountry.trim() || null,
          pipelineStage: newPipeline,
          leadStatus: newLead,
          contactedVia: newVia || '',
          lastContactedAt: newLastContacted ? new Date(newLastContacted).toISOString() : null,
          nextFollowUpAt: newNextFollowUp ? new Date(newNextFollowUp).toISOString() : null,
          companyId: activeCompany?.id || null,
        }),
      });
      if (!res.ok) throw new Error();
      const customer = await res.json();
      setCustomers(prev => [{ ...customer, _count: { notes: 0, documents: 0 } }, ...prev]);
      setAddingRow(false);
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewCountry('');
      setNewPipeline('new'); setNewLead('hot'); setNewVia('');
      setNewLastContacted(''); setNewNextFollowUp('');
      showToast('Person added', 'success');
    } catch {
      showToast('Failed to add person', 'error');
    } finally {
      setSavingRow(false);
    }
  };

  const cancelNewRow = () => {
    setAddingRow(false);
    setNewName(''); setNewEmail(''); setNewPhone(''); setNewCountry('');
    setNewPipeline('new'); setNewLead('hot'); setNewVia('');
    setNewLastContacted(''); setNewNextFollowUp('');
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };

  const filtered = customers
    .filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) ||
        (c.companyName?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false);
      const matchesPipeline = filterPipeline === 'all' || c.pipelineStage === filterPipeline;
      // Normalize leadStatus: if stored value isn't a valid key (e.g. old 'warm' default), fall back to first option
      const effectiveLead = LEAD_STATUSES.find(o => o.key === c.leadStatus)?.key ?? LEAD_STATUSES[0].key;
      const matchesLead = filterLead === 'all' || effectiveLead === filterLead;
      return matchesSearch && matchesPipeline && matchesLead;
    })
    .sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (sortCol === 'name') { va = a.name; vb = b.name; }
      else if (sortCol === 'pipeline') { va = a.pipelineStage; vb = b.pipelineStage; }
      else if (sortCol === 'lead') { va = a.leadStatus; vb = b.leadStatus; }
      else if (sortCol === 'email') { va = a.email || ''; vb = b.email || ''; }
      else if (sortCol === 'location') { va = a.country || ''; vb = b.country || ''; }
      else if (sortCol === 'lastContacted') {
        va = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
        vb = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
      } else if (sortCol === 'nextFollowUp') {
        va = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : Infinity;
        vb = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : Infinity;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ col }: { col: string }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={styles.sortIcon}>
      <path d="M5 1L8 4H2L5 1Z" fill={sortCol === col && sortDir === 'asc' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
      <path d="M5 9L2 6H8L5 9Z" fill={sortCol === col && sortDir === 'desc' ? 'var(--accent-primary)' : 'var(--text-muted)'} />
    </svg>
  );

  return (
    <div className={styles.tablePageWrap}>
      {/* Header */}
      <div className={styles.tablePageHeader}>
        <div className={styles.tablePageTitle}>
          <h1 className="page-title">People</h1>
          <span className={styles.countBadge}>{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className={styles.tablePageActions}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search people..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select className={styles.filterSelect} value={filterPipeline} onChange={e => setFilterPipeline(e.target.value)}>
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          <select className={styles.filterSelect} value={filterLead} onChange={e => setFilterLead(e.target.value)}>
            <option value="all">All Leads</option>
            {LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          {canAddCustomer && (
            <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => setAddingRow(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: '6px' }}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Person
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 && !addingRow ? (
        <div className="empty-state">
          {searchQuery ? (
            <><h3>No matches found</h3><p>No people match &quot;{searchQuery}&quot;.</p></>
          ) : (
            <><h3>No people yet</h3><p>{canAddCustomer ? 'Add your first person to get started.' : 'No people added yet.'}</p></>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.peopleTable}>
            <thead>
              <tr className={styles.tableHeaderRow}>
                <th className={styles.thCheck}>
                  <input type="checkbox" className={styles.checkbox}
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll} />
                </th>
                <th className={styles.th} onClick={() => handleSort('name')}>
                  <span className={styles.thInner}>NAME <SortIcon col="name" /></span>
                </th>
                <th className={styles.th} onClick={() => handleSort('pipeline')}>
                  <span className={styles.thInner}>PIPELINE <SortIcon col="pipeline" /></span>
                </th>
                <th className={styles.th}>
                  <span className={styles.thInner}>VIA</span>
                </th>
                <th className={styles.th} onClick={() => handleSort('lead')}>
                  <span className={styles.thInner}>LEAD <SortIcon col="lead" /></span>
                </th>
                <th className={styles.th}>
                  <span className={styles.thInner}>RISK</span>
                </th>
                <th className={styles.th} onClick={() => handleSort('email')}>
                  <span className={styles.thInner}>EMAIL <SortIcon col="email" /></span>
                </th>
                <th className={styles.th}>
                  <span className={styles.thInner}>PHONE</span>
                </th>
                <th className={styles.th} onClick={() => handleSort('location')}>
                  <span className={styles.thInner}>LOCATION <SortIcon col="location" /></span>
                </th>
                <th className={styles.th} onClick={() => handleSort('lastContacted')}>
                  <span className={styles.thInner}>LAST CONTACT <SortIcon col="lastContacted" /></span>
                </th>
                <th className={styles.th} onClick={() => handleSort('nextFollowUp')}>
                  <span className={styles.thInner}>NEXT FOLLOW-UP <SortIcon col="nextFollowUp" /></span>
                </th>
                <th className={styles.th}>
                  <span className={styles.thInner}>TIME</span>
                </th>
                <th className={styles.th}>
                  <span className={styles.thInner}>NOTES</span>
                </th>
                <th className={styles.thDel} />
              </tr>
            </thead>
            <tbody>
              {/* Inline add row */}
              {addingRow && (
                <tr className={styles.addRow}>
                  <td className={styles.tdCheck} />
                  <td className={styles.tdName}>
                    <input ref={nameInputRef} className={styles.addInput} placeholder="Full name..."
                      value={newName} onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNewRow(); if (e.key === 'Escape') cancelNewRow(); }} />
                  </td>
                  <td className={styles.td}>
                    <select className={styles.addSelect} value={newPipeline} onChange={e => setNewPipeline(e.target.value)}>
                      {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className={styles.td}>
                    <select className={styles.addSelect} value={newVia} onChange={e => setNewVia(e.target.value)}>
                      {CONTACTED_VIA.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className={styles.td}>
                    <select className={styles.addSelect} value={newLead} onChange={e => setNewLead(e.target.value)}>
                      {LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className={styles.td} />
                  <td className={styles.td}>
                    <input className={styles.addInput} placeholder="Email..." type="email"
                      value={newEmail} onChange={e => setNewEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNewRow(); if (e.key === 'Escape') cancelNewRow(); }} />
                  </td>
                  <td className={styles.td}>
                    <input className={styles.addInput} placeholder="Phone..."
                      value={newPhone} onChange={e => setNewPhone(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNewRow(); if (e.key === 'Escape') cancelNewRow(); }} />
                  </td>
                  <td className={styles.td}>
                    <input className={styles.addInput} placeholder="Country..."
                      value={newCountry} onChange={e => setNewCountry(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveNewRow(); if (e.key === 'Escape') cancelNewRow(); }} />
                  </td>
                  <td className={styles.td}>
                    <input className={styles.addInput} type="date"
                      value={newLastContacted} onChange={e => setNewLastContacted(e.target.value)} />
                  </td>
                  <td className={styles.td}>
                    <input className={styles.addInput} type="date"
                      value={newNextFollowUp} onChange={e => setNewNextFollowUp(e.target.value)} />
                  </td>
                  <td className={styles.td} />
                  <td className={styles.td}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className={styles.addRowSaveBtn} onClick={saveNewRow}
                        disabled={savingRow || !newName.trim()} title="Save (Enter)">
                        {savingRow ? '…' : '✓'}
                      </button>
                      <button className={styles.addRowCancelBtn} onClick={cancelNewRow} title="Cancel (Escape)">✕</button>
                    </div>
                  </td>
                  <td className={styles.tdDel} />
                </tr>
              )}

              {filtered.map(customer => {
                const isSelected = selectedIds.has(customer.id);
                const overdueFollowUp = isOverdue(customer.nextFollowUpAt);
                const isConfirmDelete = confirmDeleteId === customer.id;

                return (
                  <tr key={customer.id} className={`${styles.tableRow} ${isSelected ? styles.tableRowSelected : ''}`}>
                    <td className={styles.tdCheck} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className={styles.checkbox} checked={isSelected} onChange={() => toggleSelect(customer.id)} />
                    </td>

                    <td className={styles.tdName}>
                      <Link href={`/customers/${customer.id}`} className={styles.nameCell}>
                        <div className={styles.avatarSmall}>
                          {customer.logoUrl
                            ? <img src={`/api/files/${customer.logoUrl}`} alt="" className={styles.avatarImg} />
                            : <span className={styles.avatarLetter}>{customer.name.charAt(0).toUpperCase()}</span>
                          }
                        </div>
                        <div className={styles.nameInfo}>
                          <span className={styles.nameText}>{customer.name}</span>
                          {customer.companyName && <span className={styles.companyText}>{customer.companyName}</span>}
                        </div>
                      </Link>
                    </td>

                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <InlineBadge
                        value={customer.pipelineStage}
                        options={PIPELINE_STAGES}
                        onSelect={key => updateStage(customer.id, { pipelineStage: key })}
                        renderSelected={opt => (
                          <span className={styles.pipelineBadge} style={{ color: opt.color, background: opt.bg }}>
                            <span className={styles.stageDot} style={{ background: opt.color }} />
                            {opt.label}
                          </span>
                        )}
                      />
                    </td>

                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <InlineBadge
                        value={customer.contactedVia || ''}
                        options={CONTACTED_VIA}
                        onSelect={key => updateStage(customer.id, { contactedVia: key })}
                        renderSelected={opt => opt.key === ''
                          ? <span className={styles.emptyCell}>—</span>
                          : <span className={styles.pipelineBadge} style={{ color: opt.color, background: opt.bg }}>{opt.label}</span>
                        }
                      />
                    </td>

                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <InlineBadge
                        value={customer.leadStatus}
                        options={LEAD_STATUSES}
                        onSelect={key => updateStage(customer.id, { leadStatus: key })}
                        renderSelected={opt => (
                          <span className={styles.leadBadge} style={{ color: opt.color, background: opt.bg }}>
                            {(opt as typeof LEAD_STATUSES[0]).dot} {opt.label}
                          </span>
                        )}
                      />
                    </td>

                    <td className={styles.td}>
                      <Link href={`/customers/${customer.id}`} className={styles.tdLink}>
                        <DealRiskBadge risk={customer.riskLevel ?? 'none'} />
                      </Link>
                    </td>

                    <td className={styles.td}>
                      <Link href={`/customers/${customer.id}`} className={styles.tdLink}>
                        {customer.email
                          ? <span className={styles.emailText}>{customer.email}</span>
                          : <span className={styles.emptyCell}>—</span>
                        }
                      </Link>
                    </td>

                    <td className={styles.td}>
                      <Link href={`/customers/${customer.id}`} className={styles.tdLink}>
                        {customer.phone || <span className={styles.emptyCell}>—</span>}
                      </Link>
                    </td>

                    <td className={styles.td}>
                      <Link href={`/customers/${customer.id}`} className={styles.tdLink}>
                        {customer.country
                          ? <span>{customer.state ? `${customer.state}, ` : ''}{customer.country}</span>
                          : <span className={styles.emptyCell}>—</span>
                        }
                      </Link>
                    </td>

                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <button className={styles.lastContactBtn}
                        onClick={e => openCalendar(e, customer.id, 'lastContactedAt', customer.lastContactedAt)}
                        title="Set last contacted date">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
                          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>{formatLastContacted(customer.lastContactedAt)}</span>
                      </button>
                    </td>

                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <button
                        className={`${styles.lastContactBtn} ${overdueFollowUp && customer.nextFollowUpAt ? styles.followUpOverdue : ''}`}
                        onClick={e => openCalendar(e, customer.id, 'nextFollowUpAt', customer.nextFollowUpAt)}
                        title="Set next follow-up date">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>{formatNextFollowUp(customer.nextFollowUpAt)}</span>
                      </button>
                    </td>

                    <td className={styles.td} onClick={e => e.stopPropagation()}>
                      <button
                        className={styles.timeCell}
                        onClick={e => openCalendar(e, customer.id, 'nextFollowUpAt', customer.nextFollowUpAt)}
                        title="Set follow-up time"
                      >
                        {formatTime(customer.nextFollowUpAt) === '—'
                          ? <span className={styles.emptyCell}>—</span>
                          : <span className={styles.timeCellValue}>{formatTime(customer.nextFollowUpAt)}</span>
                        }
                      </button>
                    </td>

                    <td className={styles.td}>
                      <Link href={`/customers/${customer.id}`} className={styles.tdLink}>
                        <span className={styles.statChip}>{customer._count.notes} notes</span>
                        <span className={styles.statChip}>{customer._count.documents} docs</span>
                      </Link>
                    </td>

                    <td className={styles.tdDel} onClick={e => e.stopPropagation()}>
                      {isConfirmDelete ? (
                        <div className={styles.deleteConfirm}>
                          <button className={styles.deleteConfirmYes} onClick={() => deleteCustomer(customer.id)} title="Confirm delete">✓</button>
                          <button className={styles.deleteConfirmNo} onClick={() => setConfirmDeleteId(null)} title="Cancel">✕</button>
                        </div>
                      ) : (
                        <button className={styles.deleteBtn} onClick={() => setConfirmDeleteId(customer.id)} title="Delete person">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar popup */}
      {calendarState && (
        <CalendarPicker
          selectedDate={calendarState.currentDate}
          position={calendarState.pos}
          onSelect={handleCalendarSelect}
          onClose={() => setCalendarState(null)}
          withTime={calendarState.field === 'nextFollowUpAt'}
        />
      )}
    </div>
  );
}
