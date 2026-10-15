"use client";

import { useEffect, useState } from "react";
import { WISHLIST_CHANGED_EVENT } from "@/lib/wishlistEvents";

/**
 * What the profile dropdown shows for a signed-in account: the saved-effects count
 * (kept in step with every heart toggled on the page) and today's install usage.
 * Shared by the site header and the dashboard header.
 */
export function useAccountSummary(isSignedIn) {
  const [wishlistCount, setWishlistCount] = useState(0);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let active = true;

    fetch("/api/wishlist")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && Array.isArray(data)) setWishlistCount(data.length);
      })
      .catch((err) => console.error(err));

    fetch("/api/copy-usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setUsage(data);
      })
      .catch((err) => console.error(err));

    const onWishlistChanged = (e) => {
      setWishlistCount((count) => (e.detail?.saved ? count + 1 : Math.max(0, count - 1)));
    };
    window.addEventListener(WISHLIST_CHANGED_EVENT, onWishlistChanged);

    return () => {
      active = false;
      window.removeEventListener(WISHLIST_CHANGED_EVENT, onWishlistChanged);
    };
  }, [isSignedIn]);

  return { wishlistCount, usage };
}
