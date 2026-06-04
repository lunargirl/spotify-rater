import { redirect } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { getValidAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    redirect("/api/auth/logout?redirect=/login");
  }

  return <ProfileView />;
}
