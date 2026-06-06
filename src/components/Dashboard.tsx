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
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [recoveringProfile, setRecoveringProfile] = useState(false);

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
      const statusRes = await fetch("/api/auth/rate-limit-status");
      const status = await statusRes.json().catch(() => null);
      if (cancelled) return null;

      if (status?.rateLimited && status.secondsRemaining > 0) {
        setWaitSeconds(status.secondsRemaining);
        setProfileWarning(
          `Spotify limits profile lookups separately from playback. Wait about ${Math.ceil(status.secondsRemaining / 60)} min — do not refresh.`
        );
        return {
          rateLimited: true,
          retryAfterSeconds: status.secondsRemaining,
        };
      }

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
        setWaitSeconds(0);
        setRecoveringProfile(false);
        return data.user;
      }

      const warning = data?.warning ?? "Spotify profile not loaded yet.";
      setProfileWarning(warning);
      const retryAfterSeconds = data?.retryAfterSeconds ?? 0;
      if (retryAfterSeconds > 0) {
        setWaitSeconds((prev) => Math.max(prev, retryAfterSeconds));
      }
      return {
        rateLimited: Boolean(data?.rateLimited),
        retryAfterSeconds,
      };
    }

    async function runRecoverProfile() {
      setRecoveringProfile(true);
      setProfileWarning("Loading your Spotify profile…");
      const recoverRes = await fetch("/api/auth/recover-profile", { method: "POST" });
      const recoverData = await recoverRes.json().catch(() => null);
      if (cancelled) return;

      if (recoverData?.user) {
        setUser(recoverData.user);
        setProfileWarning(null);
        setWaitSeconds(0);
        setRecoveringProfile(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("rate_limit");
        window.history.replaceState({}, "", url.pathname + url.search);
        return;
      }

      if (recoverData?.rateLimited && recoverData.retryAfterSeconds > 0) {
        setWaitSeconds(recoverData.retryAfterSeconds);
        setRecoveringProfile(false);
        setProfileWarning(
          `Still rate limited — wait about ${Math.ceil(recoverData.retryAfterSeconds / 60)} more minute(s). Playback is unaffected.`
        );
        return;
      }

      setRecoveringProfile(false);
      setProfileWarning(
        recoverData?.warning ?? "Could not load profile. Wait 5 minutes, then tap Retry now."
      );
    }

    async function waitForRateLimitThenRecover(initialSeconds: number) {
      let remaining = Math.max(initialSeconds, 0);
      setWaitSeconds(remaining);
      setProfileWarning(
        remaining > 0
          ? `Spotify is rate-limiting profile requests. Auto-loading in ${remaining}s…`
          : "Loading your Spotify profile…"
      );

      while (remaining > 0 && !cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusRes = await fetch("/api/auth/rate-limit-status");
        const status = await statusRes.json().catch(() => null);
        remaining = Math.max(
          status?.secondsRemaining ?? remaining - 1,
          0
        );
        setWaitSeconds(remaining);
        if (remaining > 0) {
          setProfileWarning(
            `Spotify is rate-limiting profile requests. Auto-loading in ${remaining}s…`
          );
        }
      }

      if (cancelled) return;
      await runRecoverProfile();
    }

    async function loadUser() {
      const params = new URLSearchParams(window.location.search);
      const rateLimitSec = Number(params.get("rate_limit")) || 0;

      const statusRes = await fetch("/api/auth/rate-limit-status");
      const status = await statusRes.json().catch(() => null);
      const initialWait = Math.max(
        rateLimitSec,
        status?.secondsRemaining ?? 0
      );

      if (initialWait > 0) {
        await waitForRateLimitThenRecover(initialWait);
        if (cancelled) return;
      }

      const result = await tryLoadProfile();
      if (
        result &&
        typeof result === "object" &&
        "rateLimited" in result &&
        result.rateLimited &&
        (result.retryAfterSeconds ?? 0) > 0
      ) {
        await waitForRateLimitThenRecover(result.retryAfterSeconds ?? 300);
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
    <div className="min-h-screen overflow-x-hidden">
      <CanonicalHostRedirect />
      <AppHeader userLabel={user?.display_name ?? user?.id} />

      <main className="mx-auto max-w-6xl min-w-0 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
        {profileWarning && !user && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
            <p>{profileWarning}</p>
            {waitSeconds > 0 && !recoveringProfile && (
              <p className="mt-2 font-mono text-lg tabular-nums text-amber-100">
                {waitSeconds}s
              </p>
            )}
            {recoveringProfile && (
              <p className="mt-2 text-xs text-amber-200/80">Please stay on this page…</p>
            )}
            <p className="mt-2 text-xs text-amber-200/80">
              Live playback uses a different Spotify API than your profile — you are not locked out of
              Spotify, only profile lookup is paused. Do not refresh; recovery runs when the timer ends.
            </p>
            <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              {waitSeconds === 0 && !recoveringProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    void fetch("/api/auth/recover-profile", { method: "POST" }).then(() =>
                      window.location.reload()
                    );
                  }}
                  className="font-medium text-accent hover:underline"
                >
                  Retry now
                </button>
              ) : (
                <span className="text-zinc-500">Recover profile (automatic)</span>
              )}
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
