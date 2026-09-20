import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculateSale } from '@/lib/commission';
import { verifyPayHereNotification } from '@/lib/payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const form = await req.formData();

  const merchantId = String(form.get('merchant_id') ?? '');
  const orderId = String(form.get('order_id') ?? '');
  const amount = String(form.get('payhere_amount') ?? '');
  const currency = String(form.get('payhere_currency') ?? '');
  const statusCode = String(form.get('status_code') ?? '');
  const md5sig = String(form.get('md5sig') ?? '');
  const paymentId = String(form.get('payment_id') ?? '');

  const secret = process.env.PAYHERE_MERCHANT_SECRET ?? '';
  const expectedMerchantId = process.env.PAYHERE_MERCHANT_ID ?? '';

  if (!secret || !expectedMerchantId) {
    return new NextResponse('Payment provider is not configured', { status: 503 });
  }

  if (merchantId !== expectedMerchantId) {
    return new NextResponse('Invalid merchant', { status: 400 });
  }

  const valid = verifyPayHereNotification({
    merchantId,
    orderId,
    amount,
    currency,
    statusCode,
    md5sig,
    merchantSecret: secret,
  });

  if (!valid) {
    return new NextResponse('Invalid signature', { status: 400 });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id,user_id,book_id,amount,currency,status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    console.error('PayHere order lookup failed', orderError);
    return new NextResponse('Database error', { status: 500 });
  }

  if (!order) {
    return new NextResponse('Order not found', { status: 404 });
  }

  const mappedStatus =
    statusCode === '2'
      ? 'PAID'
      : statusCode === '0'
        ? 'PENDING'
        : statusCode === '-1'
          ? 'CANCELLED'
          : statusCode === '-3'
            ? 'REFUNDED'
            : 'FAILED';

  // Idempotent: if already paid, never create a duplicate purchase.
  if (order.status === 'PAID' && mappedStatus === 'PAID') {
    return new NextResponse('OK');
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      status: mappedStatus,
      provider: 'PAYHERE',
      provider_payment_id: paymentId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  if (updateError) {
    console.error('PayHere order update failed', updateError);
    return new NextResponse('Database error', { status: 500 });
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
      console.error('Purchase creation failed', purchaseError);
      return new NextResponse('Database error', { status: 500 });
    }

    const { data: book } = await supabaseAdmin
      .from('books')
      .select('owner_id,price')
      .eq('id', order.book_id)
      .maybeSingle();

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

      if (commissionError) {
        console.error('Commission creation failed', commissionError);
        return new NextResponse('Database error', { status: 500 });
      }
    }
  }

  return new NextResponse('OK');
}
