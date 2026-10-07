import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculateSale } from '@/lib/commission';
import { verifyPayHereNotification } from '@/lib/payment';
import { noStoreJson, rateLimit, rateLimitedResponse, validUuid } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const limited = rateLimit(req, 'payhere-notify', 60, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);

  const rawLength = req.headers.get('content-length');
  if (rawLength) {
    const length = Number(rawLength);
    if (!Number.isFinite(length) || length > 16 * 1024) return new NextResponse('Request too large', { status: 413 });
  }

  const form = await req.formData();
  const merchantId = String(form.get('merchant_id') ?? '').trim();
  const orderId = String(form.get('order_id') ?? '').trim();
  const amount = String(form.get('payhere_amount') ?? '').trim();
  const currency = String(form.get('payhere_currency') ?? '').trim().toUpperCase();
  const statusCode = String(form.get('status_code') ?? '').trim();
  const md5sig = String(form.get('md5sig') ?? '').trim();
  const paymentId = String(form.get('payment_id') ?? '').trim().slice(0, 120);

  if (!validUuid(orderId) || !/^\d+(?:\.\d{1,2})?$/.test(amount) || !/^[A-Z]{3}$/.test(currency) || !['2', '0', '-1', '-2', '-3'].includes(statusCode)) {
    return new NextResponse('Invalid notification', { status: 400 });
  }

  const secret = process.env.PAYHERE_MERCHANT_SECRET ?? '';
  const expectedMerchantId = process.env.PAYHERE_MERCHANT_ID ?? '';
  if (!secret || !expectedMerchantId) return new NextResponse('Payment provider is not configured', { status: 503 });
  if (merchantId !== expectedMerchantId) return new NextResponse('Invalid merchant', { status: 400 });

  const valid = verifyPayHereNotification({ merchantId, orderId, amount, currency, statusCode, md5sig, merchantSecret: secret });
  if (!valid) return new NextResponse('Invalid signature', { status: 400 });

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id,user_id,book_id,amount,currency,status,provider_payment_id')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    console.error('PayHere order lookup failed');
    return new NextResponse('Database error', { status: 500 });
  }
  if (!order) return new NextResponse('Order not found', { status: 404 });

  const mappedStatus = statusCode === '2'
    ? 'PAID'
    : statusCode === '0'
      ? 'PENDING'
      : statusCode === '-1'
        ? 'CANCELLED'
        : statusCode === '-3'
          ? 'REFUNDED'
          : 'FAILED';

  const orderAmount = Number(order.amount);
  const notifiedAmount = Number(amount);
  if (!Number.isFinite(notifiedAmount) || notifiedAmount.toFixed(2) !== orderAmount.toFixed(2) || currency !== order.currency) {
    return new NextResponse('Order amount/currency mismatch', { status: 400 });
  }

  if (mappedStatus === 'PAID' && !paymentId) return new NextResponse('Missing payment id', { status: 400 });

  if (paymentId) {
    const { data: reused, error: reusedError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('provider_payment_id', paymentId)
      .neq('id', order.id)
      .maybeSingle();
    if (reusedError) return new NextResponse('Database error', { status: 500 });
    if (reused) return new NextResponse('Payment already associated with another order', { status: 409 });
  }

  // Terminal states never get downgraded by a later/replayed notification.
  if (order.status === 'REFUNDED') return new NextResponse('OK');
  if (order.status === 'PAID' && mappedStatus !== 'REFUNDED') {
    if (paymentId && order.provider_payment_id && paymentId !== order.provider_payment_id) {
      return new NextResponse('Payment id mismatch', { status: 409 });
    }
    return new NextResponse('OK');
  }

  if (mappedStatus === 'REFUNDED' && order.status !== 'PAID') {
    return new NextResponse('Invalid refund state', { status: 409 });
  }

  if (mappedStatus === 'PAID') {
    const { error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .upsert(
        {
          user_id: order.user_id,
          book_id: order.book_id,
          order_id: order.id,
          purchased_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,book_id' },
      );
    if (purchaseError) {
      console.error('Purchase creation failed');
      return new NextResponse('Database error', { status: 500 });
    }
  }

  if (mappedStatus === 'REFUNDED') {
    const { error: revokeError } = await supabaseAdmin
      .from('purchases')
      .delete()
      .eq('order_id', order.id);
    if (revokeError) {
      console.error('Purchase revoke failed');
      return new NextResponse('Database error', { status: 500 });
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      status: mappedStatus,
      provider: 'PAYHERE',
      provider_payment_id: paymentId || order.provider_payment_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  if (updateError) {
    console.error('PayHere order update failed');
    return new NextResponse('Database error', { status: 500 });
  }

  if (mappedStatus === 'PAID') {
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('owner_id')
      .eq('id', order.book_id)
      .maybeSingle();
    if (bookError) return new NextResponse('Database error', { status: 500 });

    if (book?.owner_id) {
      const sale = calculateSale(Number(order.amount));
      const { error: commissionError } = await supabaseAdmin
        .from('commissions')
        .upsert(
          {
            order_id: order.id,
            gross_amount: sale.gross,
            platform_rate: 0.05,
            platform_amount: sale.platformCommission,
            author_amount: sale.authorEarnings,
            payout_status: 'UNPAID',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'order_id' },
        );
      if (commissionError) console.error('Commission creation failed');
    }
  }

  return new NextResponse('OK', { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
