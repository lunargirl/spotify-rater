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
  displayName: string;
  profilePictureUrl?: string | null;
}

function ProfileAvatar({
  displayName,
  profilePictureUrl,
}: {
  displayName: string;
  profilePictureUrl?: string | null;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  if (profilePictureUrl) {
    return (
      <Image
        src={profilePictureUrl}
        alt=""
        width={80}
        height={80}
        unoptimized
        className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-zinc-700"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-2xl font-bold text-zinc-400 ring-2 ring-zinc-700">
      {initial}
    </div>
  );
}

export function AnalyticsDashboard({
  ratings,
  displayName,
  profilePictureUrl,
}: AnalyticsDashboardProps) {
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

  const overviewCard = (
    <div className="glass-card p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Analytics Overview
      </p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <ProfileAvatar displayName={displayName} profilePictureUrl={profilePictureUrl} />
        <h2 className="text-2xl font-bold text-white">{displayName}</h2>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-3xl font-bold tabular-nums text-white">{ratings.length}</p>
          <p className="text-xs text-zinc-500">Songs rated</p>
        </div>
        <div>
          <p
            className="text-3xl font-bold tabular-nums"
            style={{
              color:
                analytics.grandAverage !== null
                  ? ratingColor(analytics.grandAverage)
                  : undefined,
            }}
          >
            {analytics.grandAverage !== null ? formatRating(analytics.grandAverage) : "—"}
            <span className="text-lg text-zinc-500">/10</span>
          </p>
          <p className="text-xs text-zinc-500">Your average</p>
        </div>
        <div>
          <p className="text-3xl font-bold tabular-nums text-zinc-300">
            {community.loading
              ? "…"
              : community.average !== null
                ? formatRating(community.average)
                : "—"}
            <span className="text-lg text-zinc-500">/10</span>
          </p>
          <p className="text-xs text-zinc-500">Community average</p>
        </div>
      </div>

      {ratings.length > 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          Showing {filtered.length} of {ratings.length} rated song
          {ratings.length === 1 ? "" : "s"}
          {filtered.length !== ratings.length ? " (filtered)" : ""}
        </p>
      )}
    </div>
  );

  if (ratings.length === 0) {
    return (
      <div className="space-y-6">
        {overviewCard}
        <section className="glass-card p-8 text-center">
          <p className="text-zinc-500">
            Rate some songs on the Live Rater page to unlock interactive analytics.
          </p>
        </section>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {overviewCard}

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
