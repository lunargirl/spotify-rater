"use client";

import { useEffect, useState } from "react";
import { normalizeSongRating } from "@/lib/analytics";
import type { SongRating } from "@/types";
import { AppHeader } from "@/components/AppHeader";
import { ProfilePage } from "@/components/ProfilePage";

export function ProfileView() {
  const [displayName, setDisplayName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [ratings, setRatings] = useState<SongRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.status === 401) {
          window.location.href = "/api/auth/logout?redirect=/login";
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        setDisplayName(
          data.profile?.display_name ??
            data.spotifyUser?.display_name ??
            data.spotifyUser?.id ??
            "Profile"
        );
        setProfilePictureUrl(
          data.profile?.profile_picture_url ?? data.spotifyUser?.images?.[0]?.url ?? null
        );
        setRatings((data.ratings ?? []).map((r: SongRating) => normalizeSongRating(r)));
        setWarning(data.warning ?? null);
      } catch (err) {
        if (!cancelled) {
          setWarning(err instanceof Error ? err.message : "Failed to load profile");
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
    <div className="min-h-screen overflow-x-hidden">
      <AppHeader userLabel={displayName || "Profile"} />

      <main className="mx-auto max-w-6xl min-w-0 px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
        {loading && (
          <div className="space-y-4 sm:space-y-6">
            <div className="glass-card h-32 animate-pulse" />
            <div className="glass-card h-64 animate-pulse" />
          </div>
        )}
        {warning && !loading && (
          <div className="glass-card mb-6 space-y-3 p-4 text-center text-amber-300">
            <p className="text-sm">{warning}</p>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <a
                href="/api/auth/recover-profile"
                className="text-sm font-medium text-accent hover:underline"
              >
                Recover profile
              </a>
              <a
                href="/api/auth/logout?redirect=/login"
                className="text-sm font-medium text-zinc-400 hover:underline"
              >
                Sign out
              </a>
            </div>
          </div>
        )}
        {!loading && (
          <ProfilePage
            displayName={displayName}
            profilePictureUrl={profilePictureUrl}
            initialRatings={ratings}
          />
        )}
      </main>
    </div>
  );
}
