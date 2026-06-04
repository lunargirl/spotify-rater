"use client";

import type { SongRating } from "@/types";
import { ComparativeHistogram } from "./ComparativeHistogram";

interface CompactHistogramProps {
  ratings: SongRating[];
  title?: string;
}

export function CompactHistogram({ ratings, title }: CompactHistogramProps) {
  return (
    <ComparativeHistogram ratings={ratings} title={title} compact showBinControls={false} />
  );
}
