import { redirect } from "next/navigation";
import { CanonicalHostRedirect } from "@/components/CanonicalHostRedirect";
import { LoginView } from "@/components/LoginView";
import { tryGetAppUrl } from "@/lib/env";
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
  const appUrl = tryGetAppUrl();
  const spotifyAuthUrl = appUrl ? `${appUrl}/api/auth/spotify` : null;

  return (
    <>
      <CanonicalHostRedirect />
      <LoginView
        errorCode={params.error ?? null}
        spotifyAuthUrl={spotifyAuthUrl}
        configError={appUrl ? null : "Server is missing NEXT_PUBLIC_APP_URL (and related env vars)."}
      />
    </>
  );
}
