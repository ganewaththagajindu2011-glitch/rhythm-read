# Rhythm Read — Supabase-only connection

This version uses Supabase for Postgres, Auth-ready infrastructure, and Storage. Cloudflare R2 / local Postgres are not required.

## Environment

Create `.env.local` from `.env.example`:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only; never expose to browser code)
- SUPABASE_STORAGE_BUCKET=books
- AUTH_SECRET
- ADMIN_EMAIL
- AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET for Google OAuth

## Supabase setup

1. Run your existing `schema.sql` in Supabase SQL Editor.
2. Run `SUPABASE-SETUP.sql` to create the private `books` storage bucket.
3. Put your Supabase URL, publishable/anon key, and server-only service role key in `.env.local`.
4. Start with `npm install` and `npm run dev`.
5. Check `/test-supabase` to verify the connection.

## Storage flow

Publisher/admin requests a signed upload URL from the server. The browser uploads directly to Supabase Storage, so the PDF does not pass through the Next.js server process. Metadata is stored in the `books` table with the storage key.

## Reader flow

For free published books, the server creates a short-lived signed URL to the private PDF. Paid-book access remains blocked until the purchase/ownership layer is added in Step 5.

## Important Free-plan limit

Supabase Free currently has a 50 MB maximum file upload limit. The app does not add a smaller artificial limit, but the provider's project limit still applies.

## Existing schema migration

Because the project already has `schema.sql`, if you previously ran it, run the added `ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_key text;` lines from the bottom of `schema.sql` (or run the full file again; all statements use IF NOT EXISTS where applicable).
