import { NextRequest, NextResponse } from "next/server";
import { requireSpotifyUser } from "@/lib/auth-api";
import { getOrCreateProfile, setProfilePictureUrl, uploadProfileAvatar } from "@/lib/profile";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  const user = await requireSpotifyUser({ allowSessionWrites: true });

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "avatar file is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
    }

    await getOrCreateProfile(user);
    const profilePictureUrl = await uploadProfileAvatar(user.id, file);
    const profile = await setProfilePictureUrl(user.id, profilePictureUrl);

    return NextResponse.json({ profile, profile_picture_url: profilePictureUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
