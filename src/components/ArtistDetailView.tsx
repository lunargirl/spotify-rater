"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { SongRating } from "@/types";
import { AppHeader } from "./AppHeader";
import { EntityScopedHistogram } from "./EntityScopedHistogram";

interface ArtistAlbum {
  id: string;
  name: string;
  images: { url: string }[];
  release_date: string;
}

interface ArtistData {
  artist: {
    id: string;
    name: string;
    images: { url: string }[];
    genres: string[];
  };
  ratings: SongRating[];
  albums: ArtistAlbum[];
}

export function ArtistDetailView({ artistId }: { artistId: string }) {
  const [data, setData] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/spotify/artists/${artistId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load artist");
      setData({
        artist: {
          ...json.artist,
          genres: json.artist?.genres ?? [],
          images: json.artist?.images ?? [],
        },
        ratings: Array.isArray(json.ratings) ? json.ratings : [],
        albums: Array.isArray(json.albums) ? json.albums : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    load();
  }, [load]);

  const histogramRatings = data?.ratings ?? [];
  const albums = data?.albums ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader userLabel={data?.artist.name} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {loading && <div className="glass-card h-48 animate-pulse" />}
        {error && <div className="glass-card p-6 text-red-400">{error}</div>}

        {data && (
          <>
            <section className="glass-card flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
              {data.artist.images?.[0] && (
                <Image
                  src={data.artist.images[0].url}
                  alt={data.artist.name}
                  width={160}
                  height={160}
                  className="h-40 w-40 rounded-full object-cover shadow-lg"
                />
              )}
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">Artist</p>
                <h1 className="text-3xl font-bold text-white">{data.artist.name}</h1>
                {(data.artist.genres?.length ?? 0) > 0 && (
                  <p className="mt-2 text-sm capitalize text-zinc-400">
                    {(data.artist.genres ?? []).slice(0, 5).join(" · ")}
                  </p>
                )}
              </div>
            </section>

            <EntityScopedHistogram
              entityType="artist"
              entityId={artistId}
              entityRatings={histogramRatings}
              title="Artist rating distribution"
            />

            {albums.length > 0 && (
              <section className="glass-card p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                    Discography
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {albums.length} release{albums.length === 1 ? "" : "s"} — open an album to
                    mass-rate its tracklist
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {albums.map((album) => (
                    <Link
                      key={album.id}
                      href={`/albums/${album.id}`}
                      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40 transition hover:border-accent hover:shadow-lg hover:shadow-accent-muted"
                    >
                      <div className="relative aspect-square w-full bg-zinc-900">
                        {album.images[0] ? (
                          <Image
                            src={album.images[0].url}
                            alt={album.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 20vw"
                            className="object-cover transition group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-zinc-800" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 p-3">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 group-hover:text-white">
                          {album.name}
                        </p>
                        <p className="text-xs tabular-nums text-zinc-500">
                          {album.release_date?.slice(0, 4) ?? "—"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
