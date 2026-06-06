"use client";

import Image from "next/image";
import Link from "next/link";
import type { SongRating } from "@/types";
import { formatRating, ratingColor } from "@/lib/utils";
import { ArtistLink, AlbumLink } from "./EntityLink";
import { DeleteRatingButton } from "./DeleteRatingButton";

interface RatingsHistoryProps {
  ratings: SongRating[];
  loading: boolean;
  onChanged?: () => void;
}

export function RatingsHistory({ ratings, loading, onChanged }: RatingsHistoryProps) {
  const recent = ratings.slice(0, 10);

  if (loading) {
    return (
      <div className="glass-card animate-pulse p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-zinc-500">No ratings yet. Rate your first track above!</p>
      </div>
    );
  }

  return (
    <div className="glass-card min-w-0 overflow-hidden p-4 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Your Ratings
        </h3>
        <span className="text-xs text-zinc-600">Latest 10</span>
      </div>
      <ul className="space-y-2">
        {recent.map((item) => (
          <li
            key={item.id}
            className="group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-xl p-2 transition hover:bg-zinc-800/60 sm:gap-3 sm:p-2.5"
          >
            <Link
              href={`/songs/${item.spotify_track_id}`}
              className="absolute inset-0 z-0 rounded-xl"
              aria-label={`View ${item.track_name ?? "track"}`}
            />

            {item.album_art_url ? (
              <Image
                src={item.album_art_url}
                alt=""
                width={40}
                height={40}
                className="relative z-10 h-9 w-9 shrink-0 rounded-md object-cover pointer-events-none sm:h-10 sm:w-10"
              />
            ) : (
              <div className="relative z-10 h-9 w-9 shrink-0 rounded-md bg-zinc-800 pointer-events-none sm:h-10 sm:w-10" />
            )}

            <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
              <p className="truncate text-sm font-medium text-white">
                {item.track_name ?? "Unknown track"}
              </p>
              <p className="pointer-events-auto mt-0.5 truncate text-xs text-zinc-500">
                <ArtistLink
                  artistId={item.spotify_artist_ids?.[0]}
                  artistName={item.artist_name ?? "Unknown artist"}
                  className="inline truncate text-xs"
                />
                {item.spotify_album_id && (
                  <span className="hidden sm:inline">
                    <span className="mx-1 text-zinc-600">·</span>
                    <AlbumLink albumId={item.spotify_album_id} albumName="View album" className="inline text-xs" />
                  </span>
                )}
              </p>
            </div>

            <span
              className="relative z-10 shrink-0 text-base font-bold tabular-nums pointer-events-none sm:text-lg"
              style={{ color: ratingColor(item.rating) }}
            >
              {formatRating(item.rating)}
            </span>

            <div className="relative z-20 shrink-0">
              <DeleteRatingButton trackId={item.spotify_track_id} onDeleted={onChanged} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
