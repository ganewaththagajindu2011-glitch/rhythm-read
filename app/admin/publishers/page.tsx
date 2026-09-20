'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Shield, X } from 'lucide-react';

type Publisher = {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  country: string;
  city: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  createdAt: string;
};

export default function AdminPublishersPage() {
  const [items, setItems] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const response = await fetch('/api/admin/publishers', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? 'Could not load publisher applications.');
    else setItems(data.publishers ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(email: string, status: Publisher['status']) {
    const response = await fetch('/api/admin/publishers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, status }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? 'Could not update publisher.');
      return;
    }
    setItems((current) => current.map((item) => item.email === email ? { ...item, status } : item));
  }

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <div className="admin-topbar">
          <div>
            <div className="eyebrow" style={{ color: '#888' }}>Marketplace control</div>
            <h1 style={{ fontFamily: 'Georgia,serif', fontWeight: 500, fontSize: 'clamp(42px,6vw,64px)', letterSpacing: '-.05em', margin: '10px 0 8px' }}>Publisher approvals.</h1>
            <p className="admin-subtitle">Approve trusted authors before they can publish books to the marketplace.</p>
          </div>
          <Link href="/admin" className="admin-back-btn"><ArrowLeft size={15} /> Admin</Link>
        </div>

        {error && <div className="publisher-form-message">{error}</div>}

        <section className="admin-table-card" style={{ marginTop: 20 }}>
          <div className="admin-table-header"><div><strong>Applications</strong><span>{items.length} publishers</span></div><Shield size={18} color="#888" /></div>
          {loading ? <div style={{ padding: 30, color: '#999' }}>Loading applications…</div> : items.length === 0 ? <div style={{ padding: 30, color: '#999' }}>No publisher applications yet.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Publisher</th><th>Location</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.displayName}</strong><div style={{ color:'#777', fontSize:12 }}>{item.email}</div></td>
                      <td>{[item.city, item.country].filter(Boolean).join(', ') || '—'}</td>
                      <td><span className={`status-pill status-pill-${item.status.toLowerCase()}`}>{item.status}</span></td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                          <button className="admin-action-btn approve" onClick={() => setStatus(item.email, 'APPROVED')}><Check size={14}/>Approve</button>
                          <button className="admin-action-btn reject" onClick={() => setStatus(item.email, 'REJECTED')}><X size={14}/>Reject</button>
                          {item.status === 'APPROVED' && <button className="admin-action-btn suspend" onClick={() => setStatus(item.email, 'SUSPENDED')}>Suspend</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
