"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Role } from "@/lib/domain";
import { navigationLinks } from "./portal-navigation";

export function portalDestinations(role: Role) {
  return [...new Set(navigationLinks(role).map(({ href }) => href))];
}

export function usePortalNavigation(
  pathname: string,
  role: Role,
  router: { prefetch: (href: string) => void },
) {
  const [pending, setPending] = useState(false);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      setPending(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const prefetch = () => {
      portalDestinations(role)
        .filter((href) => href !== pathname)
        .forEach((href) => router.prefetch(href));
    };
    const browser = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (browser.requestIdleCallback) {
      const handle = browser.requestIdleCallback(prefetch);
      return () => browser.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(prefetch, 250);
    return () => window.clearTimeout(handle);
  }, [pathname, role, router]);

  const beginNavigation = useCallback(
    (href: string) => {
      if (href !== pathname) setPending(true);
    },
    [pathname],
  );

  const prepareNavigation = useCallback(
    (href: string) => {
      if (href !== pathname) router.prefetch(href);
    },
    [pathname, router],
  );

  return { pending, beginNavigation, prepareNavigation };
}
