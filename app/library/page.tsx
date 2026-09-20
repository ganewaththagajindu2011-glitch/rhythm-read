import Link from 'next/link';
import { getCatalog } from '@/lib/catalog';

export default async function LibraryPage() {
  const books = await getCatalog();
  return (
    <main>
      <section style={{ paddingTop: 150 }}>
        <div className="container">
          <div className="eyebrow">My Library</div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 'clamp(48px,7vw,84px)', fontWeight: 500, letterSpacing: '-.06em' }}>
            Continue your story.
          </h1>
          <p style={{ color: '#777', maxWidth: 650, lineHeight: 1.7 }}>
            Sign in to keep reading progress, purchases and your personal shelf synced across devices.
          </p>
          <div style={{ display: 'flex', gap: 10, margin: '24px 0' }}>
            <Link className="btn btn-dark" href="/login">Sign in with Google</Link>
            <Link className="btn" href="/discover">Explore books</Link>
          </div>
          <div className="book-grid" style={{ marginTop: 60 }}>
            {books.slice(0, 4).map((b) => (
              <div key={b.id} className="book-card">
                <div className="cover"><img src={b.cover} alt={b.title} /></div>
                <div className="book-meta">
                  <h3>{b.title}</h3>
                  <p>{b.free ? 'Free title' : 'Purchase required'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <span style={{ fontSize: 12 }}>{b.free ? 'Free' : 'Locked'}</span>
                    <Link href={`/book/${b.slug}`} className="btn">Open</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
