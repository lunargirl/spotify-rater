import { createSupabaseAdmin } from "@/lib/supabase";
import type { SpotifyUser, UserProfile } from "@/types";

const AVATAR_BUCKET = "avatars";

export async function getOrCreateProfile(user: SpotifyUser): Promise<UserProfile> {
  const supabase = createSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing as UserProfile;

  const { data: created, error: createError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      display_name: user.display_name ?? user.id,
      profile_picture_url: user.images?.[0]?.url ?? null,
    })
    .select()
    .single();

  if (createError) throw createError;
  return created as UserProfile;
}

export async function updateProfileDisplayName(
  userId: string,
  displayName: string
): Promise<UserProfile> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function uploadProfileAvatar(
  userId: string,
  file: File
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filePath = `${userId}/${Date.now()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

export async function setProfilePictureUrl(
  userId: string,
  profilePictureUrl: string
): Promise<UserProfile> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("profiles")
    .update({ profile_picture_url: profilePictureUrl })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}
