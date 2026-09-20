'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, CreditCard } from 'lucide-react';

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', address: '', city: '', country: 'Sri Lanka' });
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.user) return;
    fetch(`/api/books/${encodeURIComponent(slug)}/summary`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBook(data.book);
      })
      .catch((e) => setError(e.message || 'Could not load the book.'))
      .finally(() => setLoading(false));
  }, [session, slug]);

  const returnState = searchParams.get('status');

  const total = useMemo(() => Number(book?.price ?? 0), [book]);

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function startPayment(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/payhere/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start payment.');

      const formEl = document.createElement('form');
      formEl.method = 'POST';
      formEl.action = data.checkoutUrl;
      Object.entries(data.params).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value ?? '');
        formEl.appendChild(input);
      });
      document.body.appendChild(formEl);
      formEl.submit();
    } catch (e: any) {
      setError(e.message || 'Could not start payment.');
      setSubmitting(false);
    }
  }

  if (status === 'loading' || loading) {
    return <main className="auth-page"><section className="auth-card glass"><p>Preparing secure checkout…</p></section></main>;
  }

  if (status !== 'authenticated') {
    return <main className="auth-page"><section className="auth-card glass"><h1>Sign in to continue.</h1><Link className="btn btn-dark" href={`/login?callbackUrl=/checkout/${slug}`}>Continue with Google</Link></section></main>;
  }

  if (returnState === 'cancelled') {
    return <main className="auth-page"><section className="auth-card glass"><h1>Payment cancelled.</h1><p>Your order was not marked as paid.</p><Link className="btn" href={`/book/${slug}`}>Back to book</Link></section></main>;
  }

  return (
    <main className="checkout-page">
      <div className="container checkout-layout">
        <section className="checkout-card glass">
          <div className="eyebrow">Secure checkout</div>
          <h1>Complete your purchase.</h1>
          <p className="checkout-copy">Your card details are entered on PayHere’s secure payment gateway. Rhythm Read does not store raw card numbers or CVV.</p>

          <form onSubmit={startPayment} className="checkout-form">
            <div className="checkout-grid-2">
              <label><span>First name</span><input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required /></label>
              <label><span>Last name</span><input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required /></label>
            </div>
            <label><span>Email</span><input value={session.user?.email ?? ''} readOnly /></label>
            <label><span>Phone</span><input value={form.phone} onChange={(e) => setField('phone', e.target.value)} required /></label>
            <label><span>Address</span><textarea value={form.address} onChange={(e) => setField('address', e.target.value)} required /></label>
            <div className="checkout-grid-2">
              <label><span>City</span><input value={form.city} onChange={(e) => setField('city', e.target.value)} required /></label>
              <label><span>Country</span><input value={form.country} onChange={(e) => setField('country', e.target.value)} required /></label>
            </div>

            {error ? <div className="checkout-error">{error}</div> : null}

            <button className="btn btn-dark checkout-pay-btn" disabled={submitting}>
              <CreditCard size={16} />
              {submitting ? 'Opening secure payment…' : 'Continue to secure payment'}
            </button>

            <div className="checkout-security"><ShieldCheck size={16} /><span>Payment verification is completed server-side before your library is unlocked.</span></div>
          </form>
        </section>

        <aside className="checkout-summary glass">
          <div className="eyebrow">Order summary</div>
          <h2>{book?.title ?? 'Book'}</h2>
          <p>Digital edition</p>
          <div className="checkout-total"><span>Total</span><strong>{book?.currency ?? 'USD'} {total.toFixed(2)}</strong></div>
          <Link href={`/book/${slug}`} className="checkout-back">← Back to book</Link>
        </aside>
      </div>
    </main>
  );
}
