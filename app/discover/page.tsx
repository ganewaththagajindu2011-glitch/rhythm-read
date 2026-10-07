import type { Metadata } from 'next';
import { BookCard } from '@/app/components/book-card';
import { listCategories, getCatalog, categorySlug } from '@/lib/catalog';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = { category?: string; free?: string; q?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const p = await searchParams;
  const hasFilters = Boolean(p.q?.trim() || p.category || p.free === 'true');
  return {
    title: hasFilters ? 'Search eBooks — Rhythm Read' : 'Discover eBooks — Free & Premium Online Books',
    description: 'Search Rhythm Read for free ebooks, premium digital books, novels, business, education, technology, romance, self development, and Sri Lankan culture reads.',
    keywords: ['free ebooks', 'ebooks online', 'digital books', 'online novels', 'business books', 'education books', 'technology books', 'romance books', 'self development books', 'Sri Lankan culture books', 'Rhythm Read'],
    alternates: { canonical: '/discover' },
    robots: hasFilters ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: 'Discover eBooks — Rhythm Read',
      description: 'Explore free and premium digital books on Rhythm Read.',
      type: 'website',
      url: `${getSiteUrl()}/discover`,
      siteName: 'Rhythm Read',
    },
  };
}

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const [books, categories] = await Promise.all([getCatalog(), listCategories()]);
  const query = p.q?.trim().toLowerCase() || '';
  const filtered = books.filter((book) =>
    (!p.category || book.category === p.category) &&
    (!p.free || (p.free === 'true' ? book.free : true)) &&
    (!query || `${book.title} ${book.author} ${book.category} ${book.description}`.toLowerCase().includes(query)),
  );

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Rhythm Read eBooks',
    numberOfItems: filtered.length,
    itemListElement: filtered.slice(0, 50).map((book, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${getSiteUrl()}/book/${book.slug}`,
      name: book.title,
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
      <section className="discover-page">
        <div className="container">
          <div className="eyebrow">Discover eBooks</div>
          <h1 className="discover-title">Find your next read.</h1>
          <p className="discover-copy">Search free ebooks, premium digital books, online novels, business, education, technology, romance, self development, and Sri Lankan culture reads on Rhythm Read.</p>

          <form method="get" className="discover-search glass" role="search">
            <input name="q" defaultValue={p.q} placeholder="Search books, authors, categories…" aria-label="Search books" />
            <button className="btn btn-dark" type="submit">Search</button>
          </form>

          <div className="discover-filters" aria-label="Book categories">
            <a className="pill" href="/discover">All</a>
            {categories.map((category) => <a key={category} className="pill" href={`/category/${categorySlug(category)}`}>{category}</a>)}
          </div>

          <div className="book-grid">{filtered.map((book) => <BookCard key={book.id} book={book} />)}</div>
          {filtered.length === 0 ? <div className="discover-empty glass"><h2>No books matched that search.</h2><p>Try another title, author, or category.</p></div> : null}
        </div>
      </section>
    </main>
  );
}
