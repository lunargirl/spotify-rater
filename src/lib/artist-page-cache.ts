/** In-memory artist page cache for the current browser session. */

export type CachedArtistPayload = {
  artist: {
    id: string;
    name: string;
    images: { url: string }[];
    genres: string[];
  };
  ratings: import("@/types").SongRating[];
  albums: {
    id: string;
    name: string;
    images: { url: string }[];
    release_date: string;
  }[];
};

const cache = new Map<string, CachedArtistPayload>();

export function getCachedArtistPage(artistId: string): CachedArtistPayload | null {
  return cache.get(artistId) ?? null;
}

export function setCachedArtistPage(artistId: string, data: CachedArtistPayload): void {
  cache.set(artistId, data);
}
