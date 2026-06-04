import { redirect } from "next/navigation";
import { SongDetailView } from "@/components/SongDetailView";
import { getValidAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export default async function SongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getValidAccessToken())) {
    redirect("/api/auth/logout?redirect=/login");
  }

  const { id } = await params;
  return <SongDetailView trackId={id} />;
}
