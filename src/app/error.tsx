"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-3 text-sm text-zinc-500">
          The page failed to load. This is often fixed by refreshing or restarting the dev server
          after a cache wipe.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-on-accent hover:bg-accent-hover"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
