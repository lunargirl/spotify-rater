"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSearchContext } from "@/contexts/SearchContext";
import type { SpotifyTrack } from "@/types";

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

export function HeaderSearch() {
  const router = useRouter();
  const { selectTrack } = useSearchContext();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || results.length === 0) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, results.length, updatePosition]);

  useEffect(() => {
    if (!open || results.length === 0) return;

    const onLayoutChange = () => updatePosition();
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, results.length, updatePosition]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setOpen(true);

    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.tracks ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function pickTrack(track: SpotifyTrack) {
    setOpen(false);
    setQuery("");
    setResults([]);

    if (selectTrack(track)) return;

    router.push(`/songs/${track.id}`);
  }

  const showDropdown = open && results.length > 0 && position && mounted;

  return (
    <div ref={anchorRef} className="relative z-[1] w-full min-w-0 sm:max-w-md sm:flex-1">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search tracks…"
          className="min-w-0 flex-1 rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus-accent"
          aria-label="Search tracks"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="shrink-0 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {searching ? "…" : "Search"}
        </button>
      </form>

      {showDropdown &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[9998] cursor-default bg-transparent"
              aria-label="Close search results"
              onClick={() => setOpen(false)}
            />
            <ul
              className="fixed z-[9999] max-h-72 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 py-1 shadow-2xl"
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
              }}
            >
              {results.map((track) => {
                const art = track.album.images[track.album.images.length - 1]?.url;
                return (
                  <li key={track.id}>
                    <button
                      type="button"
                      onClick={() => pickTrack(track)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-zinc-800/80"
                    >
                      {art ? (
                        <Image
                          src={art}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded-md bg-zinc-800" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{track.name}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {track.artists.map((a) => a.name).join(", ")}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>,
          document.body
        )}
    </div>
  );
}
