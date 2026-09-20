# Environment setup

Create a `.env.local` file in the project root and copy the variables from `.env.example`.

## Required

- `NEXT_PUBLIC_SITE_URL`: production origin, e.g. `https://read.example.com`
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key
- `SUPABASE_SECRET_KEY`: Supabase secret key; server-only
- `SUPABASE_STORAGE_BUCKET=books`
- `AUTH_SECRET`: long random Auth.js secret
- `ADMIN_EMAIL`: the exact admin Google account email
- `AUTH_GOOGLE_ID`: Google OAuth web client ID
- `AUTH_GOOGLE_SECRET`: Google OAuth web client secret

Do not commit `.env.local`. Do not paste secrets into source files.

### Google redirect

For Supabase/Google authentication, use the callback URL shown by your authentication configuration. For the current Auth.js route in this project, the app callback is `/api/auth/callback/google` on the deployed origin.

### Production

Set the same variables in the hosting provider's server-side environment settings. Do not expose `SUPABASE_SECRET_KEY` or `AUTH_GOOGLE_SECRET` through `NEXT_PUBLIC_*` variables.
