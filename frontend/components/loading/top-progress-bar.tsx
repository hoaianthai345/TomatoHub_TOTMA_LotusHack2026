"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_DELAY_MS = 220;
const MIN_VISIBLE_MS = 260;
const TRICKLE_INTERVAL_MS = 120;
const COMPLETE_FILL_MS = 360;
const COMPLETE_RESET_MS = 260;

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(
    () => `${pathname}?${searchParams.toString()}`,
    [pathname, searchParams]
  );

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const previousRouteRef = useRef(routeKey);
  const activeRef = useRef(false);
  const visibleAtRef = useRef(0);
  const startTimerRef = useRef<number | null>(null);
  const trickleTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);

  const clearTimer = (timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearAllTimers = useCallback(() => {
    clearTimer(startTimerRef);
    clearTimer(trickleTimerRef);
    clearTimer(completeTimerRef);
  }, []);

  const scheduleTrickle = useCallback(() => {
    const tick = () => {
      if (!activeRef.current) {
        return;
      }

      setProgress((previous) => {
        const delta = Math.max(3, (90 - previous) * 0.2);
        return Math.min(90, previous + delta);
      });

      trickleTimerRef.current = window.setTimeout(tick, TRICKLE_INTERVAL_MS);
    };

    clearTimer(trickleTimerRef);
    trickleTimerRef.current = window.setTimeout(tick, TRICKLE_INTERVAL_MS);
  }, []);

  const start = useCallback(() => {
    if (activeRef.current || startTimerRef.current !== null) {
      return;
    }

    startTimerRef.current = window.setTimeout(() => {
      activeRef.current = true;
      visibleAtRef.current = Date.now();
      setProgress(14);
      setVisible(true);
      scheduleTrickle();
      startTimerRef.current = null;
    }, START_DELAY_MS);
  }, [scheduleTrickle]);

  const complete = useCallback(() => {
    clearTimer(startTimerRef);

    if (!activeRef.current) {
      return;
    }

    clearTimer(trickleTimerRef);
    const elapsed = Date.now() - visibleAtRef.current;
    const waitForMinimum = Math.max(0, MIN_VISIBLE_MS - elapsed);

    completeTimerRef.current = window.setTimeout(() => {
      setProgress(100);
      completeTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        completeTimerRef.current = window.setTimeout(() => {
          activeRef.current = false;
          setProgress(0);
        }, COMPLETE_RESET_MS);
      }, COMPLETE_FILL_MS);
    }, waitForMinimum);
  }, []);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const link = target?.closest("a");

      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(href, window.location.href);

      if (currentUrl.origin !== nextUrl.origin) {
        return;
      }

      const currentKey = `${currentUrl.pathname}${currentUrl.search}`;
      const nextKey = `${nextUrl.pathname}${nextUrl.search}`;
      if (currentKey === nextKey) {
        return;
      }

      start();
    };

    const onPopState = () => {
      start();
    };

    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [start]);

  useEffect(() => {
    if (routeKey !== previousRouteRef.current) {
      previousRouteRef.current = routeKey;
      complete();
    }
  }, [complete, routeKey]);

  useEffect(
    () => () => {
      clearAllTimers();
    },
    [clearAllTimers]
  );

  return (
    <div className={`top-progress-root ${visible ? "is-visible" : ""}`.trim()}>
      <div className="top-progress-track">
        <div className="top-progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
