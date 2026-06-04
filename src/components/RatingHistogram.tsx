"use client";

import type { SongRating } from "@/types";
import { ComparativeHistogram } from "./ComparativeHistogram";

interface RatingHistogramProps {
  ratings: SongRating[];
}

export function RatingHistogram({ ratings }: RatingHistogramProps) {
  return (
    <ComparativeHistogram
      ratings={ratings}
      title="Rating Histogram"
      showBinControls
    />
  );
}
