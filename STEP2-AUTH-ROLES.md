# Rhythm Read — Step 2: Authentication & Account Roles

## Included

- Google OAuth sign-in via Auth.js / NextAuth.
- Protected `/admin` route using `ADMIN_EMAIL`.
- Reader accounts are created by Google sign-in.
- A signed-in reader can apply to become a publisher at `/seller/apply`.
- Publisher profile captures display name, bio, phone, country, city, address, website and payout email.
- Publisher applications are stored in `storage/publishers.json` in local/dev mode.
- Admin can review applications at `/admin/publishers` and set `PENDING`, `APPROVED`, `REJECTED` or `SUSPENDED` status.
- An approved publisher can access the publisher dashboard and publisher profile.
- Publishing UI is gated until approval.
- The 5% platform commission calculator remains ready for the payment phase.

## Google Cloud setup

In Google Cloud Console create a Web OAuth client and add:

Development redirect URI:
`http://localhost:3000/api/auth/callback/google`

Production redirect URI:
`https://YOUR-DOMAIN/api/auth/callback/google`

Set these values in `.env.local`:

```env
AUTH_SECRET=your-long-random-secret
ADMIN_EMAIL=your-admin-google-email@example.com
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

## Run

```bash
npm install
npm run dev
```

Then visit:

- `/login`
- `/seller/apply`
- `/seller`
- `/seller/profile`
- `/seller/publish`
- `/admin`
- `/admin/publishers`

## Production note

The local publisher JSON store is a development fallback. Before deployment, move publisher profiles, role/status records, users and approvals to the PostgreSQL schema already included in `schema.sql`. This phase intentionally separates the authentication UX and role workflow from the payment integration.
