"use client";

import { useMemo, useState } from "react";
import type { AnalyticsFilters } from "@/lib/analytics";
import { extractFilterOptions, normalizeSongRating } from "@/lib/analytics";
import type { SongRating } from "@/types";
import { formatRating } from "@/lib/utils";

interface AnalyticsFilterPanelProps {
  ratings: SongRating[];
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function countActiveFilters(filters: AnalyticsFilters): number {
  let count = 0;
  if (filters.selectedArtists.length > 0) count += 1;
  if (filters.ratingMin > 0 || filters.ratingMax < 10) count += 1;
  if (filters.selectedDecades.length > 0) count += 1;
  if (filters.selectedYears.length > 0) count += 1;
  return count;
}

export function AnalyticsFilterPanel({
  ratings,
  filters,
  onChange,
}: AnalyticsFilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  const normalizedRatings = useMemo(
    () => ratings.map((rating) => normalizeSongRating(rating)),
    [ratings]
  );

  const options = useMemo(
    () => extractFilterOptions(normalizedRatings),
    [normalizedRatings]
  );

  const filteredArtistOptions = options.artists.filter((artist) =>
    artist.toLowerCase().includes(filters.artistQuery.trim().toLowerCase())
  );

  function update(partial: Partial<AnalyticsFilters>) {
    onChange({ ...filters, ...partial });
  }

  function clearFilters() {
    onChange({
      artistQuery: "",
      selectedArtists: [],
      ratingMin: 0,
      ratingMax: 10,
      selectedDecades: [],
      selectedYears: [],
    });
  }

  return (
    <div className="glass-card flex flex-col p-3 sm:p-5 lg:h-full">
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        className="mb-0 flex w-full items-center justify-between gap-2 text-left lg:pointer-events-none lg:mb-4"
        aria-expanded={mobileOpen}
      >
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Filters</h3>
          {activeCount > 0 && (
            <span className="rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-accent">
              {activeCount}
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500 lg:hidden">
          {mobileOpen ? "Hide filters" : "Show filters"}
        </span>
      </button>

      <div className="mt-3 hidden items-center justify-end lg:flex">
        <button
          type="button"
          onClick={clearFilters}
          className="text-xs font-medium text-accent hover:underline"
        >
          Clear all
        </button>
      </div>

      <div
        className={`space-y-4 sm:space-y-5 lg:max-h-[32rem] lg:overflow-y-auto lg:pr-1 ${
          mobileOpen ? "mt-4 block" : "hidden lg:mt-0 lg:block"
        }`}
      >
        <div className="flex justify-end lg:hidden">
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-accent hover:underline"
          >
            Clear all
          </button>
        </div>
        <section>
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">
            Artist
          </label>
          <input
            type="text"
            value={filters.artistQuery}
            onChange={(e) => update({ artistQuery: e.target.value, selectedArtists: [] })}
            placeholder="Search artists..."
            className="mb-2 w-full rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus-accent"
          />
          <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/40 p-2">
            {filteredArtistOptions.length === 0 ? (
              <p className="px-2 py-1 text-xs text-zinc-600">No artists found</p>
            ) : (
              filteredArtistOptions.map((artist) => {
                const selected = filters.selectedArtists.includes(artist);
                return (
                  <button
                    key={artist}
                    type="button"
                    onClick={() =>
                      update({
                        selectedArtists: toggleValue(filters.selectedArtists, artist),
                        artistQuery: "",
                      })
                    }
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs transition ${
                      selected
                        ? "bg-accent-muted text-accent"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {artist}
                  </button>
                );
              })
            )}
          </div>
          {filters.selectedArtists.length > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              {filters.selectedArtists.length} artist
              {filters.selectedArtists.length === 1 ? "" : "s"} selected
            </p>
          )}
        </section>

        <section>
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">
            Rating Range
          </label>
          <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>Min</span>
                <span className="tabular-nums text-zinc-300">{formatRating(filters.ratingMin)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={25}
                value={Math.round(filters.ratingMin * 100)}
                onChange={(e) =>
                  update({
                    ratingMin: Math.min(parseInt(e.target.value, 10) / 100, filters.ratingMax),
                  })
                }
                className="rating-slider w-full"
                style={
                  {
                    "--slider-color": "#1db954",
                    "--slider-percent": `${(filters.ratingMin / 10) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500">
                <span>Max</span>
                <span className="tabular-nums text-zinc-300">{formatRating(filters.ratingMax)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={25}
                value={Math.round(filters.ratingMax * 100)}
                onChange={(e) =>
                  update({
                    ratingMax: Math.max(parseInt(e.target.value, 10) / 100, filters.ratingMin),
                  })
                }
                className="rating-slider w-full"
                style={
                  {
                    "--slider-color": "#1db954",
                    "--slider-percent": `${(filters.ratingMax / 10) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        </section>

        <section>
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">
            Release Decade
          </label>
          <div className="flex flex-wrap gap-2">
            {options.decades.length === 0 ? (
              <span className="text-xs text-zinc-600">No release dates yet</span>
            ) : (
              options.decades.map((decade) => {
                const selected = filters.selectedDecades.includes(decade);
                return (
                  <button
                    key={decade}
                    type="button"
                    onClick={() =>
                      update({
                        selectedDecades: toggleValue(filters.selectedDecades, decade),
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      selected
                        ? "bg-accent text-on-accent"
                        : "border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white"
                    }`}
                  >
                    {decade}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section>
          <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">
            Release Year
          </label>
          <div className="max-h-28 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/40 p-2">
            <div className="flex flex-wrap gap-2">
              {options.years.length === 0 ? (
                <span className="px-2 py-1 text-xs text-zinc-600">No years available</span>
              ) : (
                options.years.map((year) => {
                  const selected = filters.selectedYears.includes(year);
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() =>
                        update({
                          selectedYears: toggleValue(filters.selectedYears, year),
                        })
                      }
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        selected
                          ? "bg-zinc-200 text-black"
                          : "border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white"
                      }`}
                    >
                      {year}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
