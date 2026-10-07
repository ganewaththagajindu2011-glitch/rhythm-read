# Rhythm Read — Production update

This package adds the requested reader/account/community/SEO/security improvements.

## What changed

- PDF reader now loads books through an authenticated same-origin PDF proxy with HTTP range support instead of sending the browser directly to a short-lived Supabase signed URL.
- PDF.js no longer depends on an external worker CDN; it uses the built-in non-worker fallback for better compatibility on mobile browsers and restricted networks.
- Free reading routes work without Google/NextAuth sign-in. Paid books additionally require a signed-in account with a verified paid purchase.
- Library is now server-side authenticated and shows free books plus the signed-in user's purchased books. Returning Google users are not asked to sign in again when opening My Library.
- Google login keeps a safe internal callback URL for protected actions such as purchases and library access.
- Added authenticated comments plus one reaction per account (Like/Dislike) with live counts.
- Added stricter server-side validation, same-origin checks, rate limits, private storage delivery, and server-only Supabase admin modules.
- Glass visual system and mobile/tablet/desktop responsive polish were added across the public reading experience.
- Added stronger technical SEO metadata, per-book keywords, Open Graph/Twitter metadata, WebSite SearchAction JSON-LD, Book/Breadcrumb JSON-LD, canonical URLs, sitemap book routes, and noindex rules for private/authenticated pages.

## Supabase step required

Run `SOCIAL-SEO-SECURITY-MIGRATION.sql` in the Supabase SQL Editor once. This creates `book_comments` and `book_reactions` and blocks direct anonymous/authenticated table writes.

The updated `schema.sql` also contains these tables for fresh installations.

## Production environment

Keep server secrets server-only. Do not put `SUPABASE_SECRET_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, or `PAYHERE_MERCHANT_SECRET` in any `NEXT_PUBLIC_*` variable.

Set `NEXT_PUBLIC_SITE_URL` to the real production HTTPS URL before deployment so canonical URLs, OAuth callbacks, same-origin protection, sitemap, and robots all use the same origin.

## SEO note

No software change can honestly guarantee a “100% Google SEO” ranking. This update implements the technical SEO foundations and makes the public book pages crawlable, descriptive, canonical, and structured-data friendly. Ranking still depends on indexing, content quality, links, search intent, performance, and Google's own systems.

## 2026-10-07 — Glass 3D + guest reading + SEO polish
- Free books can now be opened directly without Google sign-in.
- Paid books still require a signed-in account with a verified paid purchase.
- PDF reader now has a device-native fallback for phones/browsers where PDF.js fails.
- Added a mobile navigation menu so all primary links stay accessible on small screens.
- Reader Community remains available on book pages and inside the reader; Google sign-in is only required for comments/reactions and protected purchases.
- Added dedicated SEO-friendly category URLs (`/category/<slug>`) with category metadata, breadcrumbs, ItemList JSON-LD, and sitemap entries.
- Added stronger glass/3D surface styling across public UI and glass-styled admin/publisher surfaces.
- Added PWA manifest and SVG favicon.

## 2026-10-07 Liquid Glass + Google Reader Gate

- All book reading routes and PDF proxy requests require a signed-in Google account.
- Free books remain free, but no book can be opened anonymously.
- Paid books additionally require a verified PAID purchase.
- The full public website received a consistent liquid-glass + 3D visual layer, including Reader Community, cards, navigation, forms, library, checkout, footer, and reader surfaces.
