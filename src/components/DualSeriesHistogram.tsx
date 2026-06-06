"use client";

import { useEffect, useMemo, useState } from "react";
import { buildHistogramBins, type BinWidth } from "@/lib/analytics";
import {
  alignBenchmarkBins,
  averageToChartPercent,
  safeBinMaxCount,
} from "@/lib/histogram-utils";
import { computeScopeAverage, formatAverageLabel } from "@/lib/comparative-stats";
import {
  useCommunityBenchmark,
  type CommunityBenchmarkScope,
} from "@/hooks/useCommunityBenchmark";
import type { HistogramBin, SongRating } from "@/types";
import { formatRating } from "@/lib/utils";

const DEFAULT_BIN_WIDTH_OPTIONS: { value: BinWidth; label: string }[] = [
  { value: 0.25, label: "0.25" },
  { value: 0.5, label: "0.50" },
  { value: 1, label: "1" },
];

export type BenchmarkMode = "bars" | "average-line";

export interface DualSeriesHistogramProps {
  primaryRatings?: SongRating[];
  benchmarkRatings?: SongRating[];
  /** Pre-built benchmark bins (entity-scoped community); aligned to current binWidth bins. */
  benchmarkBins?: HistogramBin[];
  /** Faded bars from global or scoped community API. */
  benchmarkFromCommunity?: boolean;
  communityScope?: CommunityBenchmarkScope;
  benchmarkMode?: BenchmarkMode;
  /** Grand-average vertical marker (0–10 scale). */
  benchmarkAverageLine?: number | null;
  primaryLabel?: string;
  benchmarkLabel?: string;
  primaryAverage?: number | null;
  benchmarkAverage?: number | null;
  title?: string;
  compact?: boolean;
  showBinControls?: boolean;
  headerExtra?: React.ReactNode;
  binWidthOptions?: BinWidth[];
  chartHeight?: number;
  defaultBinWidth?: BinWidth;
}

