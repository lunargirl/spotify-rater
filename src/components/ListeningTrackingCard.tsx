"use client";

import { useState } from "react";
import type { ListeningStats } from "@/types";

function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ListeningTrackingCardProps {
  stats: ListeningStats | null;
  loading?: boolean;
  onStatsChange: (stats: ListeningStats) => void;
}

export function ListeningTrackingCard({
  stats,
  loading = false,
  onStatsChange,
}: ListeningTrackingCardProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/listening/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsReauth) {
          window.location.href = "/api/auth/spotify";
          return;
        }
        throw new Error(data.error ?? "Failed to start tracking");
      }
      if (data.stats) onStatsChange(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start tracking");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/listening/stop", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to stop tracking");
      if (data.stats) onStatsChange(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop tracking");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="glass-card h-28 animate-pulse" />;
  }

  const enabled = stats?.enabled ?? false;

  return (
    <section className="glass-card min-w-0 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
            Listening history
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            {enabled
              ? "We sync your Spotify recently-played list hourly and when you open the app. Plays are saved in your account from now on."
              : "Start tracking to build your own play history. Spotify only exposes recent plays — we save them before they roll away."}
          </p>
          {enabled && (
            <p className="mt-2 text-xs text-zinc-600">
              Started {formatWhen(stats?.startedAt ?? null)} · Last sync{" "}
              {formatWhen(stats?.lastSyncedAt ?? null)} · {stats?.totalPlays ?? 0} plays saved
            </p>
          )}
        </div>

        <div className="shrink-0">
          {enabled ? (
            <button
              type="button"
              onClick={handleStop}
              disabled={busy}
              className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:opacity-50"
            >
              {busy ? "Stopping…" : "Stop tracking"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={busy}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? "Starting…" : "Start tracking"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {!enabled && (
        <p className="mt-3 text-xs text-zinc-600">
          Set up a free hourly ping at cron-job.org to your sync URL (see CRON_SECRET in env).
          Sign in again once after starting to grant recently-played access.
        </p>
      )}
    </section>
  );
}
