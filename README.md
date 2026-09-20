# Rhythm Read

The Rhythm of Digital Reading.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The visual/product demo works without database credentials. PostgreSQL, Google OAuth and PayHere are wired as production integration points.

## Production data model

Run `schema.sql` against PostgreSQL. Keep original EPUB/PDF files in private object storage and never expose raw public download URLs.

## Payment

PayHere sends payment status to the server `notify_url`; the server must verify `md5sig` before treating the order as successful.

## Step 2 added

Authentication and account roles are now implemented: Google sign-in, publisher applications, admin publisher approvals, and publisher-only dashboard gating. See `STEP2-AUTH-ROLES.md`.
