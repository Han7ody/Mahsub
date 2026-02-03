"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLoading } from "@/lib/loading-context";

/**
 * Lightweight route-change loading hook.
 * Starts global loading on pathname change and stops shortly after
 * the new route renders. Adjust timeout to match typical network latency.
 */
export default function RouteLoadingHandler() {
  const pathname = usePathname();
  const { startLoading, stopLoading } = useLoading();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    // Begin global loading on navigation
    startLoading();

    // Stop after a short delay; replace with real signal if available
    const t = window.setTimeout(() => {
      stopLoading();
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
