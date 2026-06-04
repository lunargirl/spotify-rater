"use client";

import { useState } from "react";
import { deleteRating } from "@/lib/ratings-client";

interface DeleteRatingButtonProps {
  trackId: string;
  onDeleted?: () => void;
  variant?: "icon" | "text";
  className?: string;
}

export function DeleteRatingButton({
  trackId,
  onDeleted,
  variant = "icon",
  className = "",
}: DeleteRatingButtonProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    if (!window.confirm("Remove this rating permanently?")) return;

    setDeleting(true);
    try {
      await deleteRating(trackId);
      onDeleted?.();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete rating");
    } finally {
      setDeleting(false);
    }
  }

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className={`rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50 ${className}`}
      >
        {deleting ? "Removing…" : "Delete rating"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      title="Remove rating"
      aria-label="Remove rating"
      className={`rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 ${className}`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  );
}
