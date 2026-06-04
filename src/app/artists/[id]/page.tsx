import { redirect } from "next/navigation";
import { ArtistDetailView } from "@/components/ArtistDetailView";
import { safeCanAccessProtectedRoute } from "@/lib/safe-server";

export const dynamic = "force-dynamic";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await safeCanAccessProtectedRoute())) {
    redirect("/login");
  }

  const { id } = await params;
  return <ArtistDetailView artistId={id} />;
}
