"use client";

import { useEffect, useState } from "react";
import { normalizeSongRating } from "@/lib/analytics";
import type { SongRating } from "@/types";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

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

  useEffect(() => {
    setRatings(initialRatings.map(normalizeSongRating));
  }, [initialRatings]);

  return (
    <AnalyticsDashboard
      ratings={ratings}
      displayName={displayName}
      profilePictureUrl={profilePictureUrl}
    />
  );
}
