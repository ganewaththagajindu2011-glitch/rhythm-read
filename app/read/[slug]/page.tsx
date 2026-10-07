import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { findBook } from '@/lib/catalog';
import { PdfReader } from '@/app/components/pdf-reader';
import { AdSlot } from '@/app/components/ad-slot';
import { BookAnalytics } from '@/app/components/book-analytics';
import { BookSocial } from '@/app/components/book-social';
import { auth } from '@/auth';
import { getUserByEmail } from '@/lib/db-users';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<{ title: string; robots: { index: boolean; follow: boolean } }> {
  const { slug } = await params;
  const book = await findBook(slug);
  return {
    title: book ? `${book.title} — Reader` : 'Reader',
    robots: { index: false, follow: false },
  };
}

export default async function ReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await findBook(slug);
  if (!book) notFound();

  // Every edition requires a verified Google/NextAuth session before reading.
  // Paid editions additionally require a verified PAID purchase.
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) redirect(`/login?callbackUrl=${encodeURIComponent(`/read/${book.slug}`)}`);

  const user = await getUserByEmail(email);
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/read/${book.slug}`)}`);

  if (!book.free) {
    const { data: purchase } = await supabaseAdmin
      .from('purchases')
      .select('id,order_id')
      .eq('user_id', user.id)
      .eq('book_id', book.id)
      .maybeSingle();

    if (!purchase) redirect(`/checkout/${book.slug}`);

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('status')
      .eq('id', purchase.order_id)
      .maybeSingle();

    if (order?.status !== 'PAID') redirect(`/checkout/${book.slug}`);
  }

  return (
    <main className="reader-shell">
      <BookAnalytics slug={book.slug} trackView={false} />
      <div className="reader-bar glass">
        <Link href={`/book/${book.slug}`}>← Back</Link>
        <strong>{book.title}</strong>
        <span>{book.category}</span>
      </div>

      <article className="reader-body reader-body-custom glass">
        <div className="eyebrow">{book.category} · {book.author}</div>
        <h1>{book.title}</h1>
        <p className="lead">{book.free ? 'Your Google account has been verified. Enjoy this free edition.' : 'Your Google account and purchase have been verified. Enjoy your private reading access.'}</p>

        {book.free ? <AdSlot placement="reader-top" /> : null}

        {book.pdfUrl ? (
          <PdfReader src={book.pdfUrl} title={book.title} />
        ) : (
          <div className="reader-state reader-locked glass">
            <strong>Reader unavailable</strong>
            <span>This edition does not have a PDF attached yet.</span>
          </div>
        )}

        {book.free ? <AdSlot placement="reader-bottom" /> : null}
        <BookSocial slug={book.slug} />
      </article>
    </main>
  );
}
