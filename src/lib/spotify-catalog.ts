import { getAppAccessToken, spotifyFetch } from "@/lib/spotify";
import type { SpotifyTrack } from "@/types";

export interface SpotifyAlbumSummary {
  id: string;
  name: string;
  images: { url: string }[];
  release_date: string;
  total_tracks: number;
  artists: { id: string; name: string }[];
}

export interface SpotifyArtistSummary {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
  followers?: { total: number };
}

interface AlbumsPage {
  items: SpotifyAlbumSummary[];
  next: string | null;
}

function normalizeAlbum(raw: SpotifyAlbumSummary): SpotifyAlbumSummary | null {
  if (!raw?.id) return null;
  return {
    id: raw.id,
    name: raw.name ?? "Unknown album",
    images: raw.images ?? [],
    release_date: raw.release_date ?? "",
    total_tracks: raw.total_tracks ?? 0,
    artists: raw.artists ?? [],
  };
}

function mergeAlbumsInto(
  target: SpotifyAlbumSummary[],
  seen: Set<string>,
  items: SpotifyAlbumSummary[]
) {
  for (const raw of items) {
    const album = normalizeAlbum(raw);
    if (!album || seen.has(album.id)) continue;
    seen.add(album.id);
    target.push(album);
  }
}

function normalizeAlbumsPath(path: string): string {
  const relative = path.startsWith("http")
    ? path.replace("https://api.spotify.com/v1", "")
    : path;

  try {
    const url = new URL(relative, "https://api.spotify.com");
    const limit = Number(url.searchParams.get("limit"));
    if (Number.isNaN(limit) || limit < 1 || limit > 50) {
      url.searchParams.delete("limit");
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return relative;
  }
}

async function fetchAlbumPages(
  initialPath: string,
  token: string
): Promise<SpotifyAlbumSummary[]> {
  const albums: SpotifyAlbumSummary[] = [];
  const seen = new Set<string>();
  let path: string | null = normalizeAlbumsPath(initialPath);

  while (path) {
    try {
      const page: AlbumsPage = await spotifyFetch<AlbumsPage>(path, token);
      mergeAlbumsInto(albums, seen, Array.isArray(page?.items) ? page.items : []);
      path = page?.next ? normalizeAlbumsPath(page.next) : null;
    } catch {
      break;
    }
  }

  return albums;
}

async function searchAlbumsForArtist(
  artistId: string,
  artistName: string,
  token: string
): Promise<SpotifyAlbumSummary[]> {
  const q = encodeURIComponent(`artist:"${artistName}"`);
  const data = await spotifyFetch<{
    albums: { items: SpotifyAlbumSummary[] };
  }>(`/search?type=album&q=${q}&limit=10`, token);

  const albums: SpotifyAlbumSummary[] = [];
  const seen = new Set<string>();

  for (const raw of data.albums?.items ?? []) {
    const album = normalizeAlbum(raw);
    if (!album || seen.has(album.id)) continue;
    const onArtist = album.artists.some((a) => a.id === artistId);
    if (!onArtist) continue;
    seen.add(album.id);
    albums.push(album);
  }

  return albums;
}

export async function fetchArtist(
  artistId: string,
  accessToken?: string
): Promise<SpotifyArtistSummary> {
  const token = accessToken ?? (await getAppAccessToken());
  return spotifyFetch<SpotifyArtistSummary>(`/artists/${artistId}`, token);
}

export async function fetchAlbum(albumId: string): Promise<SpotifyAlbumSummary> {
  const token = await getAppAccessToken();
  return spotifyFetch<SpotifyAlbumSummary>(`/albums/${albumId}`, token);
}

export async function fetchAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  const token = await getAppAccessToken();
  const tracks: SpotifyTrack[] = [];
  let path: string | null = `/albums/${albumId}/tracks?limit=50`;

  while (path) {
    const page: { items: SpotifyTrack[]; next: string | null } = await spotifyFetch(
      path.replace("https://api.spotify.com/v1", ""),
      token
    );

    tracks.push(...page.items);
    path = page.next ? page.next.replace("https://api.spotify.com/v1", "") : null;
  }

  const album = await fetchAlbum(albumId);
  const albumImages = album.images.map((img) => ({
    url: img.url,
    width: 0,
    height: 0,
  }));
  return tracks.map((track) => ({
    ...track,
    album: {
      id: albumId,
      name: album.name,
      images: albumImages,
      release_date: album.release_date,
    },
  }));
}

export async function fetchArtistTopTracks(
  artistId: string,
  accessToken?: string
): Promise<SpotifyTrack[]> {
  const token = accessToken ?? (await getAppAccessToken());
  const attempts = [
    `/artists/${artistId}/top-tracks?market=from_token`,
    `/artists/${artistId}/top-tracks?market=US`,
    `/artists/${artistId}/top-tracks`,
  ];

  for (const path of attempts) {
    try {
      const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(path, token);
      if (data.tracks?.length) return data.tracks;
    } catch {
      /* try next */
    }
  }

  return [];
}

export async function fetchArtistAlbums(
  artistId: string,
  accessToken?: string,
  artistName?: string
): Promise<SpotifyAlbumSummary[]> {
  const token = accessToken ?? (await getAppAccessToken());
  const attempts = [
    `/artists/${artistId}/albums?include_groups=album,single,compilation`,
    `/artists/${artistId}/albums?include_groups=album,single`,
    `/artists/${artistId}/albums?include_groups=album`,
    `/artists/${artistId}/albums?include_groups=album,single&market=US`,
  ];

  let albums: SpotifyAlbumSummary[] = [];

  for (const basePath of attempts) {
    const pageAlbums = await fetchAlbumPages(basePath, token);
    if (pageAlbums.length > albums.length) {
      albums = pageAlbums;
    }
    if (albums.length > 0) break;
  }

  if (albums.length === 0 && artistName?.trim()) {
    try {
      const fromSearch = await searchAlbumsForArtist(artistId, artistName.trim(), token);
      if (fromSearch.length > 0) albums = fromSearch;
    } catch {
      /* optional fallback */
    }
  }

  albums.sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""));
  return albums;
}

export async function fetchTrack(trackId: string, accessToken?: string): Promise<SpotifyTrack> {
  const token = accessToken ?? (await getAppAccessToken());
  return spotifyFetch<SpotifyTrack>(`/tracks/${trackId}`, token);
}
