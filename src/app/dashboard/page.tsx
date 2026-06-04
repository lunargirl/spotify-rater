import { redirect } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { safeCanAccessProtectedRoute } from "@/lib/safe-server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await safeCanAccessProtectedRoute())) {
    redirect("/login");
  }

  return <Dashboard />;
}
