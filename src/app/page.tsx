import { redirect } from "next/navigation";
import { CanonicalHostRedirect } from "@/components/CanonicalHostRedirect";
import { LoginView } from "@/components/LoginView";
import {
  describeMissingDeployConfig,
  getSpotifyClientIdForDisplay,
  resolvePublicOriginFromHeaders,
} from "@/lib/env";
import { safeShouldRedirectFromLogin } from "@/lib/safe-server";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await safeShouldRedirectFromLogin()) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const appUrl = await resolvePublicOriginFromHeaders();
  const configError = describeMissingDeployConfig();
  const spotifyAuthUrl = appUrl && !configError ? `${appUrl}/api/auth/spotify` : null;
  const spotifyRedirectUri = appUrl ? `${appUrl}/api/auth/callback` : null;

  return (
    <>
      <CanonicalHostRedirect />
      <LoginView
        errorCode={params.error ?? null}
        spotifyAuthUrl={spotifyAuthUrl}
        configError={configError}
        spotifyRedirectUri={spotifyRedirectUri}
        spotifyClientIdHint={getSpotifyClientIdForDisplay()}
      />
    </>
  );
}
