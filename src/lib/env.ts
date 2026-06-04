const PLACEHOLDER_MARKERS = ["your_", "your-project"];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local.`
    );
  }

  if (PLACEHOLDER_MARKERS.some((marker) => value.includes(marker))) {
    throw new Error(
      `${name} is still set to a placeholder value in .env.local. Replace it with your real credentials.`
    );
  }

  return value;
}

export function getSpotifyRedirectUri(): string {
  const redirectUri = requireEnv("SPOTIFY_REDIRECT_URI");

  if (redirectUri.includes("localhost")) {
    throw new Error(
      "SPOTIFY_REDIRECT_URI must not use localhost. Use http://127.0.0.1:3000/api/auth/callback instead."
    );
  }

  return redirectUri;
}

export function getSpotifyConfig() {
  return {
    clientId: requireEnv("SPOTIFY_CLIENT_ID"),
    clientSecret: requireEnv("SPOTIFY_CLIENT_SECRET"),
    redirectUri: getSpotifyRedirectUri(),
  };
}

export function getAppUrl(): string {
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");

  if (appUrl.includes("localhost")) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must not use localhost. Use http://127.0.0.1:3000 instead."
    );
  }

  return appUrl.replace(/\/$/, "");
}

/** Non-throwing app URL for Server Components (misconfigured Vercel env shows login hint). */
export function tryGetAppUrl(): string | null {
  try {
    return getAppUrl();
  } catch (error) {
    console.error("[tryGetAppUrl]", error);
    return null;
  }
}

export function getSupabaseConfig() {
  const rawUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const url = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

  return {
    url,
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
