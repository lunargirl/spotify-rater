"use client";

import { useEffect } from "react";

/**
 * One-time client redirect: localhost and 127.0.0.1 are different cookie domains.
 * Avoids server middleware redirect loops (ERR_TOO_MANY_REDIRECTS).
 */
export function CanonicalHostRedirect() {
  useEffect(() => {
    if (window.location.hostname !== "localhost") return;

    const { port, pathname, search } = window.location;
    const targetPort = port || "3000";
    window.location.replace(
      `http://127.0.0.1:${targetPort}${pathname}${search}`
    );
  }, []);

  return null;
}
