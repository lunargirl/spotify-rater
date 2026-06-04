"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { SpotifyTrack, SongRating } from "@/types";
import { formatArtists, formatDuration, formatRating } from "@/lib/utils";
import { ArtistLink, AlbumLink, SongLink } from "./EntityLink";
import { DeleteRatingButton } from "./DeleteRatingButton";

export interface MassRatingRow {
  track: SpotifyTrack;
  existing?: SongRating;
}

interface MassRatingTableProps {
  rows: MassRatingRow[];
  onSaved?: () => void;
  /** When true, only changed tracks are sent to the bulk API (album mass-rating). */
  dirtyOnlySave?: boolean;
}

function scoresEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

export function MassRatingTable({
  rows,
  onSaved,
  dirtyOnlySave = false,
}: MassRatingTableProps) {
  const [baselines, setBaselines] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, number> = {};
    for (const row of rows) {
      initial[row.track.id] = row.existing ? Number(row.existing.rating) : 5.0;
    }
    setBaselines(initial);
    setScores(initial);
    setScoreDrafts({});
    setDirty(new Set());
  }, [rows]);

  const dirtyCount = dirty.size;

  const updateScore = useCallback(
    (trackId: string, value: number) => {
      const clamped = Math.min(10, Math.max(0, Math.round(value * 100) / 100));
      setScores((prev) => ({ ...prev, [trackId]: clamped }));

      if (!dirtyOnlySave) return;

      const baseline = baselines[trackId] ?? 5;
      setDirty((prev) => {
        const next = new Set(prev);
        if (scoresEqual(clamped, baseline)) next.delete(trackId);
        else next.add(trackId);
        return next;
      });
    },
    [baselines, dirtyOnlySave]
  );

  const handleScoreDraftChange = useCallback(
    (trackId: string, raw: string) => {
      if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;

      setScoreDrafts((prev) => ({ ...prev, [trackId]: raw }));

      if (raw === "" || raw === ".") return;

      const parsed = parseFloat(raw);
      if (!Number.isNaN(parsed)) {
        updateScore(trackId, parsed);
      }
    },
    [updateScore]
  );

  const clearScoreDraft = useCallback((trackId: string) => {
    setScoreDrafts((prev) => {
      if (!(trackId in prev)) return prev;
      const next = { ...prev };
      delete next[trackId];
      return next;
    });
  }, []);

  const rowsToSave = useMemo(() => {
    if (!dirtyOnlySave) return rows;
    return rows.filter((row) => dirty.has(row.track.id));
  }, [rows, dirty, dirtyOnlySave]);

  async function saveAll() {
    if (dirtyOnlySave && rowsToSave.length === 0) {
      setMessage("No changes to save.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const targetRows = dirtyOnlySave ? rowsToSave : rows;
    const payload = targetRows.map((row) => ({
      spotify_track_id: row.track.id,
      rating: scores[row.track.id] ?? 5,
      track_name: row.track.name,
      artist_name: formatArtists(row.track.artists),
      album_art_url: row.track.album.images[0]?.url,
    }));

    try {
      const res = await fetch("/api/ratings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bulk save failed");

      const savedCount = data.saved ?? payload.length;
      setMessage(`Saved ${savedCount} rating${savedCount === 1 ? "" : "s"}.`);

      if (dirtyOnlySave) {
        setBaselines((prev) => {
          const next = { ...prev };
          for (const row of targetRows) {
            next[row.track.id] = scores[row.track.id] ?? prev[row.track.id];
          }
          return next;
        });
        setDirty(new Set());
      }

      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const saveDisabled =
    saving || rows.length === 0 || (dirtyOnlySave && dirtyCount === 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/50 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-900/40 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-white">Track ratings</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {rows.length} track{rows.length === 1 ? "" : "s"}
            {dirtyOnlySave && dirtyCount > 0 && (
              <span className="text-accent">
                {" "}
                · {dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={saveAll}
          disabled={saveDisabled}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : dirtyOnlySave ? "Save changes" : "Save all ratings"}
        </button>
      </div>

      {message && (
        <p className="border-b border-zinc-800/60 px-5 py-2.5 text-sm text-accent">{message}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/30 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="w-12 px-5 py-3 text-center">#</th>
              <th className="px-5 py-3">Track</th>
              <th className="w-24 px-5 py-3 text-right">Time</th>
              <th className="w-80 px-5 py-3">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {rows.map((row, index) => {
              const art = row.track.album.images[row.track.album.images.length - 1]?.url;
              const score = scores[row.track.id] ?? 5;
              const isDirty = dirtyOnlySave && dirty.has(row.track.id);

              return (
                <tr
                  key={row.track.id}
                  className={`transition-colors ${
                    isDirty ? "bg-accent-muted/30" : "hover:bg-zinc-900/40"
                  }`}
                >
                  <td className="px-5 py-3.5 text-center tabular-nums text-zinc-600">
                    {row.track.track_number ?? index + 1}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3.5">
                      {art ? (
                        <Image
                          src={art}
                          alt=""
                          width={44}
                          height={44}
                          className="h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-zinc-800"
                        />
                      ) : (
                        <div className="h-11 w-11 shrink-0 rounded-md bg-zinc-800" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          <SongLink trackId={row.track.id} trackName={row.track.name} />
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {row.track.artists.map((a, i) => (
                            <span key={a.id ?? i}>
                              {i > 0 && ", "}
                              <ArtistLink
                                artistId={a.id}
                                artistName={a.name}
                                className="text-xs"
                              />
                            </span>
                          ))}
                        </p>
                        {row.track.album.id && (
                          <AlbumLink
                            albumId={row.track.album.id}
                            albumName={row.track.album.name}
                            className="text-xs"
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-zinc-500">
                    {formatDuration(row.track.duration_ms)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          row.track.id in scoreDrafts
                            ? scoreDrafts[row.track.id]
                            : Number.isFinite(score)
                              ? formatRating(score)
                              : ""
                        }
                        onChange={(e) =>
                          handleScoreDraftChange(row.track.id, e.target.value)
                        }
                        onBlur={() => {
                          const draft = scoreDrafts[row.track.id];
                          if (draft === "" || draft === ".") {
                            clearScoreDraft(row.track.id);
                            return;
                          }
                          clearScoreDraft(row.track.id);
                        }}
                        className="h-9 w-[4.25rem] shrink-0 rounded-lg border border-zinc-700/80 bg-zinc-900 px-2 text-center text-sm font-medium tabular-nums text-white outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/40"
                        aria-label={`Rating for ${row.track.name}`}
                      />
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        step={1}
                        value={Math.round(score * 100)}
                        onChange={(e) =>
                          updateScore(row.track.id, parseInt(e.target.value, 10) / 100)
                        }
                        className="rating-slider min-w-0 flex-1"
                        style={
                          {
                            "--slider-color": "var(--accent)",
                            "--slider-percent": `${(score / 10) * 100}%`,
                          } as React.CSSProperties
                        }
                        aria-label={`Slider for ${row.track.name}`}
                      />
                      <span className="w-11 shrink-0 text-right text-xs font-medium tabular-nums text-zinc-400">
                        {formatRating(score)}
                      </span>
                      {row.existing && (
                        <DeleteRatingButton
                          trackId={row.track.id}
                          onDeleted={() => {
                            setScores((prev) => ({ ...prev, [row.track.id]: 5 }));
                            setBaselines((prev) => {
                              const next = { ...prev };
                              delete next[row.track.id];
                              return next;
                            });
                            setDirty((prev) => {
                              const next = new Set(prev);
                              next.delete(row.track.id);
                              return next;
                            });
                            onSaved?.();
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
