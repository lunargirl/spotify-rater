"use client";

import { useState } from "react";
import Image from "next/image";
import type { SpotifyTrack } from "@/types";
import { ArtistLink, AlbumLink, SongLink } from "./EntityLink";

interface SearchPanelProps {
  onSelectTrack: (track: SpotifyTrack) => void;
  selectedTrackId: string | null;
}

export function SearchPanel({ onSelectTrack, selectedTrackId }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setError(null);

    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Search failed");

      setResults(data.tracks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="glass-card p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
        Search Tracks
      </h3>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Song, artist, or album..."
          className="flex-1 rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus-accent"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {searching ? "..." : "Search"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto">
          {results.map((track) => {
            const art = track.album.images[track.album.images.length - 1]?.url;
            const isSelected = selectedTrackId === track.id;

            return (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={() => onSelectTrack(track)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${
                    isSelected
                      ? "bg-accent-muted ring-1 ring-accent"
                      : "hover:bg-zinc-800/60"
                  }`}
                >
                  {art ? (
                    <Image
                      src={art}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-md bg-zinc-800" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <SongLink trackId={track.id} trackName={track.name} />
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {track.artists.map((a, i) => (
                        <span key={a.id ?? i}>
                          {i > 0 && ", "}
                          <ArtistLink artistId={a.id} artistName={a.name} className="text-xs" />
                        </span>
                      ))}
                      {track.album.id && (
                        <>
                          {" · "}
                          <AlbumLink albumId={track.album.id} albumName={track.album.name} className="text-xs" />
                        </>
                      )}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="shrink-0 text-xs font-medium text-accent">Selected</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
