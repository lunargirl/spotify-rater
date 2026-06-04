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
        await fetch("/api/auth/bootstrap", { method: "POST" });
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

        setDisplayName(
          data.profile?.display_name ??
            data.spotifyUser?.display_name ??
            data.spotifyUser?.id ??
            "Profile"
        );
        setRatings((data.ratings ?? []).map((r: SongRating) => normalizeSongRating(r)));
        if (data.warning) {
          setError(data.warning);
        }
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
            <a
              href="/api/auth/logout?redirect=/login"
              className="inline-block text-sm font-medium text-[#1db954] hover:underline"
            >
              Sign out and connect again
            </a>
          </div>
        )}
        {!loading && (
          <ProfilePage displayName={displayName} initialRatings={ratings} />
        )}
      </main>
    </div>
  );
}
