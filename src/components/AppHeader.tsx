"use client";

import { usePathname, useRouter } from "next/navigation";
import { HeaderSearch } from "@/components/HeaderSearch";

interface AppHeaderProps {
  userLabel?: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Live Rater" },
  { href: "/profile", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader({ userLabel }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const showSearch = pathname !== "/login" && pathname !== "/";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <header className="relative z-[200] isolate border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <a href="/dashboard" className="flex shrink-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <svg className="h-5 w-5 text-on-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Spotify Rater</h1>
              {userLabel && <p className="text-xs text-zinc-500">{userLabel}</p>}
            </div>
          </a>

          {showSearch && <HeaderSearch />}

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <nav className="flex min-w-0 flex-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                      active
                        ? "bg-accent text-on-accent"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2.5 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white sm:px-4"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
