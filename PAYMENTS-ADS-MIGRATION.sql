-- Rhythm Read: Payment + purchase + billing + AdSense readiness
-- Run after your existing schema.sql / Supabase admin-only policies.

alter table public.orders add column if not exists billing_first_name text;
alter table public.orders add column if not exists billing_last_name text;
alter table public.orders add column if not exists billing_email text;
alter table public.orders add column if not exists billing_phone text;
alter table public.orders add column if not exists billing_address text;
alter table public.orders add column if not exists billing_city text;
alter table public.orders add column if not exists billing_country text;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  unique(user_id, book_id)
);

create index if not exists idx_purchases_user on public.purchases(user_id);
create index if not exists idx_purchases_book on public.purchases(book_id);

alter table public.purchases enable row level security;
revoke all on table public.purchases from public, anon, authenticated;

-- Auth.js is the application authentication layer, so Supabase-authenticated
-- browser reads are intentionally not used. The server-side secret key handles
-- purchase creation and paid-reader checks.
