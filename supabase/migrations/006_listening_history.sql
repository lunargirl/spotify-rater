-- Listening history: play events + background sync settings on profiles

alter table public.profiles
  add column if not exists listening_sync_enabled boolean not null default false,
  add column if not exists listening_sync_started_at timestamptz,
  add column if not exists listening_last_synced_at timestamptz,
  add column if not exists listening_refresh_token_enc text;

create table if not exists public.track_plays (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  spotify_track_id text not null,
  played_at timestamptz not null,
  track_name text,
  artist_name text,
  album_art_url text,
  created_at timestamptz not null default now(),
  constraint track_plays_user_track_played_unique
    unique (user_id, spotify_track_id, played_at)
);

create index if not exists track_plays_user_id_idx on public.track_plays (user_id);
create index if not exists track_plays_user_played_at_idx
  on public.track_plays (user_id, played_at desc);

alter table public.track_plays enable row level security;

create or replace function public.get_top_listened_tracks(p_user_id text, p_limit int default 10)
returns table (
  spotify_track_id text,
  track_name text,
  artist_name text,
  album_art_url text,
  play_count bigint,
  last_played_at timestamptz
)
language sql
stable
as $$
  select
    tp.spotify_track_id,
    max(tp.track_name) as track_name,
    max(tp.artist_name) as artist_name,
    max(tp.album_art_url) as album_art_url,
    count(*)::bigint as play_count,
    max(tp.played_at) as last_played_at
  from public.track_plays tp
  where tp.user_id = p_user_id
  group by tp.spotify_track_id
  order by play_count desc, last_played_at desc
  limit greatest(p_limit, 1);
$$;
