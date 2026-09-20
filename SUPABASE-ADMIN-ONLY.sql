-- Rhythm Read: Admin-only publishing + reader-only public catalog
-- Run this in Supabase SQL Editor AFTER your existing schema.sql / SUPABASE-SETUP.sql.

-- 1) Private bucket: only server-side service-role code should access files.
insert into storage.buckets (id, name, public)
values ('books', 'books', false)
on conflict (id) do update set public = false;

-- 2) Public can only SELECT categories.
alter table public.categories enable row level security;
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
on public.categories
for select
using (active = true);

-- 3) Public can only SELECT published books.
alter table public.books enable row level security;
drop policy if exists "Public can read published books" on public.books;
create policy "Public can read published books"
on public.books
for select
using (status = 'PUBLISHED');

-- 4) Browser users cannot INSERT/UPDATE/DELETE books.
drop policy if exists "Public can insert books" on public.books;
drop policy if exists "Public can update books" on public.books;
drop policy if exists "Public can delete books" on public.books;

-- 5) Browser users cannot directly read/write the private storage bucket.
alter table storage.objects enable row level security;
drop policy if exists "Public cannot read private book files" on storage.objects;
drop policy if exists "Public cannot upload book files" on storage.objects;
drop policy if exists "Public cannot update book files" on storage.objects;
drop policy if exists "Public cannot delete book files" on storage.objects;

-- IMPORTANT:
-- The app uses the server-side SUPABASE_SERVICE_ROLE_KEY to create short-lived
-- signed upload/download URLs after checking the NextAuth admin email.
-- Do NOT expose the service-role key to the browser.
