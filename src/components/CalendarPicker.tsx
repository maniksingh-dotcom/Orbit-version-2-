'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '@/app/customers/customers.module.css';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface CalendarPickerProps {
  selectedDate: string | null;
  position: { top: number; left: number };
  onSelect: (isoDate: string) => void;
  onClose: () => void;
  withTime?: boolean;
}

export default function CalendarPicker({ selectedDate, position, onSelect, onClose, withTime }: CalendarPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initDate = selectedDate ? new Date(selectedDate) : today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  // Initialise time from existing selectedDate if present
  const initH24 = selectedDate ? new Date(selectedDate).getHours() : 9;
  const initMinute = selectedDate ? new Date(selectedDate).getMinutes() : 0;
  const initHour12 = initH24 % 12 || 12;
  const initAmpm: 'AM' | 'PM' = initH24 >= 12 ? 'PM' : 'AM';

  // Time picker step
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [hour, setHour] = useState(initHour12);
  const [minute, setMinute] = useState(initMinute);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initAmpm);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingDate) setPendingDate(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, pendingDate]);

  const selectedD = selectedDate ? (() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d;
  })() : null;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { date: Date; isOther: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), isOther: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), isOther: false });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(viewYear, viewMonth + 1, d), isOther: true });
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDateClick = (date: Date) => {
    if (withTime) {
      setPendingDate(date);
    } else {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      onSelect(d.toISOString());
    }
  };

  const handleTimeConfirm = () => {
    if (!pendingDate) return;
    let h = hour % 12;
    if (ampm === 'PM') h += 12;
    const d = new Date(pendingDate.getFullYear(), pendingDate.getMonth(), pendingDate.getDate(), h, minute, 0);
    onSelect(d.toISOString());
  };

  // ── Time Picker Step ───────────────────────────────────
  if (pendingDate) {
    const dateLabel = `${SHORT_MONTHS[pendingDate.getMonth()]} ${pendingDate.getDate()}, ${pendingDate.getFullYear()}`;
    return (
      <div
        className={styles.calendarPopup}
        style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 1000 }}
        ref={ref}
      >
        {/* Header */}
        <div className={styles.calendarHeader}>
          <button className={styles.calendarNavBtn} onClick={() => setPendingDate(null)} type="button" aria-label="Back to calendar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <span className={styles.calendarMonthLabel}>{dateLabel}</span>
          <span style={{ width: 28 }} />
        </div>

        <div className={styles.timePickerBody}>
          <p className={styles.timePickerLabel}>Pick a time</p>

          {/* Hour : Minute  AM/PM — clean select row */}
          <div className={styles.timeSelectRow}>
            <div className={styles.timeSelectGroup}>
              <span className={styles.timeSelectLabel}>Hour</span>
              <select
                className={styles.timeSelect}
                value={hour}
                onChange={e => setHour(Number(e.target.value))}
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <span className={styles.timeColon}>:</span>

            <div className={styles.timeSelectGroup}>
              <span className={styles.timeSelectLabel}>Minute</span>
              <select
                className={styles.timeSelect}
                value={minute}
                onChange={e => setMinute(Number(e.target.value))}
              >
                {ALL_MINUTES.map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>

            <div className={styles.timeAmpmRow}>
              <span className={styles.timeSelectLabel}>Period</span>
              <div className={styles.timeAmpmGroup}>
                {(['AM', 'PM'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.timeAmpmBtn} ${ampm === p ? styles.timeAmpmBtnActive : ''}`}
                    onClick={() => setAmpm(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className={styles.timePreview}>
            {hour}:{String(minute).padStart(2, '0')} {ampm} · {dateLabel}
          </div>
        </div>

        <div className={styles.calendarFooter}>
          <button className={styles.calendarTodayBtn} type="button" onClick={() => setPendingDate(null)}>
            Back
          </button>
          <button
            className={styles.calendarTodayBtn}
            type="button"
            style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none' }}
            onClick={handleTimeConfirm}
          >
            Set Time
          </button>
        </div>
      </div>
    );
  }

  // ── Calendar Step ──────────────────────────────────────
  return (
    <div
      className={styles.calendarPopup}
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 1000 }}
      ref={ref}
    >
      <div className={styles.calendarHeader}>
        <button className={styles.calendarNavBtn} onClick={prevMonth} type="button" aria-label="Previous month">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <span className={styles.calendarMonthLabel}>{MONTHS[viewMonth]} {viewYear}</span>
        <button className={styles.calendarNavBtn} onClick={nextMonth} type="button" aria-label="Next month">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      </div>

      {withTime && (
        <div className={styles.calendarWithTimeHint}>
          Select a date, then pick a time
        </div>
      )}

      <div className={styles.calendarGrid}>
        {DAYS.map(d => (
          <div key={d} className={styles.calendarDayHeader}>{d}</div>
        ))}
        {cells.map((cell, i) => {
          const isToday = cell.date.getTime() === today.getTime();
          const isSelected = selectedD && cell.date.getTime() === selectedD.getTime();
          return (
            <button
              key={i}
              type="button"
              className={[
                styles.calendarCell,
                cell.isOther ? styles.calendarCellOther : '',
                isToday && !isSelected ? styles.calendarCellToday : '',
                isSelected ? styles.calendarCellSelected : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleDateClick(cell.date)}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>

      <div className={styles.calendarFooter}>
        <button
          className={styles.calendarTodayBtn}
          type="button"
          onClick={() => handleDateClick(today)}
        >
          Today
        </button>
      </div>
    </div>
  );
}
