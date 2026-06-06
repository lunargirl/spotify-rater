"use client";

import { useEffect, useState } from "react";
import { normalizeSongRating } from "@/lib/analytics";
import type { ListeningStats, SongRating } from "@/types";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { ListeningTrackingCard } from "./ListeningTrackingCard";

interface ProfilePageProps {
  displayName: string;
  profilePictureUrl?: string | null;
  initialRatings: SongRating[];
}

export function ProfilePage({
  displayName,
  profilePictureUrl,
  initialRatings,
}: ProfilePageProps) {
  const [ratings, setRatings] = useState(() =>
    initialRatings.map(normalizeSongRating)
  );
  const [listening, setListening] = useState<ListeningStats | null>(null);
  const [listeningLoading, setListeningLoading] = useState(true);

  useEffect(() => {
    setRatings(initialRatings.map(normalizeSongRating));
  }, [initialRatings]);

  useEffect(() => {
    let cancelled = false;

    async function initListening() {
      try {
        const statusRes = await fetch("/api/listening/status");
        if (!statusRes.ok || cancelled) return;

        let stats = (await statusRes.json()) as ListeningStats;

        if (stats.enabled) {
          const syncRes = await fetch("/api/listening/sync", { method: "POST" });
          if (syncRes.ok && !cancelled) {
            const data = await syncRes.json();
            if (data.stats) stats = data.stats as ListeningStats;
          }
        }

        if (!cancelled) setListening(stats);
      } finally {
        if (!cancelled) setListeningLoading(false);
      }
    }

    initListening();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ListeningTrackingCard
        stats={listening}
        loading={listeningLoading}
        onStatsChange={setListening}
      />
      <AnalyticsDashboard
        ratings={ratings}
        displayName={displayName}
        profilePictureUrl={profilePictureUrl}
        listening={listening}
      />
    </div>
  );
}
