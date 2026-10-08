export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Star } from 'lucide-react';
import { findBook } from '@/lib/catalog';
import { BookAnalytics } from '@/app/components/book-analytics';
import { BookSocial } from '@/app/components/book-social';
import { auth } from '@/auth';
import type { Metadata } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = await findBook(slug);
  if (!book) return { title: 'Book not found', robots: { index: false, follow: false } };

  const description = `${book.description} Read ${book.title} on Rhythm Read — a digital reading platform for free and premium ebooks.`;
  return {
    title: `${book.title} — Read Online`,
    description,
    keywords: [book.title, book.author, book.category, 'ebook', 'online book', 'read online', 'digital reading', 'Rhythm Read'],
    alternates: { canonical: `/book/${book.slug}` },
    openGraph: {
      title: `${book.title} — Read Online | Rhythm Read`,
      description,
      type: 'book',
      url: `${SITE_URL}/book/${book.slug}`,
      siteName: 'Rhythm Read',
      images: [{ url: book.cover, alt: `${book.title} cover` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${book.title} — Read Online | Rhythm Read`,
      description,
      images: [book.cover],
    },
    robots: { index: true, follow: true },
  };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await findBook(slug);
  if (!book) notFound();

  const session = await auth();
  const readLabel = book.free ? 'read — free' : `Sign in & read · $${book.price.toFixed(2)}`;
  const readHref = `/read/${book.slug}`;
  const libraryHref = session?.user?.email ? '/library' : `/login?callbackUrl=${encodeURIComponent('/library')}`;

  const bookLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    description: book.description,
    image: book.cover,
    genre: book.category,
    url: `${SITE_URL}/book/${book.slug}`,
    publisher: { '@type': 'Organization', name: 'Rhythm Read', url: SITE_URL },
    offers: {
      '@type': 'Offer',
      price: book.free ? 0 : book.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}${readHref}`,
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Discover', item: `${SITE_URL}/discover` },
      { '@type': 'ListItem', position: 3, name: book.title, item: `${SITE_URL}/book/${book.slug}` },
    ],
  };

  return (
    <main>
      <BookAnalytics slug={book.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(bookLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }} />

      <section className="book-detail-page">
        <div className="container book-detail-grid">
          <div className="book-detail-cover glass">
            <img src={book.cover} alt={`${book.title} book cover`} />
          </div>
          <div className="book-detail-copy">
            <span className="pill">{book.category}</span>
            <h1>{book.title}</h1>
            <p className="book-detail-description">{book.description}</p>
            <div className="book-byline"><b>By {book.author}</b><span>·</span><span className="rating"><Star size={14} fill="currentColor" /> Reader community</span></div>
            <div className="book-detail-actions">
            <Link className="btn btn-dark" href={readHref as any}>{readLabel}</Link>
            <Link className="btn" href={libraryHref as any}>My Library</Link>
            </div>
            <p className="book-detail-note">A Google sign-in is required before opening any book. Free books remain free to read after sign-in; paid books also require a verified purchase.</p>
          </div>
        </div>
      </section>

      <section className="book-about-section">
        <div className="container split book-about-grid">
          <div>
            <div className="eyebrow">About this book</div>
            <h2>A reading experience, not a file cabinet.</h2>
          </div>
          <div>
            <p>Rhythm Read keeps original PDFs in private storage and protects every reading session behind Google sign-in. Paid editions add a second access check for a verified purchase, while your account powers your library, comments, and reactions.</p>
            <Link className="btn" href="/discover">More books <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>

      <section className="book-community-section">
        <div className="container">
          <BookSocial slug={book.slug} />
        </div>
      </section>
    </main>
  );
}
