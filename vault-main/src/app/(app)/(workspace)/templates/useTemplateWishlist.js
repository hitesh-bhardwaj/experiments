"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Button from "@/homepage/components/Button";
import { Modal } from "../effects/useEffectCardActions";

const subscribeNever = () => () => {};

// Shared by TemplatesGrid (the /templates listing) and TemplateDetail's
// "Related Templates" section - both render TemplateCard, whose Save
// button needs the same wishlisted_templates state and toggle behind it
// (api/wishlist-templates), just from two different places in the tree.
// Signed-out click opens the same "Sign in required" modal as the effect cards
// (its Sign In button comes back to this exact page) - render `signInModal`
// once wherever the hook is used.
export function useTemplateWishlist({ onSaved, onRemoved } = {}) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();
  const [wishlist, setWishlist] = useState([]);
  const [signInPrompt, setSignInPrompt] = useState(false);
  // Portals need <body>; false on the server and during hydration.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

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

  // Optimistic, like the effects cards: the heart and toast change on click,
  // and the server's answer only corrects it (or a failure reverts it).
  const wishlistRef = useRef(wishlist);
  useEffect(() => {
    wishlistRef.current = wishlist;
  }, [wishlist]);
  const setSaved = (slug, saved) => {
    const prev = wishlistRef.current;
    const next = saved ? (prev.includes(slug) ? prev : [...prev, slug]) : prev.filter((s) => s !== slug);
    wishlistRef.current = next; // so a quick second click sees this one
    setWishlist(next);
  };

  const toggleWishlist = async (template) => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setSignInPrompt(true);
      return;
    }

    const willSave = !wishlistRef.current.includes(template.slug);
    setSaved(template.slug, willSave);
    (willSave ? onSaved : onRemoved)?.(template);

    try {
      const res = await fetch("/api/wishlist-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug: template.slug }),
      });
      if (!res.ok) throw new Error(`wishlist-templates ${res.status}`);
      const { saved } = await res.json();
      // The server has the final say (e.g. after a double click).
      if (typeof saved === "boolean" && saved !== willSave) setSaved(template.slug, saved);
    } catch (err) {
      console.error(err);
      setSaved(template.slug, !willSave);
    }
  };

  const signInModal = mounted
    ? createPortal(
        <Modal open={signInPrompt} onClose={() => setSignInPrompt(false)} title="Sign in required">
          Create a free account or sign in to save templates and pick up right where you left off.
          <Button text="Sign In" href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`} />
        </Modal>,
        document.body,
      )
    : null;

  return { wishlist, toggleWishlist, signInModal };
}
