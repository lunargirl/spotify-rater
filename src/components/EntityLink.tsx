import Link from "next/link";

const LINK_CLASS =
  "block max-w-full truncate text-zinc-100 transition hover:text-white hover:underline";

interface ArtistLinkProps {
  artistId?: string | null;
  artistName: string;
  className?: string;
}

interface AlbumLinkProps {
  albumId?: string | null;
  albumName: string;
  className?: string;
}

export function ArtistLink({ artistId, artistName, className = "" }: ArtistLinkProps) {
  if (!artistId) {
    return <span className={className || "text-zinc-100"}>{artistName}</span>;
  }

  return (
    <Link href={`/artists/${artistId}`} className={`${LINK_CLASS} ${className}`}>
      {artistName}
    </Link>
  );
}

interface SongLinkProps {
  trackId?: string | null;
  trackName: string;
  className?: string;
}

export function SongLink({ trackId, trackName, className = "" }: SongLinkProps) {
  if (!trackId) {
    return <span className={className || "text-zinc-100"}>{trackName}</span>;
  }

  return (
    <Link href={`/songs/${trackId}`} className={`${LINK_CLASS} ${className}`}>
      {trackName}
    </Link>
  );
}

export function AlbumLink({ albumId, albumName, className = "" }: AlbumLinkProps) {
  if (!albumId) {
    return <span className={className || "text-zinc-100"}>{albumName}</span>;
  }

  return (
    <Link href={`/albums/${albumId}`} className={`${LINK_CLASS} ${className}`}>
      {albumName}
    </Link>
  );
}
