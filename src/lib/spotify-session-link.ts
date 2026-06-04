import crypto from "crypto";
import { tryCreateSupabaseAdmin } from "@/lib/supabase";
import type { SpotifyUser } from "@/types";

export function hashRefreshToken(refreshToken: string): string {
  return crypto.createHash("sha256").update(refreshToken).digest("hex");
}

export async function lookupUserByRefreshToken(
  refreshToken: string
): Promise<SpotifyUser | null> {
  const supabase = tryCreateSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("spotify_account_links")
      .select("spotify_user_id, display_name")
      .eq("link_key", hashRefreshToken(refreshToken))
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") {
        console.warn("[spotify-session-link] Table missing — run migration 005");
      }
      return null;
    }

    if (!data?.spotify_user_id) return null;

    return {
      id: data.spotify_user_id,
      display_name: data.display_name ?? data.spotify_user_id,
    };
  } catch {
    return null;
  }
}

export async function saveRefreshTokenLink(
  refreshToken: string,
  user: SpotifyUser
): Promise<void> {
  const supabase = tryCreateSupabaseAdmin();
  if (!supabase) return;

  try {
    const { error } = await supabase.from("spotify_account_links").upsert(
      {
        link_key: hashRefreshToken(refreshToken),
        spotify_user_id: user.id,
        display_name: user.display_name ?? user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "link_key" }
    );

    if (error && error.code !== "42P01") {
      console.warn("[spotify-session-link] Save failed:", error.message);
    }
  } catch {
    // non-fatal
  }
}
