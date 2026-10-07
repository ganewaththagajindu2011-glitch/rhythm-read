import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card glass">
        <div className="eyebrow">404 · Page not found</div>
        <h1>That page has left the shelf.</h1>
        <p>The page you requested does not exist or is no longer published.</p>
        <div className="hero-actions">
          <Link href="/" className="btn btn-dark">Back home</Link>
          <Link href="/discover" className="btn">Discover books</Link>
        </div>
      </section>
    </main>
  );
}
