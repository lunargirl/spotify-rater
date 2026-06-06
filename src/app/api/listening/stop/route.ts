import { NextResponse } from "next/server";
import { requireSpotifyUser } from "@/lib/auth-api";
import { disableListeningSync, getListeningStats } from "@/lib/listening-db";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireSpotifyUser({ allowSessionWrites: true });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await disableListeningSync(user.id);
    const stats = await getListeningStats(user.id);
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
