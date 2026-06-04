import { primaryArtistNameFromString } from "@/lib/artist-utils";
import type {
  HistogramBin,
  ProfileAnalytics,
  RatingDistributionBucket,
  SongRating,
} from "@/types";

export type BinWidth = 0.25 | 0.5 | 1 | 2;

export interface AnalyticsFilters {
  artistQuery: string;
  selectedArtists: string[];
  ratingMin: number;
  ratingMax: number;
  selectedDecades: string[];
  selectedYears: number[];
}

const EMPTY_FILTER_OPTIONS = {
  artists: [] as string[],
  decades: [] as string[],
  years: [] as number[],
};

export interface FilteredAnalyticsResult {
  filtered: SongRating[];
  analytics: ProfileAnalytics;
  histogram: HistogramBin[];
}

export function emptyFilteredAnalytics(binWidth: BinWidth = 1): FilteredAnalyticsResult {
  return {
    filtered: [],
    analytics: buildProfileAnalytics([]),
    histogram: buildHistogramBins([], binWidth),
  };
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  artistQuery: "",
  selectedArtists: [],
  ratingMin: 0,
  ratingMax: 10,
  selectedDecades: [],
  selectedYears: [],
};

function cleanGenreToken(token: string): string {
  return token.replace(/^["']|["']$/g, "").trim();
}

/** Parse PostgreSQL text[] literal, e.g. `{pop,rock}` or `{"hip hop",jazz}`. */
function parsePostgresArrayLiteral(value: string): string[] {
  const inner = value.slice(1, -1).trim();
  if (!inner) return [];

  const items: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      const item = cleanGenreToken(current);
      if (item) items.push(item);
      current = "";
      continue;
    }
    current += ch;
  }

  const last = cleanGenreToken(current);
  if (last) items.push(last);
  return items;
}

/** Normalize genres from DB (array, null, PostgreSQL literal, or legacy string). */
export function normalizeGenresField(genres: unknown): string[] {
  if (genres == null) return [];

  if (Array.isArray(genres)) {
    return genres.flatMap((entry) => normalizeGenresField(entry));
  }

  if (typeof genres === "string") {
    const trimmed = genres.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return parsePostgresArrayLiteral(trimmed);
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed) || typeof parsed === "string") {
        return normalizeGenresField(parsed);
      }
    } catch {
      /* not JSON */
    }

    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((g) => cleanGenreToken(g))
        .filter(Boolean);
    }

    return [cleanGenreToken(trimmed)];
  }

  return [];
}

/** Normalize a rating row for analytics and filters. */
export function normalizeSongRating(rating: SongRating): SongRating {
  return {
    ...rating,
    artist_name: primaryArtistNameFromString(rating.artist_name),
    genres: normalizeGenresField(rating.genres),
    release_date: rating.release_date ?? null,
    spotify_album_id: rating.spotify_album_id ?? null,
    spotify_artist_ids: rating.spotify_artist_ids ?? [],
  };
}

const DISTRIBUTION_RANGES: Omit<RatingDistributionBucket, "count">[] = [
  { label: "9–10", min: 9, max: 10 },
  { label: "7–8", min: 7, max: 8.99 },
  { label: "5–6", min: 5, max: 6.99 },
  { label: "3–4", min: 3, max: 4.99 },
  { label: "0–2", min: 0, max: 2.99 },
];

