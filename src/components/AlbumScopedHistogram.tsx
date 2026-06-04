"use client";

import type { SongRating } from "@/types";
import { EntityScopedHistogram } from "./EntityScopedHistogram";

interface AlbumScopedHistogramProps {
  albumId: string;
  albumRatings: SongRating[];
}

export function AlbumScopedHistogram({ albumId, albumRatings }: AlbumScopedHistogramProps) {
  return (
    <EntityScopedHistogram
      entityType="album"
      entityId={albumId}
      entityRatings={albumRatings}
    />
  );
}
