"use client";

import Image from "next/image";
import type { NowPlaying } from "@/types";
import { formatArtistsDisplay, formatDuration } from "@/lib/utils";
import { AlbumLink, SongLink } from "./EntityLink";

interface NowPlayingCardProps {
  nowPlaying: NowPlaying | null;
  loading: boolean;
}

export function NowPlayingCard({ nowPlaying, loading }: NowPlayingCardProps) {
  if (loading) {
    return (
      <div className="glass-card animate-pulse p-6">
        <div className="flex gap-5">
          <div className="h-28 w-28 shrink-0 rounded-xl bg-zinc-800" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-4 w-24 rounded bg-zinc-800" />
            <div className="h-6 w-3/4 rounded bg-zinc-800" />
            <div className="h-4 w-1/2 rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  const track = nowPlaying?.track;

  if (!track) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/80">
          <svg className="h-8 w-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-zinc-300">Nothing playing</p>
        <p className="mt-1 text-sm text-zinc-500">
          Start playing something on Spotify, or search for a track below.
        </p>
      </div>
    );
  }

  const albumArt = track.album.images[0]?.url;
  const progress = nowPlaying?.progress_ms ?? 0;
  const duration = track.duration_ms;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="glass-card min-w-0 overflow-hidden p-4 sm:p-6">
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <span
          className={`inline-flex h-2 w-2 rounded-full ${
            nowPlaying?.isPlaying ? "animate-pulse bg-accent" : "bg-zinc-500"
          }`}
        />
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {nowPlaying?.isPlaying ? "Now Playing" : "Paused"}
        </span>
        {nowPlaying?.device && (
          <span className="ml-auto hidden truncate text-xs text-zinc-600 sm:inline">
            via {nowPlaying.device}
          </span>
        )}
      </div>

      <div className="flex min-w-0 gap-3 sm:gap-5">
        {albumArt ? (
          <Image
            src={albumArt}
            alt={`${track.name} album art`}
            width={112}
            height={112}
            priority
            className="h-20 w-20 shrink-0 rounded-xl object-cover shadow-lg shadow-black/40 sm:h-28 sm:w-28"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-800 sm:h-28 sm:w-28">
            <svg className="h-10 w-10 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="min-w-0 truncate text-lg font-bold sm:text-xl">
            <SongLink
              trackId={track.id}
              trackName={track.name}
              className="text-lg font-bold sm:text-xl"
            />
          </h2>
          <p className="truncate text-sm text-zinc-400">
            {formatArtistsDisplay(track.artists)}
          </p>
          <p className="mt-1 min-w-0 truncate text-xs text-zinc-600">
            <AlbumLink albumId={track.album.id} albumName={track.album.name} className="text-xs" />
          </p>

          <div className="mt-4">
            <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs tabular-nums text-zinc-600">
              <span>{formatDuration(progress)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
