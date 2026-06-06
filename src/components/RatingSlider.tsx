"use client";

import { useCallback, useEffect, useState } from "react";
import { formatRating, ratingColor } from "@/lib/utils";

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function clampRating(value: number): number {
  return Math.min(10, Math.max(0, Math.round(value * 100) / 100));
}

export function RatingSlider({ value, onChange, disabled }: RatingSliderProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const color = ratingColor(value);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commitDraft = useCallback(
    (raw: string) => {
      if (raw === "" || raw === ".") {
        setDraft(null);
        return;
      }
      const parsed = parseFloat(raw);
      if (!Number.isNaN(parsed)) {
        onChange(clampRating(parsed));
      }
      setDraft(null);
    },
    [onChange]
  );

  const handleDraftChange = (raw: string) => {
    if (raw !== "" && !/^\d*\.?\d{0,2}$/.test(raw)) return;
    setDraft(raw);
    if (raw === "" || raw === ".") return;
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onChange(clampRating(parsed));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Your Rating
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <input
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            value={draft ?? formatRating(value)}
            onChange={(e) => handleDraftChange(e.target.value)}
            onBlur={(e) => commitDraft(e.target.value)}
            disabled={disabled}
            aria-label="Rating value"
            className="w-[5.5rem] border-b-2 border-transparent bg-transparent text-5xl font-bold tabular-nums outline-none transition-colors duration-200 focus:border-zinc-600 disabled:opacity-50 sm:w-[6rem]"
            style={{ color }}
          />
          <span className="pb-1 text-2xl font-medium text-zinc-500">/10</span>
        </div>
        <p className="mt-1 text-xs text-zinc-600">Type a value or use the slider</p>
      </div>

      <input
        type="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(value * 100)}
        onChange={(e) => {
          setDraft(null);
          onChange(parseInt(e.target.value, 10) / 100);
        }}
        disabled={disabled}
        className="rating-slider w-full touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
        style={
          {
            "--slider-color": color,
            "--slider-percent": `${(value / 10) * 100}%`,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
