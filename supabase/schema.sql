-- Bourbon Log — Supabase schema and setup
-- Run this in the Supabase SQL Editor for a fresh project.

create table bottles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  distillery text,
  proof numeric(4,1),
  rating numeric(3,1),
  note text,
  photo_urls text[],
  finished_date date,
  created_at timestamptz default now()
);

-- Single-user app, no auth: disable RLS on the table.
alter table bottles disable row level security;

-- Storage bucket "bottle-photos" must also exist and be set Public
-- (Supabase dashboard: Storage -> New bucket -> name "bottle-photos" -> Public).
-- The "Public" toggle only allows anonymous READS. Anonymous uploads
-- also require an explicit storage.objects policy:
create policy "Allow public access to bottle-photos"
on storage.objects for all
to public
using (bucket_id = 'bottle-photos')
with check (bucket_id = 'bottle-photos');
