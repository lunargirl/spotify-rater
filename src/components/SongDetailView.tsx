"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { SongRating, SpotifyTrack } from "@/types";
import { formatArtists, formatDuration, formatRating, ratingColor } from "@/lib/utils";
import { AppHeader } from "./AppHeader";
import { ArtistLink, AlbumLink } from "./EntityLink";
import { RatingSlider } from "./RatingSlider";
import { DeleteRatingButton } from "./DeleteRatingButton";

interface SongData {
  track: SpotifyTrack;
  rating: SongRating | null;
}

export function SongDetailView({ trackId }: { trackId: string }) {
  const [data, setData] = useState<SongData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [rating, setRating] = useState(5.0);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spotify/tracks/${trackId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load song");
      setData(json);
      if (json.rating) {
        setRating(Number(json.rating.rating));
        setComments(json.rating.comments ?? "");
      } else {
        setRating(5.0);
        setComments("");
        setEditMode(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!data?.track) return;
    setSaving(true);
    setMessage(null);

    const track = data.track;
    const art = track.album.images[0]?.url;

    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotify_track_id: track.id,
          rating,
          comments: comments.trim() || undefined,
          track_name: track.name,
          artist_name: formatArtists(track.artists),
          album_art_url: art,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");

      setMessage({ type: "success", text: "Rating saved." });
      setEditMode(false);
      await load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  }

  const track = data?.track;
  const savedRating = data?.rating;
  const art = track?.album.images[0]?.url ?? savedRating?.album_art_url;
  const savedComments = savedRating?.comments?.trim() ?? "";

  return (
    <div className="min-h-screen">
      <AppHeader userLabel={track?.name ?? "Song"} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {loading && <div className="glass-card h-56 animate-pulse" />}
        {error && <div className="glass-card p-6 text-red-400">{error}</div>}

        {track && (
          <>
            <section className="glass-card overflow-hidden p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {art ? (
                  <Image
                    src={art}
                    alt={track.name}
                    width={200}
                    height={200}
                    className="mx-auto h-48 w-48 shrink-0 rounded-2xl object-cover shadow-xl ring-1 ring-zinc-800 sm:mx-0"
                  />
                ) : (
                  <div className="mx-auto h-48 w-48 shrink-0 rounded-2xl bg-zinc-800 sm:mx-0" />
                )}

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    Track
                  </p>
                  <h1 className="mt-1 text-3xl font-bold text-white">{track.name}</h1>
                  <p className="mt-2 text-sm text-zinc-400">
                    {track.artists.map((a, i) => (
                      <span key={a.id ?? i}>
                        {i > 0 && ", "}
                        <ArtistLink artistId={a.id} artistName={a.name} />
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    <AlbumLink albumId={track.album.id} albumName={track.album.name} />
                    {track.album.release_date
                      ? ` · ${track.album.release_date.slice(0, 4)}`
                      : ""}
                    {" · "}
                    {formatDuration(track.duration_ms)}
                  </p>

                  {savedRating && !editMode && (
                    <p
                      className="mt-4 text-4xl font-bold tabular-nums"
                      style={{ color: ratingColor(Number(savedRating.rating)) }}
                    >
                      {formatRating(Number(savedRating.rating))}
                    </p>
                  )}

                  {track.external_urls?.spotify && (
                    <a
                      href={track.external_urls.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
                    >
                      Open in Spotify
                    </a>
                  )}

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setEditMode((open) => !open);
                      }}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      {editMode
                        ? "Close editor"
                        : savedRating
                          ? "Edit rating"
                          : "Rate this track"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {savedComments && !editMode && (
              <blockquote className="relative rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 px-8 py-10 shadow-inner">
                <span
                  className="pointer-events-none absolute left-5 top-3 font-serif text-6xl leading-none text-zinc-700"
                  aria-hidden
                >
                  &ldquo;
                </span>
                <p className="relative z-10 text-center text-lg font-medium leading-relaxed text-zinc-100 sm:text-xl">
                  {savedComments}
                </p>
              </blockquote>
            )}

            {editMode && (
              <section className="glass-card p-6">
                <RatingSlider value={rating} onChange={setRating} disabled={saving} />

                <div className="mt-6">
                  <label
                    htmlFor="song-comments"
                    className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500"
                  >
                    Your note
                  </label>
                  <textarea
                    id="song-comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={4}
                    placeholder="Production, lyrics, vibes…"
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

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:opacity-50"
                  >
                    {saving ? "Saving…" : savedRating ? "Update rating" : "Save rating"}
                  </button>
                  {savedRating && (
                    <DeleteRatingButton
                      trackId={trackId}
                      variant="text"
                      onDeleted={() => {
                        setEditMode(false);
                        load();
                      }}
                    />
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
