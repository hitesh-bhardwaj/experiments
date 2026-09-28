"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";

const CopyLimitContext = createContext(null);

// Shared across every code/install block on one effect page so hitting the
// limit on one block immediately locks the rest too, instead of each block
// tracking its own stale copy of the daily count. The limit is per distinct
// effect copied today, not per click - once this effect has consumed a slot
// (or the user copies from it again), every block on the page stays unlocked.
export function CopyLimitProvider({ children, onRequireSignIn, effectSlug }) {
  const { isSignedIn, isLoaded } = useUser();
  const [usage, setUsage] = useState(null);
  const { toast, showToast, dismissToast } = useToastQueue();

  // Surfaces the "X of Y copies left today" nudge after every copy attempt
  // that actually touches the daily limit - skipped for admins (unlimited)
  // since there's nothing worth reporting.
  const notifyUsage = useCallback(
    (data) => {
      if (!data || data.isAdmin || typeof data.limit !== "number") return;

      const limit = data.limit;
      const remaining = Math.max(0, data.remaining ?? 0);
      const count = data.count ?? Math.max(0, limit - remaining);

      showToast({
        title:
          remaining > 0
            ? `${remaining} of ${limit} daily copies left`
            : "Daily copy limit reached",
        description:
          remaining > 0
            ? `You've copied ${count}/${limit} effects today.`
            : "Come back tomorrow, or upgrade to Pro for a higher limit.",
        ctaHref: remaining === 0 && data.plan !== "pro" ? "/pricing" : null,
        ctaLabel: "Upgrade to Pro",
      });
    },
    [showToast]
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    fetch("/api/copy-usage")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUsage(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const effectAlreadyUnlocked = Boolean(usage?.effectSlugs?.includes(effectSlug));

  // Holds the in-flight POST's promise, not just a boolean - a second call
  // that arrives while the first is still pending (near-simultaneous clicks
  // on this effect's source/install copy buttons, a key-repeat, anything
  // that fires before `usage` state has updated) awaits the SAME request
  // instead of racing through the still-stale effectAlreadyUnlocked/
  // remaining checks above and firing its own POST - each of which would
  // otherwise write its own install_events row for what should be a single
  // "this effect is now unlocked" event.
  const pendingRequestRef = useRef(null);

  const requestCopy = useCallback(async () => {
    if (!isLoaded) return false;

    if (!isSignedIn) {
      onRequireSignIn?.();
      return false;
    }

    if (usage?.isAdmin) return true;
    // Already used a slot on this effect today - copy freely, no need to
    // round-trip to the server.
    if (effectAlreadyUnlocked) {
      notifyUsage(usage);
      return true;
    }
    if (usage && usage.remaining <= 0) {
      notifyUsage(usage);
      return false;
    }

    if (pendingRequestRef.current) return pendingRequestRef.current;

    const request = (async () => {
      try {
        const res = await fetch("/api/copy-usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ effectSlug }),
        });
        const data = await res.json();

        setUsage(data);
        notifyUsage(data);

        return Boolean(data.allowed);
      } catch {
        return false;
      } finally {
        pendingRequestRef.current = null;
      }
    })();

    pendingRequestRef.current = request;
    return request;
  }, [
    isLoaded,
    isSignedIn,
    usage,
    effectAlreadyUnlocked,
    effectSlug,
    onRequireSignIn,
    notifyUsage,
  ]);

  const isLocked = Boolean(
    isLoaded &&
      isSignedIn &&
      usage &&
      !usage.isAdmin &&
      !effectAlreadyUnlocked &&
      usage.remaining <= 0
  );

  // Selection/clipboard is only blocked once we're sure the visitor is
  // signed out - default to selectable while auth is still loading so the
  // code doesn't flash locked-then-unlocked for signed-in users.
  const selectable = !isLoaded || isSignedIn;

  const value = {
    isLoaded,
    isSignedIn,
    usage,
    requestCopy,
    isLocked,
    selectable,
    lockedCtaHref: usage?.plan === "pro" || usage?.isAdmin ? null : "/pricing",
  };

  return (
    <CopyLimitContext.Provider value={value}>
      {children}
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </CopyLimitContext.Provider>
  );
}

export function useCopyLimit() {
  const ctx = useContext(CopyLimitContext);

  if (!ctx) {
    throw new Error("useCopyLimit must be used within a CopyLimitProvider");
  }

  return ctx;
}
