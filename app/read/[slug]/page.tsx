import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findBook } from '@/lib/catalog';
import { PdfReader } from '@/app/components/pdf-reader';
import { AdSlot } from '@/app/components/ad-slot';
import { BookAnalytics } from '@/app/components/book-analytics';

export default async function ReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await findBook(slug);
  if (!book) notFound();

  return (
    <main className="reader-shell">
      <BookAnalytics slug={book.slug} trackView={false} />
      <div className="reader-bar glass">
        <Link href={`/book/${book.slug}`}>← Back</Link>
        <strong>{book.title}</strong>
        <span>{book.category}</span>
      </div>

      <article className="reader-body reader-body-custom">
        <div className="eyebrow">{book.category} · {book.author}</div>
        <h1>{book.title}</h1>
        <p className="lead">A responsive Rhythm Read experience that scales the uploaded PDF to the reading device.</p>

        {book.free ? <AdSlot placement="reader-top" /> : null}

        {book.pdfUrl && book.free ? (
          <PdfReader src={book.pdfUrl} title={book.title} />
        ) : (
          <div className="reader-state reader-locked">
            <strong>Premium book</strong>
            <span>Purchase this title to unlock the secure reader.</span>
          </div>
        )}

        {book.free ? <AdSlot placement="reader-bottom" /> : null}
      </article>
    </main>
  );
}
