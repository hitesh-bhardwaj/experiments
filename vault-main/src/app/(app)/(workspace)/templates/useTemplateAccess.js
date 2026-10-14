"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

// Sibling to useTemplateWishlist.js - same shape, different data source.
// Reuses api/dashboard/template-purchases (built for the dashboard's "My
// Templates" tab) rather than a new route: that endpoint already returns
// exactly "every template this signed-in user can download" (purchased, or
// included via an active annual-Pro subscription), which is exactly the set
// TemplateCard's purchase button needs to know about.
// Fired by a finished purchase or credit redemption, so every card on the page
// switches to Download without a refetch.
const OWNED_EVENT = "template-owned";

export function markTemplateOwned(slug) {
  window.dispatchEvent(new CustomEvent(OWNED_EVENT, { detail: { slug } }));
}

export function useTemplateAccess() {
  const { isSignedIn } = useUser();
  const [accessSlugs, setAccessSlugs] = useState([]);

  useEffect(() => {
    if (!isSignedIn) return;

    let active = true;

    fetch("/api/dashboard/template-purchases")
      .then((res) => (res.ok ? res.json() : { templates: [] }))
      .then((data) => {
        if (active) setAccessSlugs((data?.templates || []).map((t) => t.slug));
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
