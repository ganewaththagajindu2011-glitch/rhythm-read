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

-- No public insert/update/delete policies.
-- The server-side service-role client creates purchases only after verified payment.

drop policy if exists "Users can read their own purchases" on public.purchases;
create policy "Users can read their own purchases"
on public.purchases
for select
to authenticated
using (
  user_id in (
    select id from public.users
    where lower(email) = lower(auth.jwt() ->> 'email')
  )
);
