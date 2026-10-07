# Rhythm Read production security verification

Run these checks after deployment. The first six should be done with a normal reader account; the admin checks should be done only with the administrator account.

## Browser/API access checks

- A normal signed-in user requesting `/api/admin/books`, `/api/admin/analytics`, `/api/admin/publishers`, or `/api/admin/storage/presign` must receive `403`.
- A normal browser role must not be able to query `public.users`, `public.orders`, `public.purchases`, `public.audit_logs`, `public.book_views`, or other private tables through the Supabase Data API.
- `/api/books/<slug>/file` must return `402` for a paid book the user has not purchased.
- After verified payment, `/api/books/<slug>/file` may return a short-lived redirect. The underlying `books` bucket must still be private.
- A deleted or draft/unpublished book must not return its PDF.

## Storage checks

- Supabase Storage > `books` must show `Public = false`.
- Public bucket URLs must not return the PDF/cover directly.
- Admin uploads must be PDF/JPG/PNG/WEBP only.
- PDFs are limited to 300 MB by the application/storage configuration; covers are limited to 10 MB by the application.

## Payment checks

- Changing `amount` or `currency` in the browser must not change the server-created order amount.
- A PayHere notification with a bad hash must be rejected.
- Replaying the same payment notification must not create another purchase.
- A paid order must not be downgraded to `PENDING`, `FAILED`, or `CANCELLED`.
- A refunded order must not become paid again; the purchase entitlement is revoked on a verified refund.

## Account/security checks

- Production `NEXT_PUBLIC_SITE_URL` must be the exact HTTPS site URL.
- `SUPABASE_SECRET_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, and `PAYHERE_MERCHANT_SECRET` must not appear in client code or public source control.
- The Google administrator account should have MFA enabled.
- Rotate any secret that has previously been exposed publicly.

## What this cannot guarantee

No web application can honestly guarantee 100% protection. Zero-day vulnerabilities in the framework/provider, a compromised administrator account, stolen credentials, compromised dependencies, or an insecure device can still break the security boundary. The correct target is layered defenses, least privilege, short-lived access, server-side authorization, monitoring, patching, backups, and key rotation.
