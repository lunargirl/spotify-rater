-- Profiles table and avatars storage bucket
-- Run in Supabase SQL Editor after 001_song_ratings.sql

create table if not exists public.profiles (
  user_id text primary key,
  display_name text not null,
  profile_picture_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_display_name_idx on public.profiles (display_name);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Public avatars bucket (uploads go through Next.js API using service role)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Allow public read access to avatar objects
drop policy if exists "Public avatar read access" on storage.objects;
create policy "Public avatar read access"
  on storage.objects for select
  using (bucket_id = 'avatars');
