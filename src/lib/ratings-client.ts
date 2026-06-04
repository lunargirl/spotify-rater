/** DELETE /api/ratings/[trackId] */
export async function deleteRating(trackId: string): Promise<void> {
  const res = await fetch(`/api/ratings/${trackId}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Failed to delete rating"
    );
  }
}
