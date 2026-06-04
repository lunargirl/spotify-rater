"use client";

import type { SongRating } from "@/types";
import { DualSeriesHistogram } from "./DualSeriesHistogram";

interface ComparativeHistogramProps {
  ratings: SongRating[];
  title?: string;
  compact?: boolean;
  showBinControls?: boolean;
}

export function ComparativeHistogram({
  ratings,
  title = "Rating distribution",
  compact = false,
  showBinControls = !compact,
}: ComparativeHistogramProps) {
  return (
    <DualSeriesHistogram
      primaryRatings={ratings}
      benchmarkFromCommunity
      primaryLabel="Your avg"
      benchmarkLabel="Community avg"
      title={title}
      compact={compact}
      showBinControls={showBinControls}
    />
  );
}
