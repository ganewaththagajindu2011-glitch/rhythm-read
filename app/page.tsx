export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { BookCard } from './components/book-card';
import { HeroBook } from './components/hero-book';
import { listCategories } from '@/lib/catalog';
import { getCatalog } from '@/lib/catalog';

export default async function HomePage() {
  const books = await getCatalog();
  const featured = books.filter((b) => b.featured);
  const free = books.filter((b) => b.free);
  const categories = await listCategories();

  return (
    <main>
      <section className="hero hero-scroll-zone">
        <div className="container hero-grid">
          <div className="hero-copy reveal">
            <div className="eyebrow">Digital reading · Independent publishing</div>
            <h1>The Rhythm of<br />Digital Reading.</h1>
            <p>Discover stories, ideas, and voices worth returning to. Read freely. Buy beautifully. Publish globally.</p>
            <div className="hero-actions">
              <Link className="btn btn-dark" href="/discover">Explore books <ArrowUpRight size={15} /></Link>
              <Link className="btn" href="/discover?free=true">Start reading free</Link>
            </div>
            <div className="hero-note"><span>Scroll</span><span className="hero-note-line" /></div>
          </div>

          <HeroBook title="Rhythm Read" />
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-head">
            <div><div className="eyebrow">Curated for you</div><h2>Books with a pulse.</h2></div>
            <Link className="btn" href="/discover">View all</Link>
          </div>
          <div className="book-grid">{featured.map((b) => <BookCard key={b.id} book={b} />)}</div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="feature-panel feature-panel-wide">
            <div className="eyebrow" style={{ color: '#999' }}>Free reading</div>
            <h3>Stories you can start without opening your wallet.</h3>
            <p>Read selected books online with a focused, distraction-light reader. Your progress stays in your library when you sign in.</p>
            <Link href="/discover?free=true" className="btn" style={{ marginTop: 16 }}>Browse free reads</Link>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-head">
            <div><div className="eyebrow">Free reads</div><h2>Read now.</h2></div>
            <Sparkles size={22} />
          </div>
          <div className="book-grid">{free.map((b) => <BookCard key={b.id} book={b} />)}</div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-head"><div><div className="eyebrow">Explore</div><h2>Find your shelf.</h2></div></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {categories.map((c) => <Link key={c} href={`/discover?category=${encodeURIComponent(c)}`} className="btn btn-ghost">{c}</Link>)}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <div><strong>RHYTHMREAD</strong><p>The Rhythm of Digital Reading.</p></div>
          <div className="footer-links"><Link href="/discover">Discover</Link><Link href="/library">Library</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refunds">Refunds</Link></div>
          <div className="footer-contact"><a href="mailto:gajindumax@gmail.com">gajindumax@gmail.com</a><a href="tel:0777614202">0777614202</a><span>Gajindu Anupama · Sri Lanka</span></div>
        </div>
      </footer>
    </main>
  );
}
