import { redirect } from "next/navigation";
import { CanonicalHostRedirect } from "@/components/CanonicalHostRedirect";
import { LoginView } from "@/components/LoginView";
import { describeMissingDeployConfig, resolvePublicOriginFromHeaders } from "@/lib/env";
import { safeShouldRedirectFromLogin } from "@/lib/safe-server";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  if (!params.error && (await safeShouldRedirectFromLogin())) {
    redirect("/dashboard");
  }
  const appUrl = await resolvePublicOriginFromHeaders();
  const configError = describeMissingDeployConfig();
  const spotifyAuthUrl = appUrl && !configError ? `${appUrl}/api/auth/spotify` : null;
  return (
    <>
      <CanonicalHostRedirect />
      <LoginView
        errorCode={params.error ?? null}
        spotifyAuthUrl={spotifyAuthUrl}
        configError={configError}
      />
    </>
  );
}
