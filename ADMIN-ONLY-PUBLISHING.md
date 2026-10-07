# Admin-only publishing

Only the account whose email matches `ADMIN_EMAIL` can upload, edit, publish, or remove e-books.

Readers can:
- browse published books
- read free books
- purchase paid books later when the payment layer is connected

Readers and publishers cannot create book records or upload book files through the API.

## Supabase
Run `SUPABASE-ADMIN-ONLY.sql` in the Supabase SQL Editor.

Keep the `books` bucket private.

## Environment
Required server-side values:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=books
AUTH_SECRET=...
ADMIN_EMAIL=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.

## Upload flow

1. Admin signs in.
2. `/api/admin/storage/presign` verifies the admin email.
3. Browser uploads cover/PDF directly to Supabase Storage using a short-lived signed upload token.
4. `/api/admin/books` verifies the admin again and stores only metadata + storage keys.
5. The book is immediately `PUBLISHED` because the administrator owns the catalog.

## Publisher upload

Publisher uploading is disabled. `/seller/publish` explains that publishing is admin-only.
