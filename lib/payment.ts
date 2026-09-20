import { createHash } from 'node:crypto';

export type PayHereMode = 'sandbox' | 'live';

export function getPayHereMode(): PayHereMode {
  return process.env.PAYHERE_MODE === 'live' ? 'live' : 'sandbox';
}

export function getPayHereCheckoutUrl() {
  return getPayHereMode() === 'live'
    ? 'https://www.payhere.lk/pay/checkout'
    : 'https://sandbox.payhere.lk/pay/checkout';
}

function md5(value: string) {
  return createHash('md5').update(value).digest('hex').toUpperCase();
}

export function generatePayHereHash(args: {
  merchantId: string;
  orderId: string;
  amount: number;
  currency: string;
  merchantSecret: string;
}) {
  const amount = args.amount.toFixed(2);
  return md5(
    args.merchantId +
      args.orderId +
      amount +
      args.currency +
      md5(args.merchantSecret),
  );
}

export function verifyPayHereNotification(args: {
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  statusCode: string;
  md5sig: string;
  merchantSecret: string;
}) {
  const expected = md5(
    args.merchantId +
      args.orderId +
      args.amount +
      args.currency +
      args.statusCode +
      md5(args.merchantSecret),
  );

  return expected === args.md5sig.toUpperCase();
}
