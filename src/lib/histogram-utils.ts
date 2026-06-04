import type { HistogramBin } from "@/types";

export function safeBinMaxCount(bins: HistogramBin[] | undefined | null): number {
  if (!bins?.length) return 1;
  return Math.max(1, ...bins.map((b) => b.count ?? 0));
}

/** Map a 0–10 average to horizontal chart position (percent) for overlay lines. */
export function averageToChartPercent(
  average: number | null | undefined,
  bins: HistogramBin[]
): number | null {
  if (average == null || !bins.length) return null;

  const clamped = Math.min(10, Math.max(0, average));
  let index = bins.findIndex((b) => clamped >= b.min && clamped <= b.max);
  if (index < 0) {
    index = clamped >= 10 ? bins.length - 1 : 0;
  }

  const bin = bins[index];
  const span = bin.max - bin.min || 1;
  const within = (clamped - bin.min) / span;
  return ((index + within) / bins.length) * 100;
}

function binRangeKey(bin: HistogramBin): string {
  return `${bin.min}:${bin.max}`;
}

/** Align benchmark bins to primary ranges (same dynamic band width). */
export function alignBenchmarkBins(
  primaryBins: HistogramBin[],
  benchmarkBins: HistogramBin[] | undefined | null
): HistogramBin[] {
  if (!primaryBins.length || !benchmarkBins?.length) return [];

  const byRange = new Map(benchmarkBins.map((bin) => [binRangeKey(bin), bin]));

  return primaryBins.map((bin) => {
    const match = byRange.get(binRangeKey(bin));
    return match ?? { ...bin, count: 0 };
  });
}
