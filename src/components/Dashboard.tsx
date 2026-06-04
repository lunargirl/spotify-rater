"use client";

import { useCallback, useEffect, useState } from "react";
import type { NowPlaying, SongRating, SpotifyTrack, SpotifyUser } from "@/types";
import { AppHeader } from "@/components/AppHeader";
import { CanonicalHostRedirect } from "@/components/CanonicalHostRedirect";
import { NowPlayingCard } from "@/components/NowPlayingCard";
import { useSearchContext } from "@/contexts/SearchContext";
import { RatingForm } from "@/components/RatingForm";
import { RatingsHistory } from "@/components/RatingsHistory";

export function Dashboard() {
  const { registerTrackSelect } = useSearchContext();
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [existingRating, setExistingRating] = useState<SongRating | null>(null);
  const [ratings, setRatings] = useState<SongRating[]>([]);
  const [loadingPlayback, setLoadingPlayback] = useState(true);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [useNowPlaying, setUseNowPlaying] = useState(true);
  const [profileWarning, setProfileWarning] = useState<string | null>(null);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/now-playing");
      if (res.ok) {
        const data: NowPlaying = await res.json();
        setNowPlaying(data);
        if (useNowPlaying && data.track) {
          setSelectedTrack(data.track);
        }
      }
    } finally {
      setLoadingPlayback(false);
    }
  }, [useNowPlaying]);

  const fetchRatings = useCallback(async () => {
    try {
      const res = await fetch("/api/ratings");
      if (res.ok) {
        const data = await res.json();
        setRatings(data.ratings ?? []);
      }
    } finally {
      setLoadingRatings(false);
    }
  }, []);

  const fetchExistingRating = useCallback(async (trackId: string) => {
    const res = await fetch(`/api/ratings/${trackId}`);
    if (res.ok) {
      const data = await res.json();
      setExistingRating(data.rating);
    } else {
      setExistingRating(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function tryLoadProfile() {
      const bootstrapRes = await fetch("/api/auth/bootstrap", { method: "POST" });
      const bootstrapData = await bootstrapRes.json().catch(() => null);
      const res = await fetch("/api/auth/me");
      if (cancelled) return null;

      if (res.status === 401) {
        window.location.replace("/api/auth/logout?redirect=/login");
        return null;
      }

      const data = await res.json().catch(() => null);
      if (data?.user) {
        setUser(data.user);
        setProfileWarning(null);
        return data.user;
      }

      const warning =
        data?.warning ??
        bootstrapData?.warning ??
        "Spotify profile not loaded yet.";
      setProfileWarning(warning);
      return { rateLimited: Boolean(data?.rateLimited ?? bootstrapData?.rateLimited), retryAfterSeconds: data?.retryAfterSeconds ?? bootstrapData?.retryAfterSeconds ?? 60 };
    }

    async function loadUser() {
      const params = new URLSearchParams(window.location.search);
      const rateLimitSec = Number(params.get("rate_limit")) || 0;

      if (rateLimitSec > 0) {
        setProfileWarning(
          `Spotify is rate-limiting logins. Your profile should load in about ${rateLimitSec} seconds — please wait.`
        );
        await new Promise((resolve) => setTimeout(resolve, (rateLimitSec + 3) * 1000));
        if (cancelled) return;
        await fetch("/api/auth/recover-profile", { method: "POST" });
      }

      const result = await tryLoadProfile();
      if (cancelled || !result || typeof result !== "object" || !("rateLimited" in result)) {
        return;
      }

      if (result.rateLimited) {
        const waitSec = Math.max(result.retryAfterSeconds ?? 60, 30) + 3;
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
        if (cancelled) return;
        await fetch("/api/auth/recover-profile", { method: "POST" });
        await tryLoadProfile();
      }
    }

    loadUser();
    fetchRatings();
    fetchNowPlaying();

    const interval = setInterval(fetchNowPlaying, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchNowPlaying, fetchRatings]);

  useEffect(() => {
    if (selectedTrack) {
      fetchExistingRating(selectedTrack.id);
    } else {
      setExistingRating(null);
    }
  }, [selectedTrack, fetchExistingRating]);

  const handleSelectTrack = useCallback((track: SpotifyTrack) => {
    setUseNowPlaying(false);
    setSelectedTrack(track);
  }, []);

  useEffect(() => {
    registerTrackSelect(handleSelectTrack);
    return () => registerTrackSelect(null);
  }, [handleSelectTrack, registerTrackSelect]);

  function handleUseNowPlaying() {
    setUseNowPlaying(true);
    if (nowPlaying?.track) {
      setSelectedTrack(nowPlaying.track);
    }
  }

  return (
    <div className="min-h-screen">
      <CanonicalHostRedirect />
      <AppHeader userLabel={user?.display_name ?? user?.id} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {profileWarning && !user && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
            <p>{profileWarning}</p>
            <p className="mt-2 text-xs text-amber-200/80">
              Do not refresh repeatedly — that triggers Spotify rate limits.
            </p>
            <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <a
                href="/api/auth/recover-profile"
                className="font-medium text-accent hover:underline"
              >
                Recover profile
              </a>
              <a
                href="/api/auth/logout?redirect=/login"
                className="font-medium text-zinc-400 hover:underline"
              >
                Sign out
              </a>
            </div>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                  Live Playback
                </h2>
                {nowPlaying?.track && !useNowPlaying && (
                  <button
                    type="button"
                    onClick={handleUseNowPlaying}
                    className="text-xs font-medium text-[#1db954] hover:underline"
                  >
                    Rate now playing
                  </button>
                )}
              </div>
              <NowPlayingCard nowPlaying={nowPlaying} loading={loadingPlayback} />
            </section>

            <RatingForm
              key={selectedTrack?.id ?? "none"}
              track={selectedTrack}
              initialRating={existingRating?.rating ?? 5.0}
              initialComments={existingRating?.comments ?? ""}
              onSaved={fetchRatings}
            />
          </div>

          <div className="lg:col-span-2">
            <RatingsHistory
              ratings={ratings}
              loading={loadingRatings}
              onChanged={fetchRatings}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
