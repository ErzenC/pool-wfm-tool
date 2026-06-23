"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const ACTIVITY_EVENTS = ["pointerdown", "click", "keydown", "touchstart", "scroll"] as const;
const ACTIVITY_THROTTLE_MS = 60 * 1000;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const LOGOUT_EVENT_KEY = "pool-wfm-logout-event";

type SessionGuardProps = {
  userId: string;
  onSessionExpired: () => void;
};

export function SessionGuard({ userId, onSessionExpired }: SessionGuardProps) {
  const lastActivityPostRef = useRef(0);
  const idleTimerRef = useRef<number | null>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    const broadcast = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("pool-wfm-session") : null;

    async function expireSession() {
      if (expiredRef.current) {
        return;
      }

      expiredRef.current = true;
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" }).catch(() => undefined);
      onSessionExpired();
      broadcast?.postMessage({ type: "logout" });
      window.localStorage.setItem(LOGOUT_EVENT_KEY, String(Date.now()));
      window.location.replace("/login?reason=session-expired");
    }

    function resetIdleTimer() {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = window.setTimeout(() => {
        void expireSession();
      }, IDLE_TIMEOUT_MS);
    }

    async function postActivity() {
      const now = Date.now();

      resetIdleTimer();

      if (now - lastActivityPostRef.current < ACTIVITY_THROTTLE_MS) {
        return;
      }

      lastActivityPostRef.current = now;

      const response = await fetch("/api/session/activity", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).catch(() => null);

      if (!response || response.status === 401) {
        await expireSession();
      }
    }

    async function validateCurrentPage() {
      const response = await fetch("/api/session/status", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).catch(() => null);

      if (!response || response.status === 401) {
        await expireSession();
      }
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        void validateCurrentPage();
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === LOGOUT_EVENT_KEY) {
        void expireSession();
      }
    }

    function handleActivity() {
      void postActivity();
    }

    function handleBroadcastMessage() {
      void expireSession();
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("storage", handleStorage);
    broadcast?.addEventListener("message", handleBroadcastMessage);
    resetIdleTimer();
    void validateCurrentPage();

    let unsubscribeAuth: (() => void) | undefined;
    try {
      const supabase = createSupabaseBrowserClient();
      const subscription = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          void expireSession();
        }
      });
      unsubscribeAuth = () => subscription.data.subscription.unsubscribe();
    } catch {
      unsubscribeAuth = undefined;
    }

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("storage", handleStorage);
      broadcast?.removeEventListener("message", handleBroadcastMessage);
      broadcast?.close();
      unsubscribeAuth?.();
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [onSessionExpired, userId]);

  return null;
}
