"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import { Modal, SignInRequiredModal } from "@/components/ui/SignInRequiredModal";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { emitWishlistChanged } from "@/lib/wishlistEvents";
import { installCommand } from "./EffectCard";


const subscribeNever = () => () => {};

// Saved effects are cached per account - in memory across client navigations and in
// localStorage across visits - so hearts show the right state straight away; the
// /api/wishlist fetch then refreshes the cache in the background.
const WISHLIST_CACHE_KEY = (userId) => `hx-wishlist:${userId}`;
const memoryWishlist = new Map();

function readCachedWishlist(userId) {
  if (memoryWishlist.has(userId)) return memoryWishlist.get(userId);
  try {
    const stored = JSON.parse(window.localStorage.getItem(WISHLIST_CACHE_KEY(userId)) || "null");
    return Array.isArray(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeCachedWishlist(userId, list) {
  memoryWishlist.set(userId, list);
  try {
    window.localStorage.setItem(WISHLIST_CACHE_KEY(userId), JSON.stringify(list));
  } catch {
    // Storage blocked - the in-memory copy still covers this visit.
  }
}

/**
 * Everything an EffectCard's actions need - saved effects, copy install command,
 * the Pro lock - shared by the effects listing and the effect page's related effects
 * so both behave the same. Render `overlays` once on the page: it holds the toast
 * and the "sign in to save" prompt.
 */
export function useEffectCardActions({ userPlan = "free", signInRedirect = "/effects" } = {}) {
  const { isSignedIn, user } = useUser();
  const userId = user?.id;
  const isProUser = userPlan === "pro";
  const { toast, showToast, dismissToast } = useToastQueue();
  const [wishlist, setWishlist] = useState([]);
  const [signInPrompt, setSignInPrompt] = useState(false);
  // Portals need <body>; false on the server and during hydration.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  // Cached list first (before paint, so no hearts flicker), then the server's.
  useLayoutEffect(() => {
    if (!isSignedIn || !userId) return;
    const cached = readCachedWishlist(userId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setWishlist(cached);
  }, [isSignedIn, userId]);

  useEffect(() => {
    if (!isSignedIn || !userId) return undefined;
    let cancelled = false;
    fetch("/api/wishlist")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const list = data.map((item) => item.effect_slug || item.name || item);
        setWishlist(list);
        writeCachedWishlist(userId, list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  // Latest list for click handlers (a click reads it before any re-render).
  const wishlistRef = useRef(wishlist);
  useLayoutEffect(() => {
    wishlistRef.current = wishlist;
  }, [wishlist]);

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const copyInstall = useCallback(
    async (effect) => {
      const command = installCommand(effect);
      try {
        await navigator.clipboard.writeText(command);
        showToast({ title: "Install command copied", description: command });
      } catch {
        showToast({ title: "Copy this command", description: command });
      }
    },
    [showToast],
  );

  // Optimistic: the heart, toast and dashboard count update on click; the request
  // confirms in the background and the heart goes back if it fails.
  const setSaved = useCallback(
    (name, saved) => {
      setWishlist((prev) => {
        const next = saved ? [...new Set([...prev, name])] : prev.filter((item) => item !== name);
        if (userId) writeCachedWishlist(userId, next);
        return next;
      });
    },
    [userId],
  );

  const toggleWishlist = useCallback(
    async (effect) => {
      if (!isSignedIn) {
        setSignInPrompt(true);
        return;
      }
      const willSave = !wishlistRef.current.includes(effect.name);
      setSaved(effect.name, willSave);
      showToast({
        title: `${effect.title} ${willSave ? "saved" : "removed"}`,
        description: willSave ? "You'll find it in your dashboard's Saved Effects." : "It's no longer in your dashboard's Saved Effects.",
      });
      emitWishlistChanged(willSave);

      try {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ effect }),
        });
        if (!res.ok) throw new Error(`wishlist ${res.status}`);
        const data = await res.json();
        // The server has the final say (e.g. after a double click).
        if (typeof data.saved === "boolean" && data.saved !== willSave) {
          setSaved(effect.name, data.saved);
          emitWishlistChanged(data.saved);
        }
      } catch (error) {
        console.error(error);
        setSaved(effect.name, !willSave);
        emitWishlistChanged(!willSave);
        showToast({ title: "Couldn't update Saved Effects", description: "Please try again in a moment." });
      }
    },
    [isSignedIn, showToast, setSaved],
  );

  const canInstall = useCallback((effect) => effect.tier !== "pro" || isProUser, [isProUser]);
  const isWishlisted = useCallback((effect) => wishlistSet.has(effect.name), [wishlistSet]);

  // Spread onto an EffectCard: <EffectCard effect={e} {...cardActions(e)} />
  const cardActions = (effect) => ({
    isWishlisted: isWishlisted(effect),
    canInstall: canInstall(effect),
    onToggleWishlist: toggleWishlist,
    onCopyInstall: copyInstall,
  });

  const overlays = (
    <>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
      <SignInRequiredModal open={signInPrompt} onClose={() => setSignInPrompt(false)} redirect={signInRedirect} action="save effects" />
    </>
  );

  return { isProUser, mounted, canInstall, isWishlisted, copyInstall, toggleWishlist, cardActions, overlays };
}

// Modal lives in components/ui now; re-exported for existing imports (EffectsListing).
export { Modal };
