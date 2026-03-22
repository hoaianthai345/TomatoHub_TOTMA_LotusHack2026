"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams]
  );
  const previousRouteRef = useRef(routeKey);

  useEffect(() => {
    if (routeKey === previousRouteRef.current) {
      return;
    }

    previousRouteRef.current = routeKey;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [routeKey]);

  return null;
}

