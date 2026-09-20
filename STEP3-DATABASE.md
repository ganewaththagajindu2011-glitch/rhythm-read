# Step 3 — PostgreSQL persistence

Set `POSTGRES_URL`, then run:

```bash
npm install
npm run db:init
npm run dev
```

When PostgreSQL is configured, Google sign-in upserts users into `users`, publisher applications use `publisher_profiles`, publisher uploads create `PENDING` books with `owner_id`, and admin moderation can approve/reject books. Public catalog reads only `PUBLISHED` database books plus the demo catalog.

Without `POSTGRES_URL`, the UI continues using the existing JSON demo fallback.
