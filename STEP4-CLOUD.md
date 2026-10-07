# Step 4 — Cloud-first production foundation

This version removes the local PostgreSQL requirement from the intended deployment architecture.

## Cloud stack

- Supabase Postgres: application data and persistent catalog.
- Cloudflare R2: private PDFs + uploaded covers.
- Next.js: application and API layer.
- NextAuth/Google: authentication.
- Vercel: deployment target.

## Environment

Copy `.env.example` to `.env.local`.

### Supabase

Create a Supabase project and copy the **Postgres connection string** from the Supabase Database/Connect area. Prefer the pooled/transaction connection for a serverless deployment. Put it in:

```env
POSTGRES_URL="..."
```

No local PostgreSQL installation is required.

Run the SQL in `schema.sql` once using the Supabase SQL Editor. You do not need to run `npm run db:init` against a local machine.

### Google OAuth

Set:

```env
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_SECRET="..."
ADMIN_EMAIL="your-google-email@example.com"
```

Redirect URL during development:

`http://localhost:3000/api/auth/callback/google`

Production:

`https://YOUR-DOMAIN/api/auth/callback/google`

### Cloudflare R2

Create a bucket and API token with object read/write permissions for that bucket.

Set:

```env
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="rhythm-read"
R2_PUBLIC_BASE_URL="https://cdn.example.com"
```

`R2_PUBLIC_BASE_URL` should point at the public/custom-domain URL used for cover images. PDFs are private and are served with short-lived signed URLs.

### R2 CORS

Because the browser uploads directly to R2, configure the bucket CORS policy to allow the site origin and `PUT` requests. Example for local development:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

For production, replace the origin with the real site domain instead of using `*`.

## Large PDF upload design

The publisher page does **not** send the PDF through a Next.js API route. It uses R2 direct multipart upload in 16 MiB parts. This keeps the application server out of the large-file data path and avoids an artificial 10 MB/20 MB/50 MB application limit.

The implementation is designed for e-book sized files and works within the storage provider's object/part limits. A provider limit still exists at the storage layer; the app itself does not impose a small MB cap.

## Current publisher flow

1. Approved publisher opens `/seller/publish`.
2. Cover is uploaded directly to R2.
3. PDF is uploaded directly to R2 in parts.
4. Only metadata + storage keys are sent to `/api/books`.
5. The book is created as `PENDING` in Supabase Postgres.
6. Admin approves the book.
7. Published free books are opened through a short-lived signed PDF URL.
8. Paid books remain locked until the payment/ownership layer is connected in Step 5.

## Important production hardening before launch

- Add object retention/lifecycle rules in R2.
- Add upload quotas/rate limits per publisher.
- Verify uploaded object type and size again with a server-side `HeadObject` before publishing.
- Add malware scanning/quarantine for publisher PDFs.
- Add payment ownership checks before signed paid-reader URLs are issued.
- Add backups and monitoring.
- Never commit `.env.local` or R2 secrets.
