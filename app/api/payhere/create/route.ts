import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generatePayHereHash, getPayHereCheckoutUrl } from '@/lib/payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizePart(value: string, fallback: string) {
  return value.replace(/[^A-Za-z0-9 _.'-]/g, '').slice(0, 80) || fallback;
}

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const slug = String(body?.slug ?? '').trim();
  const firstName = sanitizePart(String(body?.firstName ?? ''), 'Reader');
  const lastName = sanitizePart(String(body?.lastName ?? ''), 'User');
  const phone = String(body?.phone ?? '').trim();
  const address = String(body?.address ?? '').trim();
  const city = sanitizePart(String(body?.city ?? ''), 'City');
  const country = sanitizePart(String(body?.country ?? ''), 'Sri Lanka');

  if (!slug || !phone || !address || !city || !country) {
    return NextResponse.json({ error: 'Please complete all billing details.' }, { status: 400 });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id,email,name')
    .eq('email', email)
    .maybeSingle();
  if (userError || !user) return NextResponse.json({ error: 'User account is not ready yet.' }, { status: 400 });

  const { data: book, error: bookError } = await supabaseAdmin
    .from('books')
    .select('id,title,price,currency,is_free,status')
    .eq('slug', slug)
    .maybeSingle();
  if (bookError || !book || book.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Book is unavailable.' }, { status: 404 });
  }
  if (book.is_free || Number(book.price) <= 0) {
    return NextResponse.json({ error: 'This book is free. Use the reader instead.' }, { status: 400 });
  }

  const { data: owned } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('book_id', book.id)
    .maybeSingle();
  if (owned) return NextResponse.json({ error: 'You already own this book.' }, { status: 409 });

  const amount = Number(book.price);
  const currency = String(book.currency || 'USD');
  if (!['USD', 'LKR'].includes(currency)) {
    return NextResponse.json({ error: 'Unsupported checkout currency.' }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: user.id,
      book_id: book.id,
      amount,
      currency,
      status: 'PENDING',
      provider: 'PAYHERE',
      billing_first_name: firstName,
      billing_last_name: lastName,
      billing_email: email,
      billing_phone: phone,
      billing_address: address,
      billing_city: city,
      billing_country: country,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('Order creation failed', orderError);
    return NextResponse.json({ error: 'Could not create the order.' }, { status: 500 });
  }

  const merchantId = process.env.PAYHERE_MERCHANT_ID ?? '';
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET ?? '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  if (!merchantId || !merchantSecret) {
    return NextResponse.json({ error: 'Payment gateway is not configured yet.' }, { status: 503 });
  }

  const hash = generatePayHereHash({
    merchantId,
    orderId: order.id,
    amount,
    currency,
    merchantSecret,
  });

  return NextResponse.json({
    checkoutUrl: getPayHereCheckoutUrl(),
    params: {
      merchant_id: merchantId,
      return_url: `${siteUrl}/checkout/${encodeURIComponent(slug)}?status=return`,
      cancel_url: `${siteUrl}/checkout/${encodeURIComponent(slug)}?status=cancelled`,
      notify_url: `${siteUrl}/api/payhere/notify`,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
      city,
      country,
      order_id: order.id,
      items: book.title,
      currency,
      amount: amount.toFixed(2),
      hash,
    },
  });
}
