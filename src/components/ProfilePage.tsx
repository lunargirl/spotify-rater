"use client";

import { useEffect, useState } from "react";
import { buildProfileAnalytics, normalizeSongRating } from "@/lib/analytics";
import type { SongRating } from "@/types";
import { formatRating, ratingColor } from "@/lib/utils";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

interface ProfilePageProps {
  displayName: string;
  initialRatings: SongRating[];
}

function normalizeRatings(ratings: SongRating[]): SongRating[] {
  return ratings.map(normalizeSongRating);
}

export function ProfilePage({ displayName, initialRatings }: ProfilePageProps) {
  const [ratings, setRatings] = useState(() => normalizeRatings(initialRatings));

  useEffect(() => {
    setRatings(normalizeRatings(initialRatings));
  }, [initialRatings]);

  const summary = buildProfileAnalytics(ratings);

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Analytics Overview
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white">{displayName}</h2>
        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="text-3xl font-bold tabular-nums text-white">{summary.totalRated}</p>
            <p className="text-xs text-zinc-500">Songs rated</p>
          </div>
          {summary.grandAverage !== null && (
            <div>
              <p
                className="text-3xl font-bold tabular-nums"
                style={{ color: ratingColor(summary.grandAverage) }}
              >
                {formatRating(summary.grandAverage)}
              </p>
              <p className="text-xs text-zinc-500">Grand average /10</p>
            </div>
          )}
        </div>
      </section>

      <AnalyticsDashboard ratings={ratings} />
    </div>
  );
}
