import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { buildSessionCookieOptions } from "@/lib/session-cookies";
import { getSpotifyAuthUrl, SPOTIFY_SCOPES_VERSION } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  const scopeVersion = cookieStore.get("spotify_scopes_version")?.value;
  const needsReauth = scopeVersion !== SPOTIFY_SCOPES_VERSION;

  if (needsReauth) {
    cookieStore.set("spotify_access_token", "", { path: "/", maxAge: 0 });
    cookieStore.set("spotify_refresh_token", "", { path: "/", maxAge: 0 });
    cookieStore.set("spotify_token_expires_at", "", { path: "/", maxAge: 0 });
    cookieStore.set("spotify_scopes_version", "", { path: "/", maxAge: 0 });
  }

  cookieStore.set("spotify_oauth_state", state, buildSessionCookieOptions(600));

  return NextResponse.redirect(
    getSpotifyAuthUrl(state, { showDialog: needsReauth })
  );
}
