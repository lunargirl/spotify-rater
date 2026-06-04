import { redirect } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { getValidAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    redirect("/api/auth/logout?redirect=/login");
  }

  return <Dashboard />;
}
