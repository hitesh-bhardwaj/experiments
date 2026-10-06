"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import { X } from "lucide-react";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { emitWishlistChanged } from "@/lib/wishlistEvents";
import { installCommand } from "./EffectCardV4";

const T14 = "text-[0.97vw] max-[1025px]:text-[1.7vw] max-md:text-[3.6vw]";
const T24 = "text-[1.67vw] max-[1025px]:text-[2.9vw] max-md:text-[6vw]";

const subscribeNever = () => () => {};

/**
 * Everything an EffectCardV4's actions need - saved effects, copy install command,
 * the Pro lock - shared by the effects listing and the effect page's related effects
 * so both behave the same. Render `overlays` once on the page: it holds the toast
 * and the "sign in to save" prompt.
 */
export function useEffectCardActions({ userPlan = "free", signInRedirect = "/effects" } = {}) {
  const { isSignedIn } = useUser();
  const isProUser = userPlan === "pro";
  const { toast, showToast, dismissToast } = useToastQueue();
  const [wishlist, setWishlist] = useState([]);
  const [signInPrompt, setSignInPrompt] = useState(false);
  // Portals need <body>; false on the server and during hydration.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/wishlist")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setWishlist((data || []).map((item) => item.effect_slug || item.name || item)))
      .catch(() => {});
  }, [isSignedIn]);

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

  const toggleWishlist = useCallback(
    async (effect) => {
      if (!isSignedIn) {
        setSignInPrompt(true);
        return;
      }
      try {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ effect }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setWishlist((prev) => (data.saved ? [...new Set([...prev, effect.name])] : prev.filter((name) => name !== effect.name)));
        showToast({
          title: `${effect.title} ${data.saved ? "saved" : "removed"}`,
          description: data.saved ? "You'll find it in your dashboard's Saved Effects." : "It's no longer in your dashboard's Saved Effects.",
        });
        emitWishlistChanged(data.saved);
      } catch (error) {
        console.error(error);
      }
    },
    [isSignedIn, showToast],
  );

  const canInstall = useCallback((effect) => effect.tier !== "pro" || isProUser, [isProUser]);
  const isWishlisted = useCallback((effect) => wishlistSet.has(effect.name), [wishlistSet]);

  // Spread onto an EffectCardV4: <EffectCardV4 effect={e} {...cardActions(e)} />
  const cardActions = (effect) => ({
    isWishlisted: isWishlisted(effect),
    canInstall: canInstall(effect),
    onToggleWishlist: toggleWishlist,
    onCopyInstall: copyInstall,
  });

  const overlays = (
    <>
      <ToastViewport toast={toast} onDismiss={dismissToast} />
      {mounted &&
        createPortal(
          <Modal open={signInPrompt} onClose={() => setSignInPrompt(false)} title="Sign in required">
            Create a free account or sign in to save effects and pick up right where you left off.
            <ButtonV3 text="Sign In" href={`/sign-in?redirect_url=${encodeURIComponent(signInRedirect)}`} />
          </Modal>,
          document.body,
        )}
    </>
  );

  return { isProUser, mounted, canInstall, isWishlisted, copyInstall, toggleWishlist, cardActions, overlays };
}

export function Modal({ open, onClose, title, children }) {
  const [text, action] = Array.isArray(children) ? children : [children, null];
  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`relative flex w-[35vw] flex-col items-center gap-6 border border-white/20 bg-[#0e0e0e] p-10 text-center shadow-2xl transition-transform duration-300 max-[1025px]:w-[70%] max-[1025px]:p-6 max-md:w-full ${open ? "scale-100" : "scale-95"}`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-5 right-5 grid size-10 cursor-pointer place-items-center border border-white/20 bg-white/10 text-white/70 transition-colors duration-500 hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white max-[1025px]:hidden"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <h2 className={`${T24} font-medium text-white`}>{title}</h2>
        <p className={`w-[80%] ${T14} text-white/60 max-[1025px]:w-full`}>{text}</p>
        {action}
      </div>
    </div>
  );
}
