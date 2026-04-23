import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import CustomerTabs from '@/components/CustomerTabs';
import MeetingWidget from '@/components/MeetingWidget';
import styles from './detail.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      {/* Customer Header */}
      <div className={`glass-card ${styles.header}`}>
        <div className={styles.headerTop}>
          <div className={styles.headerInfo}>
            {customer.logoUrl ? (
              <img src={`/api/files/${customer.logoUrl}`} alt="" className={styles.logo} />
            ) : (
              <div className={styles.logoPlaceholder}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className={styles.customerName}>{customer.name}</h1>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginTop: '0.25rem' }}>
                <span className={`badge ${customer.customerType === 'company' ? 'badge-fathom' : 'badge-manual'}`}>
                  {customer.customerType === 'company' ? 'Company' : 'Individual'}
                </span>
                {customer.age && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {customer.age} years old
                  </span>
                )}
              </div>
            </div>
          </div>
          <a href={`/customers/${customer.id}/edit`} className="btn btn-outline btn-sm">
            Edit
          </a>
        </div>

        {customer.companyName && (
          <p style={{ color: 'var(--accent-primary)', fontWeight: 500, fontSize: '0.95rem', marginBottom: 'var(--space-sm)' }}>
            {customer.companyName}
          </p>
        )}

        {customer.description && (
          <p className={styles.description}>{customer.description}</p>
        )}

        <div className={styles.meta}>
          {customer.country && (
            <span className={styles.metaItem}>
              {customer.state ? `${customer.state}, ` : ''}{customer.country}
            </span>
          )}
          {customer.website && (
            <a href={customer.website} target="_blank" rel="noopener noreferrer" className={styles.metaItem}>
              {customer.website}
            </a>
          )}
          {customer.email && <span className={styles.metaItem}>{customer.email}</span>}
          {customer.phone && <span className={styles.metaItem}>{customer.phone}</span>}
        </div>
      </div>

      {/* Mandate Section */}
      {(customer.mandateScope || customer.mandateCompensation || customer.mandateExclusivity || customer.mandateLegalProtections || customer.mandateTransactionDef) && (
        <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 'var(--space-lg)', color: 'var(--text-primary)' }}>
            Mandate — The Appointment
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
            {customer.mandateScope && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Scope of Services</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{customer.mandateScope}</p>
              </div>
            )}
            {customer.mandateCompensation && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Compensation and Fees</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{customer.mandateCompensation}</p>
              </div>
            )}
            {customer.mandateExclusivity && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Exclusivity and Term</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{customer.mandateExclusivity}</p>
              </div>
            )}
            {customer.mandateLegalProtections && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Legal Protections</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{customer.mandateLegalProtections}</p>
              </div>
            )}
            {customer.mandateTransactionDef && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Definitions of &quot;Transaction&quot;</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{customer.mandateTransactionDef}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meeting Widget */}
      <MeetingWidget customerId={customer.id} customerEmail={typeof customer.email === 'string' ? customer.email : null} />

      {/* Tabs */}
      <CustomerTabs
        customerId={customer.id}
        customerName={customer.name}
        notes={JSON.parse(JSON.stringify(customer.notes))}
        documents={JSON.parse(JSON.stringify(customer.documents))}
        pipelineStage={customer.pipelineStage}
      />
    </div>
  );
}
