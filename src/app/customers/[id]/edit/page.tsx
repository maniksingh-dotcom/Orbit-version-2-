'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import AiAssistButton from '@/components/AiAssistButton';

function AiTextarea({ name, defaultValue, placeholder, className }: { name: string; defaultValue: string; placeholder?: string; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div style={{ position: 'relative' }}>
      <textarea ref={ref} name={name} className={className || 'form-textarea'} value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} />
      <div style={{ position: 'absolute', top: '0.4rem', right: '0.4rem' }}>
        <AiAssistButton text={value} onResult={v => setValue(v)} actions={["rephrase", "expand"]} />
      </div>
    </div>
  );
}

interface Customer {
  id: string;
  name: string;
  age: number | null;
  customerType: string;
  companyName: string | null;
  country: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  mandateScope: string | null;
  mandateCompensation: string | null;
  mandateExclusivity: string | null;
  mandateLegalProtections: string | null;
  mandateTransactionDef: string | null;
}

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerType, setCustomerType] = useState('individual');
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data);
        setCustomerType(data.customerType || 'individual');
      })
      .catch(() => showToast('Failed to load customer', 'error'));
  }, [params.id, showToast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      const data = {
        name: formData.get('name') as string,
        age: formData.get('age') as string,
        customerType,
        companyName: formData.get('companyName') as string,
        country: formData.get('country') as string,
        state: formData.get('state') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        website: formData.get('website') as string,
        description: formData.get('description') as string,
        mandateScope: formData.get('mandateScope') as string,
        mandateCompensation: formData.get('mandateCompensation') as string,
        mandateExclusivity: formData.get('mandateExclusivity') as string,
        mandateLegalProtections: formData.get('mandateLegalProtections') as string,
        mandateTransactionDef: formData.get('mandateTransactionDef') as string,
      };

      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to update');

      showToast('Customer updated', 'success');
      router.push(`/customers/${params.id}`);
      router.refresh();
    } catch {
      showToast('Failed to update customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/customers/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Customer deleted', 'success');
      router.push('/customers');
    } catch {
      showToast('Failed to delete customer', 'error');
    }
  };

  if (!customer) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-xl)' }}>
        <div className="glass-card" style={{ height: 400, opacity: 0.3, animation: 'pulse-glow 2s infinite' }} />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="page-title">Edit Person</h1>
        <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)}>
          Delete Person
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ maxWidth: 720 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-lg)' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input name="name" className="form-input" defaultValue={customer.name} required />
          </div>
          <div className="form-group">
            <label className="form-label">Age</label>
            <input name="age" type="number" className="form-input" defaultValue={customer.age || ''} min="0" max="150" />
          </div>
          <div className="form-group">
            <label className="form-label">Customer Type</label>
            <select className="form-input" value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
              <option value="individual">Individual</option>
              <option value="company">Company Representative</option>
            </select>
          </div>
          {customerType === 'company' && (
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input name="companyName" className="form-input" defaultValue={customer.companyName || ''} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Country</label>
            <input name="country" className="form-input" defaultValue={customer.country || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">State / Region</label>
            <input name="state" className="form-input" defaultValue={customer.state || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" defaultValue={customer.email || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input name="phone" className="form-input" defaultValue={customer.phone || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Website</label>
            <input name="website" className="form-input" defaultValue={customer.website || ''} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <AiTextarea name="description" defaultValue={customer.description || ''} placeholder="Describe this customer..." />
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-lg)', marginTop: 'var(--space-sm)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
            Mandate — The Appointment
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Scope of Services</label>
              <AiTextarea name="mandateScope" defaultValue={customer.mandateScope || ''} placeholder="Describe the scope of services..." />
            </div>
            <div className="form-group">
              <label className="form-label">Compensation and Fees</label>
              <AiTextarea name="mandateCompensation" defaultValue={customer.mandateCompensation || ''} placeholder="Describe compensation structure and fees..." />
            </div>
            <div className="form-group">
              <label className="form-label">Exclusivity and Term</label>
              <AiTextarea name="mandateExclusivity" defaultValue={customer.mandateExclusivity || ''} placeholder="Describe exclusivity arrangements and term length..." />
            </div>
            <div className="form-group">
              <label className="form-label">Legal Protections</label>
              <AiTextarea name="mandateLegalProtections" defaultValue={customer.mandateLegalProtections || ''} placeholder="Describe legal protections and provisions..." />
            </div>
            <div className="form-group">
              <label className="form-label">Definitions of &quot;Transaction&quot;</label>
              <AiTextarea name="mandateTransactionDef" defaultValue={customer.mandateTransactionDef || ''} placeholder="Define what constitutes a transaction..." />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={() => router.back()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {showDelete && (
        <ConfirmDialog
          title="Delete Person"
          message="This will permanently delete this person along with all their notes and documents. This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
