'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';

function safeCallbackUrl(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('/');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(safeCallbackUrl(params.get('callbackUrl')));
  }, []);

  async function login() {
    setLoading(true);
    await signIn('google', { callbackUrl });
    setLoading(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card glass">
        <div className="auth-mark"><BookOpen size={18} /> RHYTHMREAD</div>
        <div className="eyebrow">The Rhythm of Digital Reading</div>
        <h1>Welcome back to your shelf.</h1>
        <p>A Google sign-in is required to open and read every book on Rhythm Read. Your account also powers your personal library, purchases, comments, reactions, and synced reading experience.</p>
        <button className="btn btn-dark auth-google-btn" onClick={login} disabled={loading}>
          {loading ? 'Opening Google…' : 'Continue with Google'}
          <ArrowRight size={15} />
        </button>
        <div className="auth-footnote">Your Google account is used only to create and protect your Rhythm Read reader account.</div>
        <Link className="auth-back" href="/">← Back to Rhythm Read</Link>
      </section>
    </main>
  );
}
