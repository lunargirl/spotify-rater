import { NextResponse } from "next/server";
import { getRouteAccessToken, spotifyFetch } from "@/lib/spotify";
import type { NowPlaying, SpotifyTrack } from "@/types";

interface PlaybackResponse {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  device?: { name: string };
}

export async function GET() {
  const accessToken = await getRouteAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const playback = await spotifyFetch<PlaybackResponse | null>(
      "/me/player/currently-playing",
      accessToken
    );

    if (!playback || !playback.item) {
      const playerState = await spotifyFetch<PlaybackResponse | null>(
        "/me/player",
        accessToken
      ).catch(() => null);

      const result: NowPlaying = {
        isPlaying: playerState?.is_playing ?? false,
        track: playerState?.item ?? null,
        progress_ms: playerState?.progress_ms ?? 0,
        device: playerState?.device?.name,
      };

      return NextResponse.json(result);
    }

    const result: NowPlaying = {
      isPlaying: playback.is_playing,
      track: playback.item,
      progress_ms: playback.progress_ms,
      device: playback.device?.name,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
