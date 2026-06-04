export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id?: string; name: string }[];
  album: {
    id?: string;
    name: string;
    images: { url: string; width: number; height: number }[];
    release_date?: string;
  };
  duration_ms: number;
  external_urls: { spotify: string };
  track_number?: number;
}

export interface NowPlaying {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  progress_ms: number;
  device?: string;
}

export interface SongRating {
  id: string;
  user_id: string;
  spotify_track_id: string;
  rating: number;
  comments: string | null;
  track_name: string | null;
  artist_name: string | null;
  album_art_url: string | null;
  genres: string[];
  release_date: string | null;
  spotify_album_id: string | null;
  spotify_artist_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images?: { url: string }[];
}

export interface RatingPayload {
  spotify_track_id: string;
  rating: number;
  comments?: string;
  track_name?: string;
  artist_name?: string;
  album_art_url?: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingDistributionBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface ProfileAnalytics {
  totalRated: number;
  grandAverage: number | null;
  distribution: RatingDistributionBucket[];
  topRated: SongRating[];
}

export interface HistogramBin {
  label: string;
  min: number;
  max: number;
  count: number;
}
