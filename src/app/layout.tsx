import './globals.css';
import type { Metadata } from 'next';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/contexts/ToastContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import SessionWrapper from '@/components/SessionWrapper';
import TaskReminderPoller from '@/components/TaskReminderPoller';

export const metadata: Metadata = {
  title: 'Orbit - Deal Intelligence Platform',
  description: 'Manage customers, meeting notes, and documents seamlessly.',
  verification: {
    google: 'YLuMktnkIjHXPjFB3s1PmWv2--PKM0YyeV_3_wQL1lo',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionWrapper>
          <CompanyProvider>
            <ToastProvider>
              <div className="app-wrapper">
                <Sidebar />
                <TaskReminderPoller />
                <main className="app-content">
                  {children}
                </main>
              </div>
            </ToastProvider>
          </CompanyProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
