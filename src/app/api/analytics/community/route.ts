import { NextRequest, NextResponse } from "next/server";
import { requireSpotifyUser } from "@/lib/auth-api";
import {
  buildCommunityBenchmark,
  fetchAllCommunityRatings,
  filterRatingsForCommunityScope,
} from "@/lib/community-analytics";
import type { BinWidth } from "@/lib/analytics";
import { emptyCommunityBenchmark } from "@/lib/safe-server";
import { tryCreateSupabaseAdmin } from "@/lib/supabase";

function parseBinWidth(value: string | null): BinWidth {
  const parsed = parseFloat(value ?? "1");
  if (parsed === 0.25 || parsed === 0.5 || parsed === 1 || parsed === 2) return parsed;
  return 1;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const binWidth = parseBinWidth(searchParams.get("binWidth"));
  const albumId = searchParams.get("albumId")?.trim() || null;
  const artistId = searchParams.get("artistId")?.trim() || null;
  const empty = emptyCommunityBenchmark(binWidth);

  try {
    const user = await requireSpotifyUser();
    if (!user) {
      return NextResponse.json(empty);
    }

    const supabase = tryCreateSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(empty);
    }

    const allRatings = await fetchAllCommunityRatings(supabase);
    const ratings = filterRatingsForCommunityScope(allRatings, { albumId, artistId });

    if (!ratings.length) {
      return NextResponse.json({
        average: null,
        totalRatings: 0,
        bins: empty.bins,
      });
    }

    const benchmark = buildCommunityBenchmark(ratings, binWidth);
    return NextResponse.json(benchmark);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Community analytics]", message);
    return NextResponse.json({
      ...empty,
      warning: message,
    });
  }
}
