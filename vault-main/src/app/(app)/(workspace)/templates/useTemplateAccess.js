"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

// Fired by a finished purchase or credit redemption, so every card on the page
// switches to Download (and shows "Yours") without a refetch.
const OWNED_EVENT = "template-owned";

// Templates bought or redeemed since the page loaded. Merged into every fetch
// below, so a request that started before the purchase can't undo it.
const ownedThisSession = new Set();

export function markTemplateOwned(slug) {
  ownedThisSession.add(slug);
  window.dispatchEvent(new CustomEvent(OWNED_EVENT, { detail: { slug } }));
}

// Sibling to useTemplateWishlist.js - same shape, different data source.
// Reuses api/dashboard/template-purchases (built for the dashboard's "My
// Templates" tab) rather than a new route: that endpoint already returns
// exactly "every template this signed-in user can download" (purchased, or
// included via an active annual-Pro subscription), which is exactly the set
// TemplateCard's purchase button needs to know about.
export function useTemplateAccess() {
  const { isSignedIn } = useUser();
  const [accessSlugs, setAccessSlugs] = useState(() => [...ownedThisSession]);

  useEffect(() => {
    if (!isSignedIn) return;

    let active = true;

    fetch("/api/dashboard/template-purchases")
      .then((res) => (res.ok ? res.json() : { templates: [] }))
      .then((data) => {
        if (!active) return;
        const slugs = new Set((data?.templates || []).map((t) => t.slug));
        ownedThisSession.forEach((slug) => slugs.add(slug));
        setAccessSlugs([...slugs]);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isSignedIn]);

  useEffect(() => {
    const onOwned = (event) => {
      const slug = event.detail?.slug;
      if (slug) setAccessSlugs((slugs) => (slugs.includes(slug) ? slugs : [...slugs, slug]));
    };
    window.addEventListener(OWNED_EVENT, onOwned);
    return () => window.removeEventListener(OWNED_EVENT, onOwned);
  }, []);

  return accessSlugs;
}
