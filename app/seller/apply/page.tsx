'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

type Publisher = {
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  displayName: string;
};

export default function PublisherApplyPage() {
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [form, setForm] = useState({ displayName: '', bio: '', phone: '', country: '', city: '', address: '', website: '', payoutEmail: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/publisher/application', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.publisher) {
          setPublisher(data.publisher);
          setForm({
            displayName: data.publisher.displayName ?? '',
            bio: data.publisher.bio ?? '',
            phone: data.publisher.phone ?? '',
            country: data.publisher.country ?? '',
            city: data.publisher.city ?? '',
            address: data.publisher.address ?? '',
            website: data.publisher.website ?? '',
            payoutEmail: data.publisher.payoutEmail ?? '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function submit() {
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/publisher/application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error ?? 'Could not save your application.');
      return;
    }
    setPublisher(data.publisher);
    setMessage(data.existing ? 'Your publisher profile was updated.' : 'Application submitted. An admin must approve your publisher account before you can publish.');
  }

  if (loading) return <main className="publisher-shell"><div className="publisher-wrap">Loading…</div></main>;

  return (
    <main className="publisher-shell">
      <div className="publisher-wrap">
        <div className="publisher-topbar">
          <div>
            <div className="eyebrow">Publisher application</div>
            <h1>Build your author identity.</h1>
            <p className="publisher-copy">Readers use these details to understand who published a book. Approval keeps the marketplace curated and safer for everyone.</p>
          </div>
          <Link className="btn" href="/">Back to site</Link>
        </div>

        {publisher && (
          <div className={`publisher-status status-${publisher.status.toLowerCase()}`}>
            <ShieldCheck size={18} />
            <strong>{publisher.status}</strong>
            <span>{publisher.status === 'APPROVED' ? 'Your publisher account is active.' : publisher.status === 'PENDING' ? 'Your application is waiting for admin approval.' : publisher.status === 'SUSPENDED' ? 'Publishing is currently paused.' : 'Please update your details before reapplying.'}</span>
          </div>
        )}

        <section className="publisher-card">
          <div className="publisher-form-grid">
            <label><span>Display name *</span><input className="admin-input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your public author name" /></label>
            <label><span>Payout email</span><input className="admin-input" type="email" value={form.payoutEmail} onChange={(e) => setForm({ ...form, payoutEmail: e.target.value })} placeholder="payout@example.com" /></label>
            <label><span>Phone</span><input className="admin-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+94 …" /></label>
            <label><span>Country</span><input className="admin-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Sri Lanka" /></label>
            <label><span>City</span><input className="admin-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Colombo" /></label>
            <label><span>Website</span><input className="admin-input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" /></label>
            <label className="publisher-span-2"><span>Address</span><input className="admin-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Business / mailing address" /></label>
            <label className="publisher-span-2"><span>Bio</span><textarea className="admin-input" rows={7} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell readers about yourself, your writing, or your publishing imprint." /></label>
          </div>
          <div className="publisher-form-actions">
            <Link className="btn" href="/seller">Publisher dashboard</Link>
            <button className="btn btn-dark" type="button" onClick={submit} disabled={saving}>{saving ? 'Saving…' : publisher ? 'Update application' : 'Submit publisher application'} <CheckCircle2 size={15} /></button>
          </div>
          {message && <div className="publisher-form-message">{message}</div>}
        </section>
      </div>
    </main>
  );
}
