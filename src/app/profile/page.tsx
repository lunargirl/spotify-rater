import { redirect } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { safeCanAccessProtectedRoute } from "@/lib/safe-server";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  if (!(await safeCanAccessProtectedRoute())) {
    redirect("/login");
  }

  return <ProfileView />;
}
