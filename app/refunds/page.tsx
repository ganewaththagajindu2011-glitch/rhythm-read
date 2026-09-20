import type { Metadata } from 'next';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = { title: 'Refund Policy', description: `Refund and purchase support information for ${SITE.name}.`, alternates: { canonical: '/refunds' } };

export default function RefundsPage() {
  return <main className="legal-page"><div className="container legal-wrap"><div className="eyebrow">Purchases</div><h1>Refund Policy</h1><p>Digital purchases are reviewed case by case. If a payment was duplicated, a book is inaccessible after a successful payment, or a transaction was made in error, contact us promptly with the order email and order ID.</p><h2>Payment verification</h2><p>Access to paid books is granted only after the payment provider confirms the transaction server-to-server.</p><h2>Contact</h2><p><a href={`mailto:${SITE.email}`}>{SITE.email}</a> · {SITE.phone}</p></div></main>;
}
