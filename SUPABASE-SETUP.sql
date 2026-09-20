-- Run this AFTER your existing schema.sql.
-- It creates the private storage bucket used by Rhythm Read.

insert into storage.buckets (id, name, public)
values ('books', 'books', false)
on conflict (id) do update set public = excluded.public;
