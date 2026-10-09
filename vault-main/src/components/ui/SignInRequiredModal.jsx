"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "@/homepage/components/Button";

const T14 = "text-[0.97vw] max-lg:text-[1.7vw] max-md:text-[3.6vw]";
const T24 = "text-[1.67vw] max-lg:text-[2.9vw] max-md:text-[6vw]";

const subscribeNever = () => () => {};

/**
 * The vault's small centred dialog: a title, one line of text and an optional action
 * (pass them as children: text first, then the action element). Not portalled - see
 * SignInRequiredModal for the portalled sign-in prompt built on it.
 */
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
        className={`relative flex w-[35vw] flex-col items-center gap-6 border border-white/20 bg-background p-10 text-center shadow-2xl transition-transform duration-300 max-lg:w-[70%] max-lg:p-6 max-md:w-full ${open ? "scale-100" : "scale-95"}`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="group absolute top-5 right-5 grid size-10 cursor-pointer place-items-center border border-white/20 bg-white/10 text-white/70 transition-colors duration-500 hover:border-primary hover:bg-primary hover:text-white max-md:top-3 max-md:right-3"
        >
          <X className="size-4 transition-transform duration-300 ease-out group-hover:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
        </button>
        <h2 className={`${T24} text-white`}>{title}</h2>
        <p className={`w-[80%] ${T14} text-white/60 max-lg:w-full`}>{text}</p>
        {action}
      </div>
    </div>
  );
}

/**
 * "Sign in required" - the one sign-in prompt for the whole vault (saving effects or
 * templates, copying code, Get code). `action` finishes the sentence "Create a free
 * account or sign in to …"; Sign In returns to `redirect` (the current page).
 */
export function SignInRequiredModal({ open, onClose, redirect = "/", action = "continue" }) {
  // Portals need <body>; false on the server and during hydration.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return null;

  return createPortal(
    <Modal open={open} onClose={onClose} title="Sign in required">
      {`Create a free account or sign in to ${action} and pick up right where you left off.`}
      <Button text="Sign In" href={`/sign-in?redirect_url=${encodeURIComponent(redirect)}`} />
    </Modal>,
    document.body,
  );
}
