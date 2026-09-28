"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

// Sibling to useTemplateWishlist.js - same shape, different data source.
// Reuses api/dashboard/template-purchases (built for the dashboard's "My
// Templates" tab) rather than a new route: that endpoint already returns
// exactly "every template this signed-in user can download" (purchased, or
// included via an active annual-Pro subscription), which is exactly the set
// TemplateCard's purchase button needs to know about.
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

  return accessSlugs;
}
