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
        className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-zinc-700 sm:h-20 sm:w-20 sm:rounded-2xl"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xl font-bold text-zinc-400 ring-2 ring-zinc-700 sm:h-20 sm:w-20 sm:rounded-2xl sm:text-2xl">
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
    <div className="glass-card p-3 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Analytics Overview
      </p>
      <div className="mt-4 flex items-center gap-3 sm:gap-4">
        <ProfileAvatar displayName={displayName} profilePictureUrl={profilePictureUrl} />
        <h2 className="min-w-0 truncate text-xl font-bold text-white sm:text-2xl">{displayName}</h2>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-6">
        <div className="flex items-center justify-between rounded-xl bg-zinc-900/40 px-3 py-2.5 sm:block sm:bg-transparent sm:px-0 sm:py-0">
          <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">{ratings.length}</p>
          <p className="mt-0.5 text-[10px] leading-tight text-zinc-500 sm:text-xs">Songs rated</p>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-zinc-900/40 px-3 py-2.5 sm:block sm:bg-transparent sm:px-0 sm:py-0">
          <p
            className="text-2xl font-bold tabular-nums sm:text-3xl"
            style={{
              color:
                analytics.grandAverage !== null
                  ? ratingColor(analytics.grandAverage)
                  : undefined,
            }}
          >
            {analytics.grandAverage !== null ? formatRating(analytics.grandAverage) : "—"}
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-zinc-500 sm:text-xs">Your average</p>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-zinc-900/40 px-3 py-2.5 sm:block sm:bg-transparent sm:px-0 sm:py-0">
          <p className="text-2xl font-bold tabular-nums text-zinc-300 sm:text-3xl">
            {community.loading
              ? "…"
              : community.average !== null
                ? formatRating(community.average)
                : "—"}
          </p>
          <p className="mt-0.5 text-[10px] leading-tight text-zinc-500 sm:text-xs">Community avg</p>
        </div>
      </div>

      {ratings.length > 0 && (
        <p className="mt-3 text-xs text-zinc-500 sm:mt-4 sm:text-sm">
          Showing {filtered.length} of {ratings.length} rated song
          {ratings.length === 1 ? "" : "s"}
          {filtered.length !== ratings.length ? " (filtered)" : ""}
        </p>
      )}
    </div>
  );

  if (ratings.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
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
    <section className="min-w-0 space-y-4 sm:space-y-6">
      {overviewCard}

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[minmax(240px,280px)_1fr]">
        <div className="order-2 min-w-0 lg:order-1">
          <AnalyticsFilterPanel
            ratings={normalizedRatings}
            filters={filters}
            onChange={setFilters}
          />
        </div>
        <div className="order-1 min-w-0 lg:order-2">
          <RatingHistogram ratings={filtered} />
        </div>
      </div>

      <div className="glass-card min-w-0 p-3 sm:p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-400 sm:mb-4">
          Top 5 Highest-Rated Songs
        </h3>
        {analytics.topRated.length === 0 ? (
          <p className="text-sm text-zinc-500">No songs match the current filters.</p>
        ) : (
          <ul className="space-y-1 sm:space-y-2">
            {analytics.topRated.map((song, index) => (
              <li
                key={song.id}
                className="flex min-w-0 items-center gap-2 rounded-xl p-2 transition hover:bg-zinc-800/60 sm:gap-3 sm:p-2.5"
              >
                <span className="w-4 shrink-0 text-center text-[10px] font-bold text-zinc-600 sm:w-5 sm:text-xs">
                  {index + 1}
                </span>
                {song.album_art_url ? (
                  <Image
                    src={song.album_art_url}
                    alt=""
                    width={40}
                    height={40}
                    className="h-9 w-9 shrink-0 rounded-md object-cover sm:h-10 sm:w-10"
                  />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-md bg-zinc-800 sm:h-10 sm:w-10" />
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
                  className="shrink-0 text-base font-bold tabular-nums sm:text-lg"
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
