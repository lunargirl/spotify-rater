import {
  buildHistogramBins,
  normalizeSongRating,
  type BinWidth,
} from "@/lib/analytics";
import { computeScopeAverage } from "@/lib/comparative-stats";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HistogramBin, SongRating } from "@/types";

export interface CommunityBenchmark {
  average: number | null;
  totalRatings: number;
  bins: HistogramBin[];
}

/** Load every rating row from the database for global community metrics. */
export async function fetchAllCommunityRatings(
  supabase: SupabaseClient
): Promise<SongRating[]> {
  try {
    const { data, error } = await supabase.from("song_ratings").select("*");

    if (error) {
      console.error("[fetchAllCommunityRatings]", error.message);
      return [];
    }

    if (!data?.length) {
      return [];
    }

    return (data as SongRating[]).map(normalizeSongRating);
  } catch (error) {
    console.error("[fetchAllCommunityRatings]", error);
    return [];
  }
}

export function filterRatingsForCommunityScope(
  ratings: SongRating[],
  scope: { albumId?: string | null; artistId?: string | null }
): SongRating[] {
  if (scope.albumId) {
    return ratings.filter((r) => r.spotify_album_id === scope.albumId);
  }
  if (scope.artistId) {
    return ratings.filter((r) => r.spotify_artist_ids?.includes(scope.artistId!));
  }
  return ratings;
}

export function buildCommunityBenchmark(
  ratings: SongRating[],
  binWidth: BinWidth
): CommunityBenchmark {
  return {
    average: computeScopeAverage(ratings),
    totalRatings: ratings.length,
    bins: buildHistogramBins(ratings, binWidth),
  };
}

export function scaleBinsToMax(bins: HistogramBin[], targetMax: number): HistogramBin[] {
  if (bins.length === 0 || targetMax <= 0) {
    return [];
  }

  const sourceMax = Math.max(...bins.map((b) => b.count), 1);
  return bins.map((bin) => ({
    ...bin,
    count: Math.round((bin.count / sourceMax) * targetMax),
  }));
}
