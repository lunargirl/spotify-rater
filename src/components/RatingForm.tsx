"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { SpotifyTrack } from "@/types";
import { formatArtists, formatArtistsDisplay } from "@/lib/utils";
import { RatingSlider } from "./RatingSlider";

interface RatingFormProps {
  track: SpotifyTrack | null;
  initialRating?: number;
  initialComments?: string;
  onSaved?: () => void;
}

export function RatingForm({
  track,
  initialRating = 5.0,
  initialComments = "",
  onSaved,
}: RatingFormProps) {
  const [rating, setRating] = useState(initialRating);
  const [comments, setComments] = useState(initialComments);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    setRating(initialRating);
    setComments(initialComments);
    setMessage(null);
  }, [track?.id, initialRating, initialComments]);

  if (!track) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-zinc-500">Select a track to rate it.</p>
      </div>
    );
  }

  const albumArt = track.album.images[0]?.url;

  async function handleSave() {
    if (!track) return;
    setSaving(true);
    setMessage(null);

    try {
      await fetch("/api/auth/bootstrap", { method: "POST" });

      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotify_track_id: track.id,
          rating,
          comments: comments.trim() || undefined,
          track_name: track.name,
          artist_name: formatArtists(track.artists),
          album_art_url: albumArt,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Failed to save rating");

      const successText = data.warning
        ? `Rating saved! ${data.warning}`
        : "Rating saved!";
      setMessage({ type: "success", text: successText });
      onSaved?.();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card p-6">
      <div className="mb-6 flex items-center gap-4">
        {albumArt && (
          <Image
            src={albumArt}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{track.name}</p>
          <p className="truncate text-sm text-zinc-400">{formatArtistsDisplay(track.artists)}</p>
        </div>
      </div>

      <RatingSlider value={rating} onChange={setRating} disabled={saving} />

      <div className="mt-6">
        <label htmlFor="comments" className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">
          Comments
        </label>
        <textarea
          id="comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          placeholder="What did you think? Production, lyrics, vibes..."
          disabled={saving}
          className="w-full resize-none rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus-accent disabled:opacity-50"
        />
      </div>

      {message && (
        <p
          className={`mt-4 text-sm ${
            message.type === "success" ? "text-accent" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Rating"}
      </button>
    </div>
  );
}
