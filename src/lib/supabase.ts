import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";

export function createSupabaseAdmin(): SupabaseClient {
  try {
    const { url, serviceRoleKey } = getSupabaseConfig();

    return createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase is not configured";
    throw new Error(`Supabase client unavailable: ${message}`);
  }
}

/** Safe wrapper for routes that must not crash when Supabase is misconfigured. */
export function tryCreateSupabaseAdmin(): SupabaseClient | null {
  try {
    return createSupabaseAdmin();
  } catch {
    return null;
  }
}
