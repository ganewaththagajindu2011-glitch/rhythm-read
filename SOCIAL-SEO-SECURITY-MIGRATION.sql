-- Rhythm Read: comments, reactions, and stricter reader-community access.
-- Run this in Supabase SQL Editor after the existing schema/payment migrations.

CREATE TABLE IF NOT EXISTS public.book_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_comments_book_created
  ON public.book_comments(book_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.book_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('LIKE', 'DISLIKE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_book_reactions_book_type
  ON public.book_reactions(book_id, reaction);

ALTER TABLE public.book_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reactions ENABLE ROW LEVEL SECURITY;

-- These tables are intentionally server-only. The web API reads/writes them with
-- the server-side Supabase secret after validating the Google/NextAuth session.
-- No anon/authenticated policies or privileges are granted here.
REVOKE ALL ON public.book_comments FROM anon, authenticated;
REVOKE ALL ON public.book_reactions FROM anon, authenticated;
