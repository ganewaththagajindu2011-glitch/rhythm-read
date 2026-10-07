# Rhythm Read — maximum production security hardening

Absolute 100% security cannot be guaranteed for any internet-facing service. This package is hardened so the normal browser roles cannot read the private application tables, admin APIs require the configured administrator Google identity, paid PDFs require a verified purchase, state-changing admin endpoints reject cross-site requests, uploads are typed/size-limited, payment notifications are signature-checked, and payment/order state is protected against downgrades.

## Required before production

1. Run `SECURITY-PRODUCTION-FINAL.sql` in the Supabase SQL editor after the other migrations.
2. Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS production URL.
3. Keep `SUPABASE_SECRET_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, and `PAYHERE_MERCHANT_SECRET` server-only. Never prefix them with `NEXT_PUBLIC_`.
4. Rotate any secret that has ever been pasted into chat, source control, screenshots, or public logs.
5. Deploy, then test: non-admin `/api/admin/*` => 403/redirect; free reader => works; paid reader without purchase => 402; paid reader after verified payment => works; direct Supabase bucket URL => not public.
6. Keep the `books` bucket private. Do not add a public read policy to `storage.objects`.
7. Protect the Google administrator account with strong account security / MFA.

## Important limitation

This package does not promise protection against a zero-day in Next.js, Auth.js, Google, Supabase, PayHere, PDF.js, a compromised administrator account, leaked credentials, or a malicious/compromised dependency. Keep dependencies and platform patches current and rotate keys immediately after any suspected exposure.
