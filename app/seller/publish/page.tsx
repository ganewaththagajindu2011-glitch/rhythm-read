import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function SellerPublishPage() {
  return (
    <main className="publisher-shell">
      <div className="publisher-wrap">
        <section className="publisher-card" style={{ maxWidth: 760, margin: '80px auto' }}>
          <ShieldCheck size={30} />
          <div className="eyebrow" style={{ marginTop: 18 }}>Publishing controls</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 500, fontSize: 48, margin: '10px 0' }}>
            Book publishing is admin-only.
          </h1>
          <p style={{ color: '#777', lineHeight: 1.7 }}>
            Only the Rhythm Read administrator can upload, edit, publish, or remove e-books.
            Reader accounts can only browse and read books according to their free or purchased access.
          </p>
          <Link className="btn btn-dark" href="/seller" style={{ marginTop: 18 }}>
            <ArrowLeft size={15} /> Back to account
          </Link>
        </section>
      </div>
    </main>
  );
}
