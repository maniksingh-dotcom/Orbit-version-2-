import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import fs from 'fs';
import path from 'path';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service - Orbit CRM',
  description: 'Terms of Service for Orbit CRM - Rules and guidelines for using our platform',
};

export default function TermsPage() {
  const termsContent = fs.readFileSync(
    path.join(process.cwd(), 'TERMS_OF_SERVICE.md'),
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
            These terms of service are publicly accessible and do not require authentication to view.
          </p>
        </div>
        <div className={styles.markdown}>
          <ReactMarkdown>{termsContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
