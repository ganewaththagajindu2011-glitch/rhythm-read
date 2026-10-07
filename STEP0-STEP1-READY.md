# Rhythm Read — STEP 0 + STEP 1 launch preparation

## STEP 0 — Secrets safe

1. Copy `.env.local.example` to `.env.local`.
2. Put your real values ONLY in `.env.local`.
3. Never upload `.env.local` to GitHub.
4. Never put `SUPABASE_SECRET_KEY`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, or `PAYHERE_MERCHANT_SECRET` in a `NEXT_PUBLIC_*` variable.

The repository `.gitignore` already excludes `.env.local`, `.env`, and local generated files.

## STEP 1 — Local production build

Open PowerShell in this project folder:

```powershell
npm install
npm run typecheck
npm run build
```

If `npm install` reports `ENOSPC`, that means the Windows drive is out of free space. Free at least several GB before installing dependencies.

A successful production test ends with Next.js reporting that the build completed successfully and without a prerendering error.

## Environment names used by this project

Use these exact names:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `PAYHERE_MODE`
- `PAYHERE_MERCHANT_ID`
- `PAYHERE_MERCHANT_SECRET`
- `NEXT_PUBLIC_ADSENSE_CLIENT`
- `NEXT_PUBLIC_ADSENSE_SLOT`

Do not rename `SUPABASE_SECRET_KEY` to a `NEXT_PUBLIC_*` variable.

## Important

This package intentionally does NOT contain `.env.local` or real credentials.
