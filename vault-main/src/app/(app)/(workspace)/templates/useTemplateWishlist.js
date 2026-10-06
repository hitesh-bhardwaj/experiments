"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// Shared by TemplatesGrid (the /templates listing) and TemplateDetail's
// "Related Templates" section - both render TemplateCard, whose Save
// button needs the same wishlisted_templates state and toggle behind it
// (api/wishlist-templates), just from two different places in the tree.
// Signed-out click bounces through /sign-in and back to this exact page,
// same pattern TemplateDetail's own "Buy" button already uses.
export function useTemplateWishlist({ onSaved, onRemoved } = {}) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    if (!isSignedIn) return;

    let active = true;

    fetch("/api/wishlist-templates")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) setWishlist((data || []).map((item) => item.template_slug));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isSignedIn]);

  const toggleWishlist = async (template) => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }

    try {
      const res = await fetch("/api/wishlist-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug: template.slug }),
      });

      if (!res.ok) {
        console.error(await res.json().catch(() => ({})));
        return;
      }

      const { saved } = await res.json();

      if (saved) {
        setWishlist((prev) => (prev.includes(template.slug) ? prev : [...prev, template.slug]));
        onSaved?.(template);
      } else {
        setWishlist((prev) => prev.filter((slug) => slug !== template.slug));
        onRemoved?.(template);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return { wishlist, toggleWishlist };
}
