-- Rhythm Read analytics tables
create table if not exists public.book_views (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  session_id text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_book_views_book_time on public.book_views(book_id, viewed_at desc);
create index if not exists idx_book_views_session on public.book_views(session_id);

create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  session_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0)
);

create unique index if not exists uniq_reading_session_book on public.reading_sessions(session_id, book_id);
create index if not exists idx_reading_sessions_book_time on public.reading_sessions(book_id, ended_at desc);

alter table public.book_views enable row level security;
alter table public.reading_sessions enable row level security;

revoke all on public.book_views from anon, authenticated;
revoke all on public.reading_sessions from anon, authenticated;
