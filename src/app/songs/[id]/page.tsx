import { redirect } from "next/navigation";
import { SongDetailView } from "@/components/SongDetailView";
import { safeCanAccessProtectedRoute } from "@/lib/safe-server";

export const dynamic = "force-dynamic";

export default async function SongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await safeCanAccessProtectedRoute())) {
    redirect("/login");
  }

  const { id } = await params;
  return <SongDetailView trackId={id} />;
}
