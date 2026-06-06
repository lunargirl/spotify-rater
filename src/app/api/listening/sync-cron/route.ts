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
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    const hints: Record<string, string> = {
      not_configured:
        "CRON_SECRET is not set on Vercel. Add it under Environment Variables, then redeploy.",
      missing:
        "Send Authorization: Bearer <CRON_SECRET>, X-Cron-Secret: <CRON_SECRET>, or ?secret=<CRON_SECRET>.",
      invalid: "Credential does not match CRON_SECRET on Vercel (check typos and redeploy).",
    };
    return NextResponse.json(
      { error: "Unauthorized", reason: auth.reason, hint: hints[auth.reason] },
      { status: 401 }
    );
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
