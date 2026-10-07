import type { Metadata } from 'next';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = { title: 'Privacy Policy', description: `Privacy information for ${SITE.name}.`, alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  return <main className="legal-page"><div className="container legal-wrap"><div className="eyebrow">Rhythm Read</div><h1>Privacy Policy</h1><p>Rhythm Read uses account, purchase, reading-progress, and security information only as needed to operate the digital reading service, process transactions, protect content, and improve the experience.</p><h2>Information we use</h2><p>Account identity, email address, profile image, reading progress, library activity, purchase records, and necessary billing information may be processed. Raw payment card numbers and CVV data are not stored by Rhythm Read; payment processing is handled by the payment provider.</p><h2>Contact</h2><p>{SITE.owner} · <a href={`mailto:${SITE.email}`}>{SITE.email}</a> · {SITE.phone}</p></div></main>;
}
