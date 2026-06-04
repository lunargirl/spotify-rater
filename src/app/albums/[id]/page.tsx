import { redirect } from "next/navigation";
import { AlbumDetailView } from "@/components/AlbumDetailView";
import { safeCanAccessProtectedRoute } from "@/lib/safe-server";

export const dynamic = "force-dynamic";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await safeCanAccessProtectedRoute())) {
    redirect("/login");
  }

  const { id } = await params;
  return <AlbumDetailView albumId={id} />;
}
