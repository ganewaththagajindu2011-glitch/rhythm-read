# Rhythm Read security hardening

The current project now has additional server-side defenses:

- Admin book APIs and admin storage presigning require the logged-in admin email, same-origin requests, and basic rate limiting.
- PayHere checkout creation is same-origin + rate-limited.
- PayHere notify now checks the signed notification amount/currency against the database order before granting access.
- Paid book file access remains server-side ownership checked and uses a 60-second signed URL.
- Public browser database access is reduced to published books and active categories.
- User, order, purchase, analytics, publisher, commission and audit tables are server-only at the database permission layer.
- The private `books` Storage bucket is forced to remain private.

## Required Supabase step

Run `SECURITY-HARDENING.sql` in the Supabase SQL Editor.

After running it, test:

1. Signed-out visitor can browse published books/categories.
2. Signed-out visitor cannot query the `users`, `orders`, `purchases`, `reading_progress`, `wishlists`, `reviews`, `publisher_profiles`, `commissions`, `payout_accounts`, `audit_logs`, `book_views`, or `reading_sessions` tables through the publishable key.
3. Only the configured admin account can reach `/admin` and `/api/admin/*`.
4. A paid book can only be opened by its purchaser.
5. The `books` bucket stays private.

## Important limitation

The in-process rate limiter is defense-in-depth. Vercel/serverless instances do not share memory, so a distributed limiter (for example a managed edge/Redis rate limiter) should be added before the site becomes high-traffic.
