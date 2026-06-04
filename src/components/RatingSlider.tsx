"use client";

import { formatRating, ratingColor } from "@/lib/utils";

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function RatingSlider({ value, onChange, disabled }: RatingSliderProps) {
  const color = ratingColor(value);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Your Rating
        </p>
        <p
          className="text-5xl font-bold tabular-nums transition-colors duration-200"
          style={{ color }}
        >
          {formatRating(value)}
        </p>
      </div>

      <input
        type="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(parseInt(e.target.value, 10) / 100)}
        disabled={disabled}
        className="rating-slider w-full disabled:cursor-not-allowed disabled:opacity-50"
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
