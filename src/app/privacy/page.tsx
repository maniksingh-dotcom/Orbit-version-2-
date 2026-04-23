import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import fs from 'fs';
import path from 'path';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy - Orbit CRM',
  description: 'Privacy Policy for Orbit CRM - How we collect, use, and protect your data',
};

export default function PrivacyPage() {
  const privacyContent = fs.readFileSync(
    path.join(process.cwd(), 'PRIVACY_POLICY.md'),
    'utf-8'
  );

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--accent-subtle)',
          borderLeft: '3px solid var(--accent-primary)',
          marginBottom: '1.5rem',
          borderRadius: '4px'
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            This privacy policy is publicly accessible and does not require authentication to view.
          </p>
        </div>
        <div className={styles.markdown}>
          <ReactMarkdown>{privacyContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
