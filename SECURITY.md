# Rhythm Read security status

## Implemented in the current project
- Private object storage for original books.
- Server-side premium ownership checks on every reader file request.
- Short-lived signed reader access (60 seconds for premium PDFs).
- PayHere `md5sig` verification before success plus amount/currency matching against the order.
- HTTPS security headers including HSTS, X-Content-Type-Options and X-Frame-Options.
- Secure Auth.js secret usage via server-side environment variables.
- Admin-only book creation/edit/delete and storage presigning with server-side session/email checks.
- Basic same-origin checks on state-changing admin/checkout requests.
- Basic in-process rate limiting on high-abuse endpoints.
- Audit log entries for admin book edits/deletes.

## Required before calling the site fully production-hardened
- Run `SECURITY-HARDENING.sql` in Supabase.
- Enable/verify database RLS and least-privilege grants for all private tables.
- Keep the `books` bucket private and use signed URLs only.
- Add distributed rate limiting before significant traffic.
- Add admin 2FA for the administrator account.
- Add upload size/content validation and malware scanning.
- Keep all `SUPABASE_SECRET_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, and PayHere merchant secrets server-side and out of Git/source/client bundles.
- Keep dependencies patched and test backups/restores.

## Important limitation

No web application can honestly guarantee that user data can never be stolen. The target is layered access control, least privilege, secure sessions, private storage, validation, monitoring and rapid key rotation.
