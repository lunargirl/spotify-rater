-- Song ratings table for Spotify Rater
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.song_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  spotify_track_id text not null,
  rating numeric(4, 2) not null check (rating >= 0 and rating <= 10),
  comments text,
  track_name text,
  artist_name text,
  album_art_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint song_ratings_user_track_unique unique (user_id, spotify_track_id)
);

create index if not exists song_ratings_user_id_idx on public.song_ratings (user_id);
create index if not exists song_ratings_spotify_track_id_idx on public.song_ratings (spotify_track_id);

-- Auto-update updated_at on row changes
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists song_ratings_set_updated_at on public.song_ratings;
create trigger song_ratings_set_updated_at
  before update on public.song_ratings
  for each row
  execute function public.set_updated_at();

-- Row Level Security (optional — API routes validate Spotify session server-side)
alter table public.song_ratings enable row level security;

-- Allow service role full access; anon/authenticated blocked by default.
-- All client access goes through Next.js API routes using the service role key.
