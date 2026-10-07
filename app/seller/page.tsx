import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getPublisherByEmail } from '@/lib/publisher-store';
import { calculateSale } from '@/lib/commission';

const demoSales = [
  { title: 'The Quiet Investor', gross: 5.99, units: 42 },
  { title: 'The Last Algorithm', gross: 7.99, units: 17 },
  { title: 'Midnight Letters', gross: 3.99, units: 31 },
];

export default async function SellerDashboard() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect('/login?callbackUrl=/seller');

  const publisher = await getPublisherByEmail(email);
  if (!publisher) redirect('/seller/apply');

  const gross = demoSales.reduce((sum, sale) => sum + sale.gross * sale.units, 0);
  const commission = calculateSale(gross);

  return (
    <main className="publisher-shell">
      <div className="publisher-wrap">
        <div className="publisher-topbar">
          <div>
            <div className="eyebrow">Publisher workspace</div>
            <h1>{publisher.displayName}&apos;s publishing studio.</h1>
            <p className="publisher-copy">Publish books, manage your catalog, watch sales, and track your 95% author share from every eligible sale.</p>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <Link className="btn" href="/">Back to site</Link>
            <Link className="btn" href="/seller/profile">Profile</Link>
            {publisher.status === 'APPROVED' && <Link className="btn btn-dark" href="/seller/publish">Publish a book</Link>}
          </div>
        </div>

        <div className={`publisher-status status-${publisher.status.toLowerCase()}`}>
          <strong>{publisher.status}</strong>
          <span>{publisher.status === 'APPROVED' ? 'Your publisher account is active and can submit books.' : publisher.status === 'PENDING' ? 'Admin approval is required before publishing is enabled.' : publisher.status === 'SUSPENDED' ? 'Publishing is currently suspended.' : 'Your application needs attention.'}</span>
        </div>

        <div className="publisher-grid">
          <section className="publisher-card">
            <div className="eyebrow">Overview</div>
            <h2>Performance at a glance.</h2>
            <div className="publisher-stats">
              <div className="publisher-stat"><span>Gross sales</span><strong>${commission.gross.toFixed(2)}</strong></div>
              <div className="publisher-stat"><span>Platform 5%</span><strong>${commission.platformCommission.toFixed(2)}</strong></div>
              <div className="publisher-stat"><span>Author 95%</span><strong>${commission.authorEarnings.toFixed(2)}</strong></div>
            </div>
            <p style={{ marginTop:18 }}>The 5% platform commission is calculated on the gross book sale. Payment settlement and payouts will be connected in the payment phase.</p>
          </section>

          <section className="publisher-card">
            <div className="eyebrow">Publisher profile</div>
            <h2>Everything in one identity.</h2>
            <p>{publisher.bio || 'Complete your public author profile so readers can learn who you are.'}</p>
            <Link className="btn btn-dark" href="/seller/profile">Edit profile</Link>
          </section>
        </div>

        <section className="publisher-card" style={{ marginTop:20 }}>
          <div className="eyebrow">Sales</div>
          <h2>Recent titles.</h2>
          <table className="publisher-table">
            <thead><tr><th>Book</th><th>Units</th><th>Gross</th><th>Author share</th></tr></thead>
            <tbody>
              {demoSales.map((sale) => {
                const total = sale.gross * sale.units;
                const share = calculateSale(total).authorEarnings;
                return <tr key={sale.title}><td>{sale.title}</td><td>{sale.units}</td><td>${total.toFixed(2)}</td><td>${share.toFixed(2)}</td></tr>;
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