export function parseReleaseYear(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null;
  const year = parseInt(releaseDate.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

export function getDecadeLabel(year: number): string {
  const decadeStart = Math.floor(year / 10) * 10;
  return `${decadeStart}s`;
}

/** Canonical lowercase genre key for filtering. */
export function canonicalGenre(genre: string): string {
  return genre.trim().toLowerCase();
}

/** True if the song has any of the selected genres (case-insensitive). */
export function songMatchesGenres(songGenres: string[], selectedGenres: string[]): boolean {
  if (selectedGenres.length === 0) return true;
  const songSet = new Set(normalizeGenresField(songGenres).map(canonicalGenre));
  return selectedGenres.some((genre) => songSet.has(canonicalGenre(genre)));
}

/** Unique genres across all ratings (normalized, lowercase keys). */
export function extractUniqueGenres(ratings: SongRating[]): string[] {
  if (!ratings?.length) {
    return [];
  }

  const genres = new Set<string>();
  for (const rating of ratings) {
    for (const genre of normalizeGenresField(rating.genres)) {
      genres.add(canonicalGenre(genre));
    }
  }
  return [...genres].sort((a, b) => a.localeCompare(b));
}

export function extractFilterOptions(ratings: SongRating[]) {
  if (!ratings?.length) {
    return { ...EMPTY_FILTER_OPTIONS };
  }

  const artists = new Set<string>();
  const decades = new Set<string>();
  const years = new Set<number>();

  for (const rating of ratings) {
    const primaryArtist = primaryArtistNameFromString(rating.artist_name);
    if (primaryArtist) artists.add(primaryArtist);

    const year = parseReleaseYear(rating.release_date);
    if (year !== null) {
      years.add(year);
      decades.add(getDecadeLabel(year));
    }
  }

  return {
    artists: [...artists].sort((a, b) => a.localeCompare(b)),
    decades: [...decades].sort((a, b) => b.localeCompare(a)),
    years: [...years].sort((a, b) => b - a),
  };
}

export function filterRatings(
  ratings: SongRating[],
  filters: AnalyticsFilters
): SongRating[] {
  if (!ratings?.length) {
    return [];
  }

  const artistQuery = filters.artistQuery.trim().toLowerCase();

  return ratings.filter((rating) => {
    const score = Number(rating.rating);
    if (score < filters.ratingMin || score > filters.ratingMax) return false;

    const artistName = primaryArtistNameFromString(rating.artist_name) ?? "";
    if (filters.selectedArtists.length > 0) {
      if (!filters.selectedArtists.includes(artistName)) return false;
    } else if (artistQuery && !artistName.toLowerCase().includes(artistQuery)) {
      return false;
    }

    const year = parseReleaseYear(rating.release_date);
    if (filters.selectedYears.length > 0) {
      if (year === null || !filters.selectedYears.includes(year)) return false;
    }

    if (filters.selectedDecades.length > 0) {
      if (year === null || !filters.selectedDecades.includes(getDecadeLabel(year))) {
        return false;
      }
    }

    return true;
  });
}

export function buildHistogramBins(ratings: SongRating[], binWidth: BinWidth): HistogramBin[] {
  const safeRatings = Array.isArray(ratings) ? ratings : [];
  const binCount = Math.ceil(10 / binWidth);
  const bins: HistogramBin[] = [];

  for (let index = 0; index < binCount; index += 1) {
    const min = Number((index * binWidth).toFixed(2));
    const max =
      index === binCount - 1 ? 10 : Number((min + binWidth).toFixed(2));
    const label =
      index === binCount - 1
        ? `${min.toFixed(2)}–${max.toFixed(2)}`
        : `${min.toFixed(2)}–${max.toFixed(2)}`;

    bins.push({ label, min, max, count: 0 });
  }

  for (const rating of safeRatings) {
    const score = Number(rating?.rating);
    if (Number.isNaN(score)) continue;
    let index =
      score >= 10
        ? binCount - 1
        : Math.min(Math.floor(score / binWidth), binCount - 1);
    if (index < 0) index = 0;
    if (bins[index]) {
      bins[index].count += 1;
    }
  }

  return bins;
}

export function buildProfileAnalytics(ratings: SongRating[]): ProfileAnalytics {
  const safeRatings = Array.isArray(ratings) ? ratings : [];
  const totalRated = safeRatings.length;

  if (totalRated === 0) {
    return {
      totalRated: 0,
      grandAverage: null,
      distribution: DISTRIBUTION_RANGES.map((range) => ({ ...range, count: 0 })),
      topRated: [],
    };
  }

  const grandAverage =
    Math.round(
      (safeRatings.reduce((sum, rating) => sum + Number(rating.rating), 0) / totalRated) *
        100
    ) / 100;

  const distribution = DISTRIBUTION_RANGES.map((range) => ({
    ...range,
    count: safeRatings.filter(
      (rating) => Number(rating.rating) >= range.min && Number(rating.rating) <= range.max
    ).length,
  }));

  const topRated = [...safeRatings]
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, 5);

  return { totalRated, grandAverage, distribution, topRated };
}

export function buildFilteredAnalytics(
  ratings: SongRating[],
  filters: AnalyticsFilters,
  binWidth: BinWidth
): FilteredAnalyticsResult {
  if (!ratings?.length) {
    return emptyFilteredAnalytics(binWidth);
  }

  const filtered = filterRatings(ratings, filters);
  const analytics = buildProfileAnalytics(filtered);
  const histogram = buildHistogramBins(filtered, binWidth);

  return { filtered, analytics, histogram };
}
