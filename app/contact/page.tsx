import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Phone, ArrowUpRight } from 'lucide-react';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact ${SITE.name} for questions about books, accounts, payments, or support.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return <main><section className="contact-page"><div className="container contact-grid">
    <div><div className="eyebrow">Support · Rhythm Read</div><h1>Let’s keep the reading rhythm moving.</h1><p>For account, book, payment, or general support questions, contact us using the details below.</p><Link className="btn btn-dark" href={`mailto:${SITE.email}`}>Email support <ArrowUpRight size={15}/></Link></div>
    <div className="contact-card glass"><div className="contact-item"><Mail size={20}/><div><span>Email</span><a href={`mailto:${SITE.email}`}>{SITE.email}</a></div></div><div className="contact-item"><Phone size={20}/><div><span>Phone</span><a href={`tel:${SITE.phone}`}>{SITE.phone}</a></div></div><div className="contact-item"><div className="contact-mark">RR</div><div><span>Contact</span><strong>{SITE.owner}</strong><small>{SITE.country}</small></div></div></div>
  </div></section></main>;
}
