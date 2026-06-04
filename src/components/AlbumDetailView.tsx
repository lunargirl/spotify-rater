"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { SongRating, SpotifyTrack } from "@/types";
import { AppHeader } from "./AppHeader";
import { AlbumScopedHistogram } from "./AlbumScopedHistogram";
import { MassRatingTable, type MassRatingRow } from "./MassRatingTable";
import { ArtistLink } from "./EntityLink";

interface AlbumData {
  album: {
    id: string;
    name: string;
    images: { url: string }[];
    release_date: string;
    artists: { id: string; name: string }[];
  };
  tracks: SpotifyTrack[];
  ratings: SongRating[];
}

export function AlbumDetailView({ albumId }: { albumId: string }) {
  const [data, setData] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/spotify/albums/${albumId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load album");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    load();
  }, [load]);

  const ratingsMap = new Map(
    (data?.ratings ?? []).map((r) => [r.spotify_track_id, r])
  );

  const rows: MassRatingRow[] =
    data?.tracks.map((track) => ({
      track: {
        ...track,
        album: {
          ...track.album,
          id: albumId,
          name: data.album.name,
          images: data.album.images.map((img) => ({
            url: img.url,
            width: 64,
            height: 64,
          })),
        },
      },
      existing: ratingsMap.get(track.id),
    })) ?? [];

  const histogramRatings = rows
    .map((r) => r.existing)
    .filter((r): r is SongRating => Boolean(r));

  return (
    <div className="min-h-screen">
      <AppHeader userLabel={data?.album.name} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {loading && <div className="glass-card h-48 animate-pulse" />}
        {error && <div className="glass-card p-6 text-red-400">{error}</div>}

        {data && (
          <>
            <section className="glass-card flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
              {data.album.images[0] && (
                <Image
                  src={data.album.images[0].url}
                  alt={data.album.name}
                  width={160}
                  height={160}
                  className="h-40 w-40 rounded-xl object-cover shadow-lg"
                />
              )}
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Album</p>
                <h1 className="text-3xl font-bold text-white">{data.album.name}</h1>
                <p className="mt-2 text-sm text-zinc-400">
                  {data.album.artists.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && ", "}
                      <ArtistLink artistId={a.id} artistName={a.name} />
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {data.album.release_date?.slice(0, 4)} · {data.tracks.length} tracks
                </p>
              </div>
            </section>

            <AlbumScopedHistogram albumId={albumId} albumRatings={histogramRatings} />

            <MassRatingTable rows={rows} onSaved={load} dirtyOnlySave />
          </>
        )}
      </main>
    </div>
  );
}
