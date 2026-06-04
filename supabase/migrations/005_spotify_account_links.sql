-- Maps refresh token hash → Spotify user id so /me is not required every session.
create table if not exists public.spotify_account_links (
  link_key text primary key,
  spotify_user_id text not null,
  display_name text,
  updated_at timestamptz not null default now()
);

create index if not exists spotify_account_links_user_id_idx
  on public.spotify_account_links (spotify_user_id);

alter table public.spotify_account_links enable row level security;
