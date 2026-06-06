import { createSupabaseAdmin, tryCreateSupabaseAdmin } from "@/lib/supabase";
import { encryptRefreshToken } from "@/lib/listening-crypto";
import type { ListeningStats, MostListenedTrack, TrackPlay } from "@/types";

export interface ListeningSyncProfile {
  user_id: string;
  listening_sync_enabled: boolean;
  listening_sync_started_at: string | null;
  listening_last_synced_at: string | null;
  listening_refresh_token_enc: string | null;
}

export async function getListeningSyncProfile(
  userId: string
): Promise<ListeningSyncProfile | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, listening_sync_enabled, listening_sync_started_at, listening_last_synced_at, listening_refresh_token_enc"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ListeningSyncProfile | null;
}

export async function listEnabledListeningProfiles(): Promise<ListeningSyncProfile[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, listening_sync_enabled, listening_sync_started_at, listening_last_synced_at, listening_refresh_token_enc"
    )
    .eq("listening_sync_enabled", true)
    .not("listening_refresh_token_enc", "is", null);

  if (error) throw error;
  return (data ?? []) as ListeningSyncProfile[];
}

export async function enableListeningSync(
  userId: string,
  refreshToken: string
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      listening_sync_enabled: true,
      listening_sync_started_at: now,
      listening_last_synced_at: null,
      listening_refresh_token_enc: encryptRefreshToken(refreshToken),
    })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function disableListeningSync(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({
      listening_sync_enabled: false,
      listening_refresh_token_enc: null,
    })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function updateListeningRefreshToken(
  userId: string,
  refreshToken: string
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({
      listening_refresh_token_enc: encryptRefreshToken(refreshToken),
    })
    .eq("user_id", userId)
    .eq("listening_sync_enabled", true);

  if (error) throw error;
}

export async function touchListeningLastSynced(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ listening_last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function insertTrackPlays(rows: Omit<TrackPlay, "id" | "created_at">[]): Promise<number> {
  if (rows.length === 0) return 0;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("track_plays")
    .upsert(rows, {
      onConflict: "user_id,spotify_track_id,played_at",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

export async function getListeningStats(userId: string): Promise<ListeningStats> {
  const supabase = tryCreateSupabaseAdmin();
  if (!supabase) {
    return {
      enabled: false,
      startedAt: null,
      lastSyncedAt: null,
      totalPlays: 0,
      topTracks: [],
    };
  }

  const profile = await getListeningSyncProfile(userId);

  const { count, error: countError } = await supabase
    .from("track_plays")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) throw countError;

  const { data: topRows, error: topError } = await supabase.rpc("get_top_listened_tracks", {
    p_user_id: userId,
    p_limit: 10,
  });

  if (topError) throw topError;

  const topTracks: MostListenedTrack[] = (topRows ?? []).map(
    (row: {
      spotify_track_id: string;
      track_name: string | null;
      artist_name: string | null;
      album_art_url: string | null;
      play_count: number;
      last_played_at: string;
    }) => ({
      spotify_track_id: row.spotify_track_id,
      track_name: row.track_name ?? "Unknown track",
      artist_name: row.artist_name ?? "Unknown artist",
      album_art_url: row.album_art_url ?? null,
      play_count: Number(row.play_count),
      last_played_at: row.last_played_at,
    })
  );

  return {
    enabled: profile?.listening_sync_enabled ?? false,
    startedAt: profile?.listening_sync_started_at ?? null,
    lastSyncedAt: profile?.listening_last_synced_at ?? null,
    totalPlays: count ?? 0,
    topTracks,
  };
}
