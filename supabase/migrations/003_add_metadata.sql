-- Add Spotify metadata columns to song_ratings
-- Run in Supabase SQL Editor after 002_profiles_and_avatars.sql
-- (Alias of 003_song_ratings_metadata.sql)

alter table public.song_ratings
  add column if not exists genres text[] not null default '{}',
  add column if not exists release_date text;

create index if not exists song_ratings_genres_idx on public.song_ratings using gin (genres);
create index if not exists song_ratings_release_date_idx on public.song_ratings (release_date);
