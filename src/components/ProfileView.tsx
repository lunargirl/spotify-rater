"use client";

import { useEffect, useState } from "react";
import { normalizeSongRating } from "@/lib/analytics";
import type { SongRating } from "@/types";
import { AppHeader } from "@/components/AppHeader";
import { ProfilePage } from "@/components/ProfilePage";

export function ProfileView() {
  const [displayName, setDisplayName] = useState("");
  const [ratings, setRatings] = useState<SongRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const bootstrapRes = await fetch("/api/auth/bootstrap", { method: "POST" });
        const bootstrapData = await bootstrapRes.json().catch(() => null);

        if (bootstrapData?.rateLimited && !cancelled) {
          const waitSec = Math.max(bootstrapData.retryAfterSeconds ?? 60, 30) + 3;
          setError(
            `Spotify is rate-limiting requests. Wait about ${waitSec} seconds — loading automatically…`
          );
          await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
          if (cancelled) return;
          await fetch("/api/auth/recover-profile", { method: "POST" });
        }

        const res = await fetch("/api/profile");
        if (res.status === 401) {
          window.location.href = "/api/auth/logout?redirect=/login";
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await res.json();
        if (cancelled) return;

        if (data.spotifyUser?.id && !data.warning) {
          setDisplayName(
            data.profile?.display_name ??
              data.spotifyUser?.display_name ??
              data.spotifyUser?.id ??
              "Profile"
          );
          setRatings((data.ratings ?? []).map((r: SongRating) => normalizeSongRating(r)));
          setError(null);
          return;
        }

        setError(
          data.warning ??
            "Profile not loaded. Wait 2 minutes without refreshing, then open Recover profile below."
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader userLabel={displayName || "Profile"} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {loading && (
          <div className="space-y-6">
            <div className="glass-card h-32 animate-pulse" />
            <div className="glass-card h-64 animate-pulse" />
          </div>
        )}
        {error && !loading && (
          <div className="glass-card mb-6 space-y-3 p-4 text-center text-amber-300">
            <p>{error}</p>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <a
                href="/api/auth/recover-profile"
                className="text-sm font-medium text-accent hover:underline"
              >
                Recover profile (one tap after waiting)
              </a>
              <a
                href="/api/auth/logout?redirect=/login"
                className="text-sm font-medium text-zinc-400 hover:underline"
              >
                Sign out and connect again
              </a>
            </div>
          </div>
        )}
        {!loading && (
          <ProfilePage displayName={displayName} initialRatings={ratings} />
        )}
      </main>
    </div>
  );
}
