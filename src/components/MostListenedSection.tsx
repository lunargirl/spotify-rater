"use client";

import Image from "next/image";
import type { MostListenedTrack } from "@/types";
import { SongLink } from "./EntityLink";

interface MostListenedSectionProps {
  tracks: MostListenedTrack[];
  totalPlays: number;
  enabled: boolean;
}

export function MostListenedSection({
  tracks,
  totalPlays,
  enabled,
}: MostListenedSectionProps) {
  if (!enabled) return null;

  return (
    <section className="glass-card min-w-0 p-3 sm:p-6">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-widest text-zinc-400">
        Most listened
      </h3>
      <p className="mb-4 text-xs text-zinc-600">
        Play counts from your saved history ({totalPlays} total plays tracked)
      </p>

      {tracks.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No plays saved yet. Sync runs hourly and when you open the app.
        </p>
      ) : (
        <ul className="space-y-1 sm:space-y-2">
          {tracks.map((track, index) => (
            <li
              key={track.spotify_track_id}
              className="flex min-w-0 items-center gap-2 rounded-xl p-2 transition hover:bg-zinc-800/60 sm:gap-3 sm:p-2.5"
            >
              <span className="w-4 shrink-0 text-center text-[10px] font-bold text-zinc-600 sm:w-5 sm:text-xs">
                {index + 1}
              </span>
              {track.album_art_url ? (
                <Image
                  src={track.album_art_url}
                  alt=""
                  width={40}
                  height={40}
                  className="h-9 w-9 shrink-0 rounded-md object-cover sm:h-10 sm:w-10"
                />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-md bg-zinc-800 sm:h-10 sm:w-10" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  <SongLink
                    trackId={track.spotify_track_id}
                    trackName={track.track_name}
                  />
                </p>
                <p className="truncate text-xs text-zinc-500">{track.artist_name}</p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-300 sm:text-base">
                {track.play_count}
                <span className="ml-1 text-[10px] font-medium text-zinc-600 sm:text-xs">plays</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
