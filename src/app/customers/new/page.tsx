'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import styles from './new.module.css';

export default function NewCustomerPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customerType, setCustomerType] = useState('individual');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      const customerData = {
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
      };

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create customer');
      }

      const customer = await res.json();

      if (logoFile) {
        const logoData = new FormData();
        logoData.append('file', logoFile);
        logoData.append('customerId', customer.id);
        logoData.append('title', 'Customer Photo');

        const logoRes = await fetch('/api/upload', {
          method: 'POST',
          body: logoData,
        });

        if (logoRes.ok) {
          const doc = await logoRes.json();
          await fetch(`/api/customers/${customer.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logoUrl: doc.filePath }),
          });
        }
      }

      showToast('Customer added successfully', 'success');
      router.push(`/customers/${customer.id}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="page-title">Add Customer</h1>
      </div>

      <form onSubmit={handleSubmit} className={`glass-card ${styles.form}`}>
        <div className={styles.formGrid}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input name="name" className="form-input" placeholder="Enter full name" required />
          </div>

          <div className="form-group">
            <label className="form-label">Age</label>
            <input name="age" type="number" className="form-input" placeholder="Age" min="0" max="150" />
          </div>

          <div className="form-group">
            <label className="form-label">Customer Type</label>
            <select
              className="form-input"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
            >
              <option value="individual">Individual</option>
              <option value="company">Company Representative</option>
            </select>
          </div>

          {customerType === 'company' && (
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input name="companyName" className="form-input" placeholder="Company they work at" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Country</label>
            <input name="country" className="form-input" placeholder="Country" />
          </div>

          <div className="form-group">
            <label className="form-label">State / Region</label>
            <input name="state" className="form-input" placeholder="State or region" />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" placeholder="email@example.com" />
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input name="phone" className="form-input" placeholder="+1 (555) 000-0000" />
          </div>

          <div className="form-group">
            <label className="form-label">Website</label>
            <input name="website" className="form-input" placeholder="https://example.com" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea name="description" className="form-textarea" placeholder="Brief description or notes about this customer..." />
        </div>

        <div className="form-group">
          <label className="form-label">Photo</label>
          <div className={styles.logoUpload}>
            {logoPreview ? (
              <img src={logoPreview} alt="Photo preview" className={styles.logoPreview} />
            ) : (
              <div className={styles.logoPlaceholder}>
                <span>Upload Photo</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className={styles.fileInput}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={() => router.back()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
