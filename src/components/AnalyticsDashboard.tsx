"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  DEFAULT_ANALYTICS_FILTERS,
  buildFilteredAnalytics,
  normalizeSongRating,
  type AnalyticsFilters,
} from "@/lib/analytics";
import type { SongRating } from "@/types";
import { formatRating, ratingColor } from "@/lib/utils";
import { AnalyticsFilterPanel } from "./AnalyticsFilterPanel";
import { RatingHistogram } from "./RatingHistogram";
import { ArtistLink, SongLink } from "./EntityLink";
import { useCommunityBenchmark } from "@/hooks/useCommunityBenchmark";

interface AnalyticsDashboardProps {
  ratings: SongRating[];
}

export function AnalyticsDashboard({ ratings }: AnalyticsDashboardProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);
  const community = useCommunityBenchmark(1);

  const normalizedRatings = useMemo(
    () => ratings.map((r) => normalizeSongRating(r)),
    [ratings]
  );

  const { filtered, analytics } = useMemo(
    () => buildFilteredAnalytics(normalizedRatings, filters, 1),
    [normalizedRatings, filters]
  );

  if (ratings.length === 0) {
    return (
      <section className="glass-card p-8 text-center">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Data Analytics Suite
        </h3>
        <p className="mt-4 text-zinc-500">
          Rate some songs on the Live Rater page to unlock interactive analytics.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Grand Average Rating
        </h3>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Your average
            </p>
            <p className="text-4xl font-bold tabular-nums text-white">
              {analytics.grandAverage !== null ? (
                <>
                  <span style={{ color: ratingColor(analytics.grandAverage) }}>
                    {formatRating(analytics.grandAverage)}
                  </span>
                  <span className="text-2xl text-zinc-500">/10</span>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Global community average
            </p>
            <p className="text-4xl font-bold tabular-nums text-zinc-400">
              {community.loading
                ? "…"
                : community.average !== null
                  ? formatRating(community.average)
                  : "—"}
              <span className="text-2xl text-zinc-600">/10</span>
            </p>
            {!community.loading && community.totalRatings > 0 && (
              <p className="mt-1 text-xs text-zinc-600">
                Across {community.totalRatings} community rating
                {community.totalRatings === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Showing {filtered.length} of {ratings.length} rated song
          {ratings.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,280px)_1fr]">
        <AnalyticsFilterPanel
          ratings={normalizedRatings}
          filters={filters}
          onChange={setFilters}
        />
        <RatingHistogram ratings={filtered} />
      </div>

      <div className="glass-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Top 5 Highest-Rated Songs
        </h3>
        {analytics.topRated.length === 0 ? (
          <p className="text-sm text-zinc-500">No songs match the current filters.</p>
        ) : (
          <ul className="space-y-2">
            {analytics.topRated.map((song, index) => (
              <li
                key={song.id}
                className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-zinc-800/60"
              >
                <span className="w-5 shrink-0 text-center text-xs font-bold text-zinc-600">
                  {index + 1}
                </span>
                {song.album_art_url ? (
                  <Image
                    src={song.album_art_url}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-md bg-zinc-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <SongLink
                      trackId={song.spotify_track_id}
                      trackName={song.track_name ?? "Unknown track"}
                    />
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    <ArtistLink
                      artistId={song.spotify_artist_ids?.[0]}
                      artistName={song.artist_name ?? "Unknown artist"}
                      className="text-xs"
                    />
                    {song.release_date ? ` · ${song.release_date.slice(0, 4)}` : ""}
                  </p>
                </div>
                <span
                  className="shrink-0 text-lg font-bold tabular-nums"
                  style={{ color: ratingColor(Number(song.rating)) }}
                >
                  {formatRating(Number(song.rating))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
