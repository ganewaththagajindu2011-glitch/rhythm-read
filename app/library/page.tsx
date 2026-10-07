import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getCatalog } from '@/lib/catalog';
import { getUserByEmail } from '@/lib/db-users';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Library',
  description: 'Your personal Rhythm Read library with free reads, purchased ebooks, and reading access.',
  robots: { index: false, follow: false },
};

export default async function LibraryPage() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) redirect('/login?callbackUrl=%2Flibrary');

  const user = await getUserByEmail(email);
  if (!user) redirect('/login?callbackUrl=%2Flibrary');

  const [books, purchaseResult] = await Promise.all([
    getCatalog(),
    supabaseAdmin.from('purchases').select('book_id').eq('user_id', user.id),
  ]);

  const purchasedIds = new Set((purchaseResult.data ?? []).map((row) => row.book_id));
  const libraryBooks = books.filter((book) => book.free || purchasedIds.has(book.id));

  return (
    <main>
      <section className="library-page">
        <div className="container">
          <div className="library-hero glass">
            <div>
              <div className="eyebrow">My Library</div>
              <h1>Continue your story.</h1>
              <p>Welcome back{user.name ? `, ${user.name.split(/\s+/)[0]}` : ''}. Your Google account is active, so you can open your available books without signing in again.</p>
            </div>
            <div className="library-account">
              {user.image ? <img src={user.image} alt="" /> : <span>{(user.name || 'R').slice(0, 1).toUpperCase()}</span>}
              <small>{user.email}</small>
            </div>
          </div>

          <div className="library-summary">
            <div><strong>{libraryBooks.length}</strong><span>available books</span></div>
            <div><strong>{purchasedIds.size}</strong><span>purchased</span></div>
            <Link className="btn btn-dark" href="/discover">Explore more</Link>
          </div>

          {purchaseResult.error ? (
            <div className="library-note">Your purchased titles could not be loaded right now. Free books are still available from Discover.</div>
          ) : null}

          {libraryBooks.length ? (
            <div className="book-grid library-grid">
              {libraryBooks.map((book) => (
                <article key={book.id} className="book-card glass">
                  <div className="cover"><img src={book.cover} alt={`${book.title} cover`} loading="lazy" /></div>
                  <div className="book-meta">
                    <span className="pill">{book.free ? 'Free' : 'Purchased'}</span>
                    <h2>{book.title}</h2>
                    <p>{book.author} · {book.category}</p>
                    <div className="library-card-actions">
                      <Link href={`/read/${book.slug}`} className="btn btn-dark">Read now</Link>
                      <Link href={`/book/${book.slug}`} className="btn">Details</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="library-empty glass">
              <h2>Your shelf is waiting.</h2>
              <p>Explore free reads or purchase an ebook and it will appear here automatically.</p>
              <Link className="btn btn-dark" href="/discover">Browse books</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
