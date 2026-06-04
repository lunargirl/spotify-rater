import { redirect } from "next/navigation";
import { getOrCreateProfile } from "@/lib/profile";
import { requireSpotifyUser } from "@/lib/auth-api";
import { safeCanAccessProtectedRoute } from "@/lib/safe-server";
import { SettingsPage } from "@/components/SettingsPage";
import type { UserProfile } from "@/types";

const FALLBACK_PROFILE: UserProfile = {
  user_id: "",
  display_name: "User",
  profile_picture_url: null,
  created_at: "",
  updated_at: "",
};

export default async function SettingsRoute() {
  if (!(await safeCanAccessProtectedRoute())) {
    redirect("/login");
  }

  const user = await requireSpotifyUser();
  if (!user) {
    redirect("/login");
  }

  let profile = FALLBACK_PROFILE;
  try {
    profile = await getOrCreateProfile(user);
  } catch (error) {
    console.error("[Settings] profile load failed:", error);
  }

  return <SettingsPage initialProfile={profile} />;
}
