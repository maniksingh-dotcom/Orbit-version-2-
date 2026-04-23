'use client';

import { useState } from 'react';
import MeetingHistoryClient from './MeetingHistoryClient';
import GoogleCalendarClient from './GoogleCalendarClient';
import styles from './meetings.module.css';

interface Props {
  userName: string;
}

export default function MeetingsTabs({ userName }: Props) {
  const [activeTab, setActiveTab] = useState<'history' | 'calendar'>('history');

  return (
    <div>
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Meeting History
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'calendar' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Google Calendar
        </button>
      </div>

      {activeTab === 'history' && <MeetingHistoryClient userName={userName} />}
      {activeTab === 'calendar' && <GoogleCalendarClient userName={userName} />}
    </div>
  );
}