export function DualSeriesHistogram({
  primaryRatings = [],
  benchmarkRatings = [],
  benchmarkBins: benchmarkBinsProp,
  benchmarkFromCommunity = false,
  communityScope,
  benchmarkMode = "bars",
  benchmarkAverageLine = null,
  primaryLabel = "Your avg",
  benchmarkLabel = "Benchmark avg",
  primaryAverage: primaryAverageProp,
  benchmarkAverage: benchmarkAverageProp,
  title = "Rating distribution",
  compact = false,
  showBinControls = !compact,
  headerExtra,
  binWidthOptions,
  chartHeight: chartHeightProp,
  defaultBinWidth,
}: DualSeriesHistogramProps) {
  const resolvedWidthOptions = useMemo((): { value: BinWidth; label: string }[] => {
    if (binWidthOptions?.length) {
      return binWidthOptions.map((value) => ({
        value,
        label: value === 0.5 ? "0.50" : String(value),
      }));
    }
    return DEFAULT_BIN_WIDTH_OPTIONS;
  }, [binWidthOptions]);

  const initialBinWidth =
    defaultBinWidth && resolvedWidthOptions.some((o) => o.value === defaultBinWidth)
      ? defaultBinWidth
      : resolvedWidthOptions[0]?.value ?? 1;

  const [binWidth, setBinWidth] = useState<BinWidth>(initialBinWidth);
  const [hoveredBin, setHoveredBin] = useState<HistogramBin | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const usesCommunityFetch = benchmarkFromCommunity;
  const community = useCommunityBenchmark(
    usesCommunityFetch ? binWidth : 1,
    usesCommunityFetch ? communityScope : undefined
  );

  const safePrimaryRatings = Array.isArray(primaryRatings) ? primaryRatings : [];
  const safeBenchmarkRatings = Array.isArray(benchmarkRatings) ? benchmarkRatings : [];

  const primaryBins = useMemo(
    () => buildHistogramBins(safePrimaryRatings, binWidth),
    [safePrimaryRatings, binWidth]
  );

  const rawBenchmarkBins = useMemo(() => {
    if (benchmarkMode === "average-line") return [];
    if (Array.isArray(benchmarkBinsProp) && benchmarkBinsProp.length > 0) {
      return benchmarkBinsProp;
    }
    if (benchmarkFromCommunity) {
      return community.bins;
    }
    if (safeBenchmarkRatings.length === 0) return [];
    return buildHistogramBins(safeBenchmarkRatings, binWidth);
  }, [
    benchmarkMode,
    benchmarkBinsProp,
    benchmarkFromCommunity,
    community.bins,
    safeBenchmarkRatings,
    binWidth,
  ]);

  const benchmarkBins = useMemo(() => {
    if (benchmarkMode === "average-line" || !rawBenchmarkBins.length || !primaryBins.length) {
      return [];
    }
    return alignBenchmarkBins(primaryBins, rawBenchmarkBins);
  }, [benchmarkMode, rawBenchmarkBins, primaryBins]);

  const benchmarkMaxCount = useMemo(
    () => safeBinMaxCount(benchmarkBins),
    [benchmarkBins]
  );

  const primaryAverage =
    primaryAverageProp ?? computeScopeAverage(safePrimaryRatings);

  const benchmarkAverage =
    benchmarkMode === "average-line"
      ? (benchmarkAverageLine ?? benchmarkAverageProp ?? null)
      : benchmarkFromCommunity
        ? (community.average ?? benchmarkAverageProp ?? null)
        : (benchmarkAverageProp ??
          (safeBenchmarkRatings.length > 0
            ? computeScopeAverage(safeBenchmarkRatings)
            : null));

  const averageLinePercent = useMemo(() => {
    if (benchmarkMode !== "average-line") return null;
    return averageToChartPercent(benchmarkAverageLine ?? benchmarkAverage, primaryBins);
  }, [benchmarkMode, benchmarkAverageLine, benchmarkAverage, primaryBins]);

  const chartHeight = chartHeightProp ?? (compact ? 72 : isNarrow ? 150 : 220);
  const maxCount = safeBinMaxCount(primaryBins);
  const hasPrimaryData =
    primaryBins.length > 0 && primaryBins.some((b) => (b.count ?? 0) > 0);

  const communityLoading = usesCommunityFetch && community.loading;

  return (
    <div className={`glass-card min-w-0 ${compact ? "p-4" : "p-4 sm:p-6"}`}>
      <div
        className={`mb-3 flex flex-col gap-3 ${compact ? "" : "sm:flex-row sm:items-end sm:justify-between"}`}
      >
        <div className="min-w-0 flex-1">
          <h3
            className={`font-semibold uppercase tracking-widest text-zinc-400 ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {title}
          </h3>
          {headerExtra}
          <div
            className={`mt-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1 ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            <span className="text-zinc-500">
              {primaryLabel}:{" "}
              <span className="font-semibold tabular-nums text-white">
                {formatAverageLabel(primaryAverage)}
              </span>
            </span>
            {(benchmarkAverage !== null ||
              benchmarkBins.length > 0 ||
              benchmarkMode === "average-line" ||
              benchmarkFromCommunity) && (
              <span className="text-zinc-500">
                {benchmarkLabel}:{" "}
                <span className="font-semibold tabular-nums text-zinc-400">
                  {communityLoading && benchmarkFromCommunity
                    ? "…"
                    : benchmarkAverage !== null
                      ? formatRating(benchmarkAverage)
                      : "—"}
                </span>
              </span>
            )}
          </div>
        </div>

        {showBinControls && (
          <div className="w-full sm:w-auto">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500">
              Bar size
            </p>
            <div className="flex w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 sm:inline-flex sm:w-auto">
              {resolvedWidthOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBinWidth(option.value)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold tabular-nums transition sm:flex-none sm:px-3 sm:py-1.5 ${
                    binWidth === option.value
                      ? "bg-accent text-on-accent"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!hasPrimaryData ? (
        <p className={`text-center text-zinc-500 ${compact ? "text-xs py-4" : "py-16 text-sm"}`}>
          No ratings in this scope yet.
        </p>
      ) : (
        <>
          {benchmarkBins.length > 0 && (
            <div className="mb-3 flex min-h-[1.25rem] flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              {hoveredBin ? (
                <span>
                  <span className="font-medium text-white">{hoveredBin.label}</span>
                  {" · "}
                  {hoveredBin.count} rated
                </span>
              ) : (
                <span className="hidden sm:inline">Hover a bar for details</span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-zinc-600/35" />
                {benchmarkLabel}
              </span>
            </div>
          )}

          {!compact && benchmarkMode === "average-line" && averageLinePercent !== null && (
            <div className="mb-3 flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="inline-block h-3 w-0.5 rounded-full bg-amber-400/90" />
              {benchmarkLabel} marker
            </div>
          )}

          <div
            className="relative flex w-full max-w-full touch-pan-x items-end gap-0.5 overflow-x-auto pb-2 sm:gap-1"
            style={{ minHeight: chartHeight + (compact ? 8 : 24), WebkitOverflowScrolling: "touch" }}
          >
            {communityLoading && benchmarkFromCommunity && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/40 text-xs text-zinc-400">
                Loading community…
              </div>
            )}

            {benchmarkMode === "average-line" && averageLinePercent !== null && (
              <div
                className="pointer-events-none absolute bottom-0 z-20 w-0.5 rounded-full bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                style={{
                  left: `calc(${averageLinePercent}% - 1px)`,
                  height: chartHeight,
                }}
                title={`${benchmarkLabel}: ${benchmarkAverage !== null ? formatRating(benchmarkAverage) : "—"}`}
              />
            )}

            {primaryBins.map((bin) => {
              const benchmarkBar =
                benchmarkBins.find((b) => b.min === bin.min && b.max === bin.max) ?? null;
              const userHeight =
                bin.count === 0 ? (compact ? 2 : 4) : (bin.count / maxCount) * chartHeight;
              const benchmarkHeight =
                benchmarkBar && benchmarkBar.count > 0
                  ? (benchmarkBar.count / benchmarkMaxCount) * chartHeight
                  : 0;
              const isHovered = hoveredBin?.label === bin.label;

              return (
                <div
                  key={`${bin.min}-${bin.max}`}
                  className={`relative flex flex-col items-center justify-end ${
                    compact && chartHeight <= 100 ? "min-w-0 flex-1" : "min-w-[14px] flex-1 sm:min-w-[18px]"
                  }`}
                  onMouseEnter={() => setHoveredBin(bin)}
                  onMouseLeave={() => setHoveredBin(null)}
                >
                  <div
                    className="relative flex w-full items-end justify-center"
                    style={{ height: chartHeight }}
                  >
                    {benchmarkHeight > 0 && (
                      <div
                        className="absolute bottom-0 w-[85%] rounded-t-lg bg-zinc-600/35"
                        style={{ height: benchmarkHeight }}
                      />
                    )}
                    <div
                      className={`relative z-10 w-full rounded-t-lg transition-all duration-300 ${
                        bin.count === 0
                          ? "bg-zinc-800/80"
                          : isHovered
                            ? "bg-accent-hover"
                            : "bg-accent"
                      }`}
                      style={{
                        height: userHeight,
                        opacity: bin.count ? 1 : 0.2,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {compact && (
            <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
