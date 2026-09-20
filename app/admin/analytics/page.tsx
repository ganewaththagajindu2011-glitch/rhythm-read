'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, Clock3, Eye, Users, DollarSign } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics', { cache: 'no-store' })
      .then(async (r) => { const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Analytics unavailable.'); return body; })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return <main className="admin-shell"><div className="admin-wrap">
    <div className="admin-topbar"><div><div className="eyebrow" style={{ color: '#888' }}>Last 30 days</div><h1 style={{ fontFamily:'Georgia,serif',fontWeight:500,fontSize:'clamp(38px,5vw,58px)',letterSpacing:'-.05em',margin:'10px 0 8px' }}>Reading analytics</h1><p className="admin-subtitle">See which books are being opened and how long readers stay.</p></div><Link href="/admin" className="admin-back-btn"><ArrowLeft size={15}/> Admin</Link></div>
    {error ? <div className="admin-upload-status error">{error}</div> : null}
    {data ? <>
      <div className="stat-grid admin-analytics-grid">
        <div className="stat"><span><Eye size={14}/> Views</span><strong>{data.totalViews}</strong></div>
        <div className="stat"><span><Clock3 size={14}/> Reading minutes</span><strong>{data.totalReadingMinutes}</strong></div>
        <div className="stat"><span><Users size={14}/> New users</span><strong>{data.newUsers}</strong></div>
        <div className="stat"><span><DollarSign size={14}/> Paid revenue</span><strong>${Number(data.paidRevenue || 0).toFixed(2)}</strong></div>
      </div>
      <section className="analytics-panel">
        <div className="section-head"><div><div className="eyebrow">Top content</div><h2>Books readers spend time with.</h2></div><BarChart3 size={22}/></div>
        <div className="analytics-list">{(data.topBooks || []).map((book:any, i:number) => <div className="analytics-row" key={book.title}><span className="analytics-rank">{String(i+1).padStart(2,'0')}</span><div className="analytics-book"><strong>{book.title}</strong><small>{book.views} views · {Math.round(book.seconds/60)} min reading time</small></div><div className="analytics-bar"><div style={{width:`${Math.min(100, (book.views / Math.max(1, data.topBooks?.[0]?.views || 1))*100)}%`}} /></div></div>)}</div>
      </section>
    </> : <div className="analytics-loading">Loading analytics…</div>}
  </div></main>;
}
