"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import { Modal, SignInRequiredModal } from "@/components/ui/SignInRequiredModal";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { emitWishlistChanged } from "@/lib/wishlistEvents";
import { installCommand } from "./EffectCard";
import { getLimitNudge } from "@/lib/limitNudge";
import { mergeCopyUsage, publishCopyUsage, subscribeCopyUsage } from "@/lib/copyUsageEvents";


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
  // false, or the reason to show ("save effects", "install effects with the CLI")
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

  // Copying an install command counts as an install, against the same daily limit as
  // the effect page's code copies, the CLI and MCP (POST /api/copy-usage claims one;
  // copying the same effect again that day is free). `usage` is the last known count.
  const [usage, setUsage] = useState(null);
  // Kept in step with the effect page's code blocks and Get code menu
  useEffect(
    () => subscribeCopyUsage((next) => setUsage((previous) => mergeCopyUsage(previous, next))),
    []
  );
  useEffect(() => {
    if (!isSignedIn || !userId) return undefined;
    let cancelled = false;
    fetch("/api/copy-usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setUsage(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  // One request per effect at a time (fast double clicks share it)
  const pendingClaims = useRef(new Map());
  // `source`: what the copy counts as - "cli" for the `npx hyperiux add` command
  const claimInstall = useCallback(
    (slug, source = "web") => {
      // Copied earlier today: free, even at the limit
      if (usage?.isAdmin || usage?.effectSlugs?.includes(slug)) return Promise.resolve({ allowed: true, data: usage });
      // Limit used up: the same message as everywhere else, no request
      if (usage && typeof usage.remaining === "number" && usage.remaining <= 0) {
        return Promise.resolve({ allowed: false, data: usage });
      }
      if (pendingClaims.current.has(slug)) return pendingClaims.current.get(slug);
      const request = (async () => {
        try {
          const res = await fetch("/api/copy-usage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ effectSlug: slug, source }),
          });
          const data = await res.json();
          setUsage(data);
          publishCopyUsage(data);
          return { allowed: Boolean(data.allowed), data };
        } catch {
          return { allowed: false, data: null, failed: true };
        } finally {
          pendingClaims.current.delete(slug);
        }
      })();
      pendingClaims.current.set(slug, request);
      return request;
    },
    [usage],
  );

  // Resolves true once the command is on the clipboard (the card and drawer show
  // "Copied" only then). Signed out: the sign-in prompt instead.
  const copyInstall = useCallback(
    async (effect) => {
      if (!isSignedIn) {
        setSignInPrompt("install effects with the CLI");
        return false;
      }
      const command = installCommand(effect);

      // Start the clipboard write now, inside the click: Safari refuses one that only
      // begins after the network wait below. It's filled in (or dropped) once the
      // install is claimed.
      let fill;
      let drop;
      const text = new Promise((resolve, reject) => {
        fill = resolve;
        drop = reject;
      });
      let write = null;
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        write = navigator.clipboard.write([new ClipboardItem({ "text/plain": text.then((t) => new Blob([t], { type: "text/plain" })) })]);
        write.catch(() => {});
      }

      // The install command: a CLI install, not a website copy
      const { allowed, data, failed } = await claimInstall(effect.name, "cli");
      if (!allowed) {
        drop(new Error("not allowed"));
        if (failed || !data) {
          showToast({ title: "Couldn't copy the command", description: "Please try again in a moment." });
        } else {
          showToast(getLimitNudge(data));
        }
        return false;
      }

      fill(command);
      let copied = false;
      try {
        if (write) await write;
        else await navigator.clipboard.writeText(command);
        copied = true;
      } catch {
        try {
          await navigator.clipboard.writeText(command);
          copied = true;
        } catch {
          copied = false;
        }
      }

      const left =
        data && !data.isAdmin && typeof data.limit === "number"
          ? `${Math.max(0, data.remaining ?? 0)} of ${data.limit} daily installs left (copies, CLI & MCP).`
          : null;
      showToast(
        copied
          ? { title: "Install command copied", description: left ?? command }
          : { title: "Copy this command", description: command },
      );
      return copied;
    },
    [isSignedIn, claimInstall, showToast],
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
        setSignInPrompt("save effects");
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
      <SignInRequiredModal open={Boolean(signInPrompt)} onClose={() => setSignInPrompt(false)} redirect={signInRedirect} action={signInPrompt || "save effects"} />
    </>
  );

  return { isProUser, mounted, canInstall, isWishlisted, copyInstall, toggleWishlist, cardActions, overlays };
}

// Modal lives in components/ui now; re-exported for existing imports (EffectsListing).
export { Modal };
