'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    await signIn('google', { callbackUrl: '/' });
    setLoading(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card glass">
        <div className="auth-mark"><BookOpen size={18} /> RHYTHMREAD</div>
        <div className="eyebrow">The Rhythm of Digital Reading</div>
        <h1>Welcome back to your shelf.</h1>
        <p>Sign in to save your library, continue reading, buy books, and apply to publish your own.</p>
        <button className="btn btn-dark auth-google-btn" onClick={login} disabled={loading}>
          {loading ? 'Opening Google…' : 'Continue with Google'}
          <ArrowRight size={15} />
        </button>
        <div className="auth-footnote">One account can read and, after approval, publish.</div>
        <Link className="auth-back" href="/">← Back to Rhythm Read</Link>
      </section>
    </main>
  );
}
