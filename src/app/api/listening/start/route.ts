import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireSpotifyUser } from "@/lib/auth-api";
import { getOrCreateProfile } from "@/lib/profile";
import { enableListeningSync, getListeningStats } from "@/lib/listening-db";
import { ListeningSyncError, syncListeningForUser } from "@/lib/listening-sync";
import { SPOTIFY_SCOPES_VERSION } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireSpotifyUser({ allowSessionWrites: true });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("spotify_refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { error: "No Spotify session — sign out and log in again." },
      { status: 401 }
    );
  }

  const scopeVersion = cookieStore.get("spotify_scopes_version")?.value;
  if (scopeVersion !== SPOTIFY_SCOPES_VERSION) {
    return NextResponse.json(
      {
        error: "New permissions required for listening history.",
        needsReauth: true,
      },
      { status: 403 }
    );
  }

  try {
    await getOrCreateProfile(user);
    await enableListeningSync(user.id, refreshToken);
    const sync = await syncListeningForUser(user.id, { deep: true });
    const stats = await getListeningStats(user.id);

    return NextResponse.json({
      ok: true,
      message: "Listening history tracking started.",
      sync,
      stats,
    });
  } catch (error) {
    if (error instanceof ListeningSyncError && error.code === "missing_scope") {
      return NextResponse.json(
        { error: error.message, needsReauth: true },
        { status: 403 }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
