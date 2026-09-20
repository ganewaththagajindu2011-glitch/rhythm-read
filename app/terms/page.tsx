import type { Metadata } from 'next';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = { title: 'Terms of Use', description: `Terms of use for ${SITE.name}.`, alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return <main className="legal-page"><div className="container legal-wrap"><div className="eyebrow">Rhythm Read</div><h1>Terms of Use</h1><p>By using Rhythm Read, you agree to use the service lawfully and to respect copyright and other intellectual-property rights. Purchased and free-reader access is provided for the permitted personal use of the reader.</p><h2>Content</h2><p>Users must not upload, distribute, scrape, or republish material they do not have permission to use. Rhythm Read may remove content that violates applicable law or these terms.</p><h2>Support</h2><p>Contact {SITE.owner} at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> for account, payment, or content concerns.</p></div></main>;
}
