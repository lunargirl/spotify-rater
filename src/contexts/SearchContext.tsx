"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { SpotifyTrack } from "@/types";

type TrackSelectHandler = (track: SpotifyTrack) => void;

interface SearchContextValue {
  /** Returns true when a page registered a handler (e.g. Live Rater). */
  selectTrack: (track: SpotifyTrack) => boolean;
  registerTrackSelect: (handler: TrackSelectHandler | null) => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<TrackSelectHandler | null>(null);

  const registerTrackSelect = useCallback((next: TrackSelectHandler | null) => {
    handlerRef.current = next;
  }, []);

  const selectTrack = useCallback((track: SpotifyTrack) => {
    const handler = handlerRef.current;
    if (!handler) return false;
    handler(track);
    return true;
  }, []);

  const value = useMemo(
    () => ({ selectTrack, registerTrackSelect }),
    [selectTrack, registerTrackSelect]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchContext() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearchContext must be used within SearchProvider");
  }
  return ctx;
}
