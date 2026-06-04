import { redirect } from "next/navigation";
import { CanonicalHostRedirect } from "@/components/CanonicalHostRedirect";
import { LoginView } from "@/components/LoginView";
import { getAppUrl } from "@/lib/env";
import { safeShouldRedirectFromLogin } from "@/lib/safe-server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await safeShouldRedirectFromLogin()) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const spotifyAuthUrl = `${getAppUrl()}/api/auth/spotify`;

  return (
    <>
      <CanonicalHostRedirect />
      <LoginView errorCode={params.error ?? null} spotifyAuthUrl={spotifyAuthUrl} />
    </>
  );
}
