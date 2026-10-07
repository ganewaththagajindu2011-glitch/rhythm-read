# Rhythm Read — Admin-owned catalog mode

This version intentionally disables publisher book uploads.

## Rules

- Only the account whose email equals `ADMIN_EMAIL` can upload cover files or PDFs.
- Only the administrator can create, edit, publish, or remove book records through the app API.
- Readers can browse published books and use the reader according to free/purchased access.
- The `books` Supabase Storage bucket remains private.
- Book files are uploaded directly from the admin browser to Supabase Storage using a short-lived signed upload token.
- The Next.js server never receives the full PDF body.

## Supabase SQL

Run:

`SUPABASE-ADMIN-ONLY.sql`

in the Supabase SQL Editor after your existing schema files.

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=books
AUTH_SECRET=YOUR_LONG_RANDOM_SECRET
ADMIN_EMAIL=YOUR_GOOGLE_EMAIL
AUTH_GOOGLE_ID=YOUR_GOOGLE_CLIENT_ID
AUTH_GOOGLE_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

Never put the `SUPABASE_SERVICE_ROLE_KEY` in client-side code or a `NEXT_PUBLIC_*` variable.

## Test

1. Log in using the Google account whose email is `ADMIN_EMAIL`.
2. Open `/admin`.
3. Click **Add book**.
4. Choose a cover image and PDF from the device.
5. Upload & publish.
6. Verify the book row appears in Supabase `books` and the files appear under `books/admin/...` in private Storage.
7. Open `/discover` as a normal user/browser session and verify published books are visible.
8. Try calling `/api/admin/storage/presign` and `/api/admin/books` while signed out: both must return `403`.
9. Open `/seller/publish`: it must show that publishing is disabled.

## Supabase Free plan note

The application intentionally has no artificial 10 MB / 20 MB / 50 MB PDF check. Supabase's plan limits still apply. On the Free plan, the current per-file upload limit is 50 MB.
