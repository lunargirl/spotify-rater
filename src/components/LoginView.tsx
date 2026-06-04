interface LoginViewProps {
  errorCode?: string | null;
  configError?: string | null;
  /** Absolute URL so OAuth always starts on the same host as SPOTIFY_REDIRECT_URI. */
  spotifyAuthUrl: string | null;
  /** Shown so you can paste the exact URI into the Spotify Developer Dashboard. */
  spotifyRedirectUri?: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You denied access to Spotify.",
  invalid_state: "Authentication failed. Please try again.",
  auth_failed: "Could not complete Spotify login.",
};

export function LoginView({
  errorCode,
  configError,
  spotifyAuthUrl,
  spotifyRedirectUri,
}: LoginViewProps) {
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] ?? "Something went wrong."
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent shadow-lg">
          <svg className="h-10 w-10 text-on-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-white">Spotify Rater</h1>
        <p className="mt-3 text-zinc-400">
          Log in with Spotify to track what you&apos;re listening to and rate every song
          from <span className="font-mono text-zinc-300">0.00</span> to{" "}
          <span className="font-mono text-zinc-300">10.00</span>.
        </p>

        {(errorMessage || configError) && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {configError ?? errorMessage}
          </div>
        )}

        {spotifyAuthUrl ? (
          <a
            href={spotifyAuthUrl}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-accent px-6 py-4 text-base font-semibold text-on-accent transition hover:bg-accent-hover"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.66.54-.78 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Log in with Spotify
          </a>
        ) : (
          <p className="mt-8 text-sm text-zinc-500">
            Login is unavailable until environment variables are configured on the host.
          </p>
        )}

        {spotifyRedirectUri && (
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left text-xs text-zinc-500">
            <p className="font-medium text-zinc-400">Spotify Developer Dashboard setup</p>
            <p className="mt-2">
              Add this <span className="text-zinc-400">Redirect URI</span> (exact match, or Spotify
              returns 400):
            </p>
            <p className="mt-2 break-all font-mono text-[11px] text-zinc-300">
              {spotifyRedirectUri}
            </p>
            <p className="mt-2">
              In <span className="text-zinc-400">Development mode</span>, add your Spotify account
              under Users and Access.
            </p>
          </div>
        )}

        <ul className="mt-10 space-y-3 text-left text-sm text-zinc-500">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent">✓</span>
            Live now-playing tracker with progress bar
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent">✓</span>
            Search any track in Spotify&apos;s catalog
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-accent">✓</span>
            Precise 0.00–10.00 slider with comments
          </li>
        </ul>
      </div>
    </div>
  );
}
