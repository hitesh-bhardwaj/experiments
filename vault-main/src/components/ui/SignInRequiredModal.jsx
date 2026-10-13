"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AuthModalForm } from "@/components/auth/AuthModalForm";
import { ToastViewport, useToastQueue } from "@/components/ui/Toast";

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
 * templates, copying code, Get code, buying a template). It holds the sign-in page's
 * form itself (AuthModalForm: sign in, create account, reset password), so visitors
 * sign in without leaving the page; the session then picks up on `redirect` (the
 * current page). `action` finishes the sentence "Sign in or create a free account to …".
 */
export function SignInRequiredModal({ open, onClose, redirect = "/", action = "continue", initialMode = "sign-in" }) {
  // Portals need <body>; false on the server and during hydration.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  // "You're signed in" once the form finishes (it stays up after the modal closes)
  const { toast, showToast, dismissToast } = useToastQueue();
  const onSignedIn = ({ isNewAccount } = {}) => {
    onClose?.();
    showToast(
      isNewAccount
        ? { title: "Account created", description: "You’re signed in. Welcome to Vault." }
        : { title: "You’re signed in", description: "Welcome Back - pick up right where you left off." },
    );
  };
  // A fresh form every time it opens; it stays as it was while fading out.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
    <div
      onClick={onClose}
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in required"
        data-lenis-prevent
        onClick={(event) => event.stopPropagation()}
        className={`relative max-h-[92svh] w-[34vw] overflow-y-auto overscroll-contain border border-white/20 bg-background p-[2.6vw] shadow-2xl transition-transform duration-300 max-lg:w-[70%] max-lg:p-8 max-md:w-full max-md:p-6 ${open ? "scale-100" : "scale-95"}`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="group absolute top-5 right-5 z-1 grid size-10 cursor-pointer place-items-center border border-white/20 bg-white/10 text-white/70 transition-colors duration-500 hover:border-primary hover:bg-primary hover:text-white max-md:top-3 max-md:right-3"
        >
          <X className="size-4 transition-transform duration-300 ease-out group-hover:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
        </button>
        <AuthModalForm
          key={session}
          redirectUrl={redirect}
          initialMode={initialMode}
          intro={`Sign in or create a free account to ${action} and pick up right where you left off.`}
          onDone={onSignedIn}
        />
      </div>
    </div>
    <ToastViewport toast={toast} onDismiss={dismissToast} />
    </>,
    document.body,
  );
}
