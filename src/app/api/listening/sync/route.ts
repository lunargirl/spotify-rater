import { NextResponse } from "next/server";
import { requireSpotifyUser } from "@/lib/auth-api";
import { getListeningStats } from "@/lib/listening-db";
import { ListeningSyncError, syncListeningForUser } from "@/lib/listening-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireSpotifyUser({ allowSessionWrites: true });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const sync = await syncListeningForUser(user.id);
    const stats = await getListeningStats(user.id);
    return NextResponse.json({ ok: true, sync, stats });
  } catch (error) {
    if (error instanceof ListeningSyncError) {
      return NextResponse.json(
        {
          error: error.message,
          needsReauth: error.code === "missing_scope",
        },
        { status: error.code === "missing_scope" ? 403 : 500 }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
