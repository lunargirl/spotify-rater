-- Spotify entity IDs for artist/album navigation
alter table public.song_ratings
  add column if not exists spotify_album_id text,
  add column if not exists spotify_artist_ids text[] not null default '{}';

create index if not exists song_ratings_album_id_idx on public.song_ratings (spotify_album_id);
create index if not exists song_ratings_artist_ids_idx on public.song_ratings using gin (spotify_artist_ids);
