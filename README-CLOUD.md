# Rhythm Read — Cloud-first Step 4

Use Supabase Postgres + Cloudflare R2 for production persistence and uploads. Local PostgreSQL is not required.

## Start locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/admin`
- `http://localhost:3000/seller`
- `http://localhost:3000/seller/publish`

## Production path

1. Create a Supabase project.
2. Run `schema.sql` in the Supabase SQL Editor.
3. Copy the Supabase Postgres connection string to `POSTGRES_URL`.
4. Create a Cloudflare R2 bucket and API token.
5. Configure R2 CORS and `R2_PUBLIC_BASE_URL`.
6. Add Google OAuth credentials.
7. Add environment variables to your hosting provider.
8. Deploy to Vercel or another Node-capable host.

See `STEP4-CLOUD.md` for the exact environment and upload architecture.
