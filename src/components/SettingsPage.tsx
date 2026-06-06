"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { APP_THEMES } from "@/lib/themes";
import type { UserProfile } from "@/types";
import { AppHeader } from "./AppHeader";

interface SettingsPageProps {
  initialProfile: UserProfile;
}

export function SettingsPage({ initialProfile }: SettingsPageProps) {
  const { themeId, setThemeId } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile.display_name);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  
  // Client mounting checkpoint to eliminate hydration mismatch logs
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSaveName() {
    setSavingName(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update name");
      setProfile(data.profile);
      setMessage({ type: "success", text: "Display name updated." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update name",
      });
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to upload avatar");
      setProfile(data.profile);
      setMessage({ type: "success", text: "Profile picture updated." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to upload avatar",
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <AppHeader userLabel="Settings" />

      <main className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
        <section className="glass-card p-6">
          <h2 className="text-lg font-bold text-white">Profile</h2>
          <p className="mt-1 text-sm text-zinc-500">Avatar and display name</p>

          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {profile.profile_picture_url ? (
              <Image
                src={profile.profile_picture_url}
                alt="Profile picture"
                width={96}
                height={96}
                unoptimized
                priority // Preloads this asset instantly to address the LCP notice
                className="h-24 w-24 rounded-2xl object-cover ring-2 ring-zinc-700"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-zinc-800 text-2xl font-bold text-zinc-500">
                {profile.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="hidden"
                id="settings-avatar"
              />
              <label
                htmlFor="settings-avatar"
                className="inline-flex cursor-pointer rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white"
              >
                {uploadingAvatar ? "Uploading..." : "Change photo"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-white focus-accent"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="rounded-xl bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-lg font-bold text-white">Theme</h2>
          <p className="mt-1 text-sm text-zinc-500">Primary accent color sitewide</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {APP_THEMES.map((theme) => {
              // Ensure highlight tokens are skipped during server output 
              // until client local storage preferences take over safely.
              const isActive = mounted && themeId === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setThemeId(theme.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    isActive
                      ? "border-accent ring-1 ring-accent"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <span
                    className="mb-2 block h-8 w-full rounded-lg"
                    style={{ backgroundColor: theme.accent }}
                  />
                  <span className="text-xs font-medium text-white">{theme.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-accent" : "text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}
      </main>
    </div>
  );
}