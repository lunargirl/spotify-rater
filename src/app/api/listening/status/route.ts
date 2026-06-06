import { NextResponse } from "next/server";
import { requireSpotifyUser } from "@/lib/auth-api";
import { getListeningStats } from "@/lib/listening-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireSpotifyUser({ allowSessionWrites: true });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const stats = await getListeningStats(user.id);
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
