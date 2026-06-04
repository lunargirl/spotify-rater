import { resolveSpotifyUser } from "@/lib/session-user";
import type { SpotifyUser } from "@/types";

export async function requireSpotifyUser(): Promise<SpotifyUser | null> {
  return resolveSpotifyUser();
}
