import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookCard } from '@/app/components/book-card';
import { getCatalog, getCategoryBySlug } from '@/lib/catalog';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: 'Category not found', robots: { index: false, follow: false } };

  const description = category.description?.trim() || `Explore ${category.name} ebooks and digital books on Rhythm Read.`;
  return {
    title: `${category.name} eBooks — Read Online`,
    description,
    keywords: [category.name, `${category.name} books`, `${category.name} ebooks`, `read ${category.name} books online`, 'Rhythm Read'],
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: {
      title: `${category.name} eBooks — Rhythm Read`,
      description,
      type: 'website',
      url: `${getSiteUrl()}/category/${category.slug}`,
      siteName: 'Rhythm Read',
    },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const books = (await getCatalog()).filter((book) => book.category === category.name);
  const siteUrl = getSiteUrl();
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Discover', item: `${siteUrl}/discover` },
      { '@type': 'ListItem', position: 3, name: category.name, item: `${siteUrl}/category/${category.slug}` },
    ],
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} books on Rhythm Read`,
    numberOfItems: books.length,
    itemListElement: books.slice(0, 50).map((book, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${siteUrl}/book/${book.slug}`,
      name: book.title,
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
      <section className="discover-page category-page">
        <div className="container">
          <nav className="breadcrumbs glass" aria-label="Breadcrumbs">
            <Link href="/">Home</Link><span>/</span><Link href="/discover">Discover</Link><span>/</span><strong>{category.name}</strong>
          </nav>
          <div className="eyebrow">Category</div>
          <h1 className="discover-title">{category.name} books.</h1>
          <p className="discover-copy">{category.description?.trim() || `Discover ${category.name} books and online reading picks from Rhythm Read.`}</p>
          <div className="category-page-actions"><Link className="btn btn-dark" href="/discover">Explore all books</Link></div>
          {books.length ? <div className="book-grid">{books.map((book) => <BookCard key={book.id} book={book} />)}</div> : <div className="discover-empty glass"><h2>No published books yet.</h2><p>More {category.name.toLowerCase()} reads are coming soon.</p></div>}
        </div>
      </section>
    </main>
  );
}
