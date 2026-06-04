import {
  resolveSpotifyUser,
  type ResolveSpotifyUserOptions,
} from "@/lib/session-user";
import type { SpotifyUser } from "@/types";

export async function requireSpotifyUser(
  options?: ResolveSpotifyUserOptions
): Promise<SpotifyUser | null> {
  return resolveSpotifyUser(options);
}
