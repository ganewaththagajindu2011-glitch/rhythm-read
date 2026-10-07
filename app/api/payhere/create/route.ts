import { z } from 'zod';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generatePayHereHash, getPayHereCheckoutUrl } from '@/lib/payment';
import { ensureJsonRequest, MAX_PAYMENT_BODY_BYTES, noStoreJson, rateLimit, rateLimitedResponse, sameOrigin } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const checkoutSchema = z.object({
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9](?:[a-z0-9-]{0,158}[a-z0-9])?$/),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(24).regex(/^[0-9+(). -]+$/),
  address: z.string().trim().min(2).max(240),
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(2).max(80),
});

function sanitizePart(value: string, fallback: string) {
  return value.replace(/[^A-Za-z0-9 _.'-]/g, '').slice(0, 80) || fallback;
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'payhere-create', 10, 10 * 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  const jsonCheck = ensureJsonRequest(req, MAX_PAYMENT_BODY_BYTES);
  if (!jsonCheck.ok) return jsonCheck.response;
  if (!sameOrigin(req)) return noStoreJson({ error: 'Cross-site request blocked.' }, { status: 403 });

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return noStoreJson({ error: 'Please sign in first.' }, { status: 401 });

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ error: 'Please provide valid billing details.' }, { status: 400 });
  const input = parsed.data;

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id,email,name')
    .eq('email', email)
    .maybeSingle();
  if (userError || !user) return noStoreJson({ error: 'User account is not ready yet.' }, { status: 400 });

  const { data: book, error: bookError } = await supabaseAdmin
    .from('books')
    .select('id,title,price,currency,is_free,status')
    .eq('slug', input.slug)
    .maybeSingle();
  if (bookError || !book || book.status !== 'PUBLISHED') return noStoreJson({ error: 'Book is unavailable.' }, { status: 404 });
  if (book.is_free || Number(book.price) <= 0) return noStoreJson({ error: 'This book is free. Use the reader instead.' }, { status: 400 });

  const { data: owned } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', book.id)
    .maybeSingle();
  if (owned) return noStoreJson({ error: 'You already own this book.' }, { status: 409 });

  const amount = Number(book.price);
  const currency = String(book.currency || 'USD');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000 || !['USD', 'LKR'].includes(currency)) {
    return noStoreJson({ error: 'Unsupported checkout amount or currency.' }, { status: 400 });
  }

  // Reuse a recent pending order for the same account/book so refreshes cannot
  // create an unbounded pile of unpaid orders.
  const { data: existingPending } = await supabaseAdmin
    .from('orders')
    .select('id,created_at,amount,currency')
    .eq('user_id', user.id)
    .eq('book_id', book.id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = Date.now();
  const reusable = existingPending && now - new Date(existingPending.created_at).getTime() < 30 * 60_000 &&
    Number(existingPending.amount).toFixed(2) === amount.toFixed(2) && existingPending.currency === currency;

  let orderId = reusable ? existingPending!.id : '';
  if (!orderId) {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        book_id: book.id,
        amount,
        currency,
        status: 'PENDING',
        provider: 'PAYHERE',
        billing_first_name: sanitizePart(input.firstName, 'Reader'),
        billing_last_name: sanitizePart(input.lastName, 'User'),
        billing_email: email,
        billing_phone: input.phone,
        billing_address: input.address,
        billing_city: sanitizePart(input.city, 'City'),
        billing_country: sanitizePart(input.country, 'Sri Lanka'),
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Order creation failed');
      return noStoreJson({ error: 'Could not create the order.' }, { status: 500 });
    }
    orderId = order.id;
  }

  const merchantId = process.env.PAYHERE_MERCHANT_ID ?? '';
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET ?? '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  if (!merchantId || !merchantSecret || !siteUrl) return noStoreJson({ error: 'Payment gateway is not configured yet.' }, { status: 503 });

  let returnUrl: string;
  let cancelUrl: string;
  let notifyUrl: string;
  try {
    const base = new URL(siteUrl);
    if (base.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('Production site URL must use HTTPS');
    returnUrl = new URL(`/checkout/${encodeURIComponent(input.slug)}?status=return`, base).toString();
    cancelUrl = new URL(`/checkout/${encodeURIComponent(input.slug)}?status=cancelled`, base).toString();
    notifyUrl = new URL('/api/payhere/notify', base).toString();
  } catch {
    return noStoreJson({ error: 'Payment site URL is not configured correctly.' }, { status: 503 });
  }

  const hash = generatePayHereHash({ merchantId, orderId, amount, currency, merchantSecret });

  return noStoreJson({
    checkoutUrl: getPayHereCheckoutUrl(),
    params: {
      merchant_id: merchantId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      first_name: sanitizePart(input.firstName, 'Reader'),
      last_name: sanitizePart(input.lastName, 'User'),
      email,
      phone: input.phone,
      address: input.address,
      city: sanitizePart(input.city, 'City'),
      country: sanitizePart(input.country, 'Sri Lanka'),
      order_id: orderId,
      items: book.title.slice(0, 100),
      currency,
      amount: amount.toFixed(2),
      hash,
    },
  });
}
