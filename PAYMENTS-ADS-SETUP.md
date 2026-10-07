# Rhythm Read — Payment + AdSense setup

## PayHere

Set these server-side environment variables:

PAYHERE_MODE=sandbox
PAYHERE_MERCHANT_ID=YOUR_SANDBOX_MERCHANT_ID
PAYHERE_MERCHANT_SECRET=YOUR_SANDBOX_MERCHANT_SECRET

For production change PAYHERE_MODE=live and use the Merchant Secret issued for your real domain/app.

The payment flow is:
1. User signs in.
2. User enters billing details on Rhythm Read.
3. App creates a PENDING order in Supabase.
4. Server creates the PayHere hash.
5. Browser posts the payment form to PayHere.
6. PayHere calls /api/payhere/notify.
7. Server verifies md5sig before marking the order PAID.
8. The server creates one purchase record (idempotent).
9. The paid reader checks the purchase record before issuing a 60-second signed storage URL.

A public HTTPS notify_url is required for real PayHere callbacks; localhost cannot receive the notification.

## AdSense

After Google approves your site, set:

NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT=XXXXXXXXXX

The app includes `public/ads.txt` as a placeholder. Replace it with Google's exact seller line after approval.

Ads are rendered only on free-reader placements. Paid readers remain ad-free.

## Security

Do not put PAYHERE_MERCHANT_SECRET or Supabase server secret keys in client-side code.
Do not store card numbers or CVV in Supabase.
Do not unlock a paid book based on the return URL alone; only the verified server callback updates the order.
