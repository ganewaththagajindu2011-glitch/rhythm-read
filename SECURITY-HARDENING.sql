-- Rhythm Read — final database/storage hardening for production.
-- Architecture: Auth.js for application login; Supabase SECRET key is server-only.
-- Run AFTER schema.sql, ANALYTICS-MIGRATION.sql, PAYMENTS-ADS-MIGRATION.sql,
-- and SUPABASE-ADMIN-ONLY.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Browser database privileges: public catalog only.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users','orders','reading_progress','wishlists','reviews','audit_logs',
    'publisher_profiles','author_books','commissions','payout_accounts',
    'purchases','book_views','reading_sessions'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

alter table public.books enable row level security;
alter table public.categories enable row level security;

grant select on public.books to anon, authenticated;
grant select on public.categories to anon, authenticated;

drop policy if exists "Public can read published books" on public.books;
create policy "Public can read published books"
on public.books
for select
to anon, authenticated
using (status = 'PUBLISHED');

drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
on public.categories
for select
to anon, authenticated
using (active = true);

-- Defense against a forgotten future table accidentally becoming readable.
alter default privileges in schema public
revoke select, insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges in schema public
revoke usage, select, update on sequences from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Data integrity that matters to access control and payments.
-- ---------------------------------------------------------------------------
create unique index if not exists uniq_book_views_book_session
  on public.book_views(book_id, session_id);

create unique index if not exists uniq_orders_provider_payment_id
  on public.orders(provider_payment_id)
  where provider_payment_id is not null;

-- Make analytics sessions incapable of storing unbounded fake durations.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reading_sessions_duration_max'
  ) then
    alter table public.reading_sessions
      add constraint reading_sessions_duration_max check (duration_seconds between 0 and 86400);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Payment order state machine: paid/refunded records cannot be downgraded.
-- ---------------------------------------------------------------------------
create or replace function public.rhythm_read_order_state_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'REFUNDED' and new.status <> 'REFUNDED' then
    raise exception 'Refunded orders are terminal';
  end if;

  if old.status = 'PAID' and new.status in ('PENDING','FAILED','CANCELLED') then
    raise exception 'Paid orders cannot be downgraded';
  end if;

  if new.status = 'REFUNDED' and old.status <> 'PAID' then
    raise exception 'Only paid orders can be refunded';
  end if;

  if old.status in ('PAID','REFUNDED') then
    if new.amount is distinct from old.amount or new.currency is distinct from old.currency then
      raise exception 'Settlement amount/currency is immutable after payment';
    end if;
  end if;

  if old.provider_payment_id is not null and new.provider_payment_id is distinct from old.provider_payment_id then
    raise exception 'Provider payment id is immutable once assigned';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_rhythm_read_order_state_guard on public.orders;
create trigger trg_rhythm_read_order_state_guard
before update on public.orders
for each row
execute function public.rhythm_read_order_state_guard();

revoke all on function public.rhythm_read_order_state_guard() from public, anon, authenticated;
grant execute on function public.rhythm_read_order_state_guard() to postgres, service_role;

-- ---------------------------------------------------------------------------
-- 4. Private book storage: covers + PDFs stay non-public.
-- 300 MB allows the ~242 MB files you previously mentioned while keeping a
-- hard server/storage ceiling against accidental huge uploads.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'books',
  'books',
  false,
  314572800,
  array['application/pdf','image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 314572800,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']::text[];

commit;
