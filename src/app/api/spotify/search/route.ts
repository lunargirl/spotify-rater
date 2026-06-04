import { NextRequest, NextResponse } from "next/server";
import { getRouteAccessToken, spotifyFetch } from "@/lib/spotify";
import type { SpotifyTrack } from "@/types";

interface SearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

export async function GET(request: NextRequest) {
  const accessToken = await getRouteAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const data = await spotifyFetch<SearchResponse>(
      `/search?${new URLSearchParams({ q, type: "track", limit: "10" })}`,
      accessToken
    );

    return NextResponse.json({ tracks: data.tracks.items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
