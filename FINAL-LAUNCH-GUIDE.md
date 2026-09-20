# Rhythm Read — Final Launch Guide

## What is now included
- Supabase-only database + private Storage architecture.
- Admin-only book publishing with cover + PDF upload.
- Admin deletion: removes the book record and attempts to remove its stored cover/PDF.
- Book analytics: views and reading time tracked for the last 30 days.
- Admin analytics dashboard at `/admin/analytics`.
- Google login session UI with profile image and time-based greeting.
- PayHere sandbox integration foundation with server-side notification verification.
- AdSense slots are opt-in and disabled until a real publisher ID is provided.
- Technical SEO: metadata, canonical URLs, Open Graph, robots, sitemap, Organization/WebSite JSON-LD, Book JSON-LD.
- Contact page and clear Privacy, Terms, and Refund pages.
- Contact details: Gajindu Anupama · 0777614202 · gajindumax@gmail.com.

## Required Supabase migration
Run these SQL files in order when setting up a fresh database, or only the missing statements on an existing project:
1. `schema.sql`
2. `SUPABASE-SETUP.sql`
3. `SUPABASE-ADMIN-ONLY.sql`
4. `PAYMENTS-ADS-MIGRATION.sql`
5. `ANALYTICS-MIGRATION.sql`

## Environment variables
Never commit `.env.local`. Use `.env.local.example` as the template. Rotate any credentials previously exposed in chat before launch.

## Production hosting
For this paid/global eBook business, do not use Vercel Hobby for production because the current Hobby terms restrict it to personal/non-commercial use. Vercel Pro is currently listed at $20/month with $20 usage credit. Supabase Free is useful for early testing, but its current free tier includes 500 MB database, 1 GB file storage, 5 GB egress, and a 50 MB max upload size; it may pause after one week of inactivity. Resend Free currently includes 3,000 emails/month and 100/day. See provider docs before launch for current quotas.

## Low-cost domain recommendation
Best brand choice: `rhythmread.com` if available at purchase time. Do not use `rhythmread.co` because a live site is already associated with that domain. Backups: `rhythmreads.com`, `readrhythm.com`, `getrhythmread.com`.

Porkbun currently lists `.com` at about $11.08/year and exposes first-year and renewal pricing clearly. Domain availability and price must be rechecked at checkout.

## Launch checklist
- Rotate Supabase secret + Google OAuth secret.
- Run all required SQL migrations.
- Add the real Supabase URL/publishable/secret keys to hosting environment variables.
- Configure Google OAuth redirect URI for the final domain.
- Configure PayHere production merchant credentials and a public HTTPS `notify_url`.
- Verify payment checksum and test idempotency.
- Configure an AdSense account and only enable ads after the site is approved.
- Verify `/sitemap.xml`, `/robots.txt`, canonical URLs, and Search Console ownership.
- Add the final domain and set `NEXT_PUBLIC_SITE_URL`.
- Run `npm install`, `npm run typecheck`, and `npm run build` before deployment.


## Latest admin/book fixes
- Admin can edit title, author, description, category, price, free/paid, featured, reader introduction, and optionally replace cover/PDF.
- Delete removes a book from the public catalog and invalidates cached public routes; books with purchase history are protected from permanent deletion and should be unpublished instead.
- Admin update/delete routes validate input, enforce admin access server-side, clean up replaced storage objects, and write audit logs.
- Home and discover pages are dynamic so deleted/unpublished books disappear without stale static rendering.
