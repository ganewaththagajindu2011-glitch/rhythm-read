-- Rhythm Read: Admin-only publishing + reader-only public catalog
-- Safe version for the current Auth.js + Supabase architecture.
-- Run after schema.sql. For complete private-table grants/RLS hardening also run
-- SECURITY-HARDENING.sql.

-- 1) Keep the book bucket private.
insert into storage.buckets (id, name, public)
values ('books', 'books', false)
on conflict (id) do update set public = false;

-- 2) Public browser access is limited to active categories and published books.
alter table public.categories enable row level security;
revoke all on table public.categories from public, anon, authenticated;
grant select on table public.categories to anon, authenticated;
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
on public.categories
for select
to anon, authenticated
using (active = true);

alter table public.books enable row level security;
revoke all on table public.books from public, anon, authenticated;
grant select on table public.books to anon, authenticated;
drop policy if exists "Public can read published books" on public.books;
create policy "Public can read published books"
on public.books
for select
to anon, authenticated
using (status = 'PUBLISHED');

-- 3) No browser INSERT/UPDATE/DELETE policies are created for books/categories.
-- 4) Do not ALTER storage.objects here: Supabase manages that system table.
-- 5) Server code uses SUPABASE_SECRET_KEY for admin operations and signed URLs.
