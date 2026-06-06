import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { syncAllEnabledListeningUsers } from "@/lib/listening-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runCronSync(request);
}

export async function POST(request: NextRequest) {
  return runCronSync(request);
}

async function runCronSync(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllEnabledListeningUsers();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[listening/sync-cron]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
