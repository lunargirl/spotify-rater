import { NextResponse } from "next/server";
import { getMeBlockedRemainingSecondsEffective } from "@/lib/spotify-me";

export const dynamic = "force-dynamic";

export async function GET() {
  const secondsRemaining = await getMeBlockedRemainingSecondsEffective();
  return NextResponse.json({
    rateLimited: secondsRemaining > 0,
    secondsRemaining,
  });
}
