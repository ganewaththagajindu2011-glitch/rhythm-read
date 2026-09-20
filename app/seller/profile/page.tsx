'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SellerProfilePage() {
  const [form, setForm] = useState({ displayName:'', bio:'', phone:'', country:'', city:'', address:'', website:'', payoutEmail:'' });
  const [status, setStatus] = useState('Loading…');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/publisher/application', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.publisher) {
          setStatus('Apply to become a publisher first.');
          return;
        }
        setForm({
          displayName: data.publisher.displayName ?? '', bio: data.publisher.bio ?? '', phone: data.publisher.phone ?? '', country: data.publisher.country ?? '', city: data.publisher.city ?? '', address: data.publisher.address ?? '', website: data.publisher.website ?? '', payoutEmail: data.publisher.payoutEmail ?? '',
        });
        setStatus('');
      });
  }, []);

  async function save() {
    setSaving(true);
    setStatus('');
    const response = await fetch('/api/publisher/application', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    setStatus(response.ok ? 'Profile saved successfully.' : (data.error ?? 'Could not save profile.'));
  }

  return (
    <main className="publisher-shell">
      <div className="publisher-wrap">
        <div className="publisher-topbar">
          <div><div className="eyebrow">Publisher profile</div><h1>Your author details.</h1><p className="publisher-copy">Keep your public author identity and payout information in one place.</p></div>
          <Link className="btn" href="/seller">← Dashboard</Link>
        </div>
        <section className="publisher-card">
          <div className="publisher-form-grid">
            <label><span>Display name</span><input className="admin-input" value={form.displayName} onChange={(e)=>setForm({...form,displayName:e.target.value})}/></label>
            <label><span>Payout email</span><input className="admin-input" value={form.payoutEmail} onChange={(e)=>setForm({...form,payoutEmail:e.target.value})}/></label>
            <label><span>Phone</span><input className="admin-input" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></label>
            <label><span>Country</span><input className="admin-input" value={form.country} onChange={(e)=>setForm({...form,country:e.target.value})}/></label>
            <label><span>City</span><input className="admin-input" value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})}/></label>
            <label><span>Website</span><input className="admin-input" value={form.website} onChange={(e)=>setForm({...form,website:e.target.value})}/></label>
            <label className="publisher-span-2"><span>Address</span><input className="admin-input" value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})}/></label>
            <label className="publisher-span-2"><span>Bio</span><textarea className="admin-input" rows={6} value={form.bio} onChange={(e)=>setForm({...form,bio:e.target.value})}/></label>
          </div>
          <div className="publisher-form-actions"><button className="btn btn-dark" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></div>
          {status && <div className="publisher-form-message">{status}</div>}
        </section>
      </div>
    </main>
  );
}
