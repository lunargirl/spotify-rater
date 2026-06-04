"use client";

import { useEffect, useState } from "react";
import type { BinWidth } from "@/lib/analytics";
import type { HistogramBin } from "@/types";

export interface CommunityBenchmarkScope {
  albumId?: string;
  artistId?: string;
}

export interface CommunityBenchmarkState {
  average: number | null;
  totalRatings: number;
  bins: HistogramBin[];
  loading: boolean;
}

function buildCommunityUrl(binWidth: BinWidth, scope?: CommunityBenchmarkScope): string {
  const params = new URLSearchParams({ binWidth: String(binWidth) });
  if (scope?.albumId) params.set("albumId", scope.albumId);
  if (scope?.artistId) params.set("artistId", scope.artistId);
  return `/api/analytics/community?${params.toString()}`;
}

export function useCommunityBenchmark(
  binWidth: BinWidth,
  scope?: CommunityBenchmarkScope
): CommunityBenchmarkState {
  const [state, setState] = useState<CommunityBenchmarkState>({
    average: null,
    totalRatings: 0,
    bins: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true }));

    fetch(buildCommunityUrl(binWidth, scope))
      .then(async (res) => {
        const data = (await res.json()) as {
          average?: number | null;
          totalRatings?: number;
          bins?: HistogramBin[];
        };
        if (!res.ok && !data.bins) {
          throw new Error("Failed to load community benchmark");
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setState({
          average: data.average ?? null,
          totalRatings: data.totalRatings ?? 0,
          bins: Array.isArray(data.bins) ? data.bins : [],
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          average: null,
          totalRatings: 0,
          bins: [],
          loading: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [binWidth, scope?.albumId, scope?.artistId]);

  return state;
}
