"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeSongRating } from "@/lib/analytics";
import type { SongRating } from "@/types";
import { DualSeriesHistogram } from "./DualSeriesHistogram";

export type EntityComparisonMode =
  | "entity-community"
  | "library"
  | "community-overall";

type EntityKind = "album" | "artist";

const TAB_LABELS: Record<EntityKind, Record<EntityComparisonMode, string>> = {
  album: {
    "entity-community": "Community Album",
    library: "Your Library",
    "community-overall": "Community Overall",
  },
  artist: {
    "entity-community": "Community Artist",
    library: "Your Library",
    "community-overall": "Community Overall",
  },
};

const MODES: EntityComparisonMode[] = [
  "entity-community",
  "library",
  "community-overall",
];

interface EntityScopedHistogramProps {
  entityType: EntityKind;
  entityId: string;
  entityRatings: SongRating[];
  title?: string;
}

export function EntityScopedHistogram({
  entityType,
  entityId,
  entityRatings,
  title = "Rating distribution",
}: EntityScopedHistogramProps) {
  const [mode, setMode] = useState<EntityComparisonMode>("entity-community");
  const [libraryRatings, setLibraryRatings] = useState<SongRating[]>([]);

  const entityRatingsSafe = useMemo(
    () => (Array.isArray(entityRatings) ? entityRatings : []),
    [entityRatings]
  );

  const communityScope = useMemo(
    () =>
      entityType === "album"
        ? { albumId: entityId }
        : { artistId: entityId },
    [entityType, entityId]
  );

  useEffect(() => {
    fetch("/api/ratings")
      .then((res) => (res.ok ? res.json() : { ratings: [] }))
      .then((data) => {
        const rows = Array.isArray(data?.ratings) ? data.ratings : [];
        setLibraryRatings(rows.map((r: SongRating) => normalizeSongRating(r)));
      })
      .catch(() => setLibraryRatings([]));
  }, []);

  const histogramProps = useMemo(() => {
    const base = {
      primaryRatings: entityRatingsSafe,
      primaryLabel: "Your avg",
      benchmarkMode: "bars" as const,
      compact: true as const,
      showBinControls: false as const,
      title,
    };

    switch (mode) {
      case "entity-community":
        return {
          ...base,
          benchmarkFromCommunity: true as const,
          communityScope,
          benchmarkLabel:
            entityType === "album" ? "Community album" : "Community artist",
        };
      case "library":
        return {
          ...base,
          benchmarkRatings: libraryRatings,
          benchmarkLabel: "Your library",
        };
      case "community-overall":
        return {
          ...base,
          benchmarkFromCommunity: true as const,
          benchmarkLabel: "Community overall",
        };
    }
  }, [mode, entityRatingsSafe, title, communityScope, entityType, libraryRatings]);

  const scopeTabs = (
    <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row">
      <div className="inline-flex w-full max-w-2xl flex-col rounded-xl border border-zinc-800 bg-zinc-950/60 p-1 sm:flex-row">
        {MODES.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
              mode === tab
                ? "bg-accent text-on-accent"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {TAB_LABELS[entityType][tab]}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <DualSeriesHistogram
      key={mode}
      headerExtra={scopeTabs}
      binWidthOptions={[1, 2]}
      defaultBinWidth={1}
      chartHeight={320}
      {...histogramProps}
    />
  );
}
