"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

const DEFAULT_AUTO_DISMISS_MS = 4000;

// One toast slot per caller - a new showToast() call replaces whatever is
// showing and restarts the dismiss timer, so rapid-fire actions (e.g.
// copying several blocks quickly) always reflect the latest usage instead of
// queuing up stale toasts.
export function useToastQueue(autoDismissMs = DEFAULT_AUTO_DISMISS_MS) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, autoDismissMs);

    return () => window.clearTimeout(timeoutId);
  }, [toast, autoDismissMs]);

  const showToast = useCallback((nextToast) => {
    setToast({ id: Date.now(), ...nextToast });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}

export function ToastViewport({ toast, onDismiss }) {
  const [mounted, setMounted] = useState(false);

  // SSR-safe mounted flag - `mounted` gates a createPortal() call further
  // down, which needs document.body and so can only run after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      className={`fixed top-6 right-6 z-9999 w-[min(22rem,calc(100vw-2rem))] transition-all duration-300 ${
        toast
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-3 opacity-0"
      }`}
    >
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3  border border-white/15 bg-[#0e0e0e]/95 px-5 py-4 shadow-2xl backdrop-blur-md"
        >
          <div className="min-w-0 flex-1">
            {toast.title && (
              <p className="text-sm font-medium text-white">{toast.title}</p>
            )}

            {toast.description && (
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                {toast.description}
              </p>
            )}

            {toast.ctaHref && (
              <Link
                href={toast.ctaHref}
                className="mt-2 inline-block text-xs font-medium text-[#ff5f00] hover:text-[#ff7a29]"
              >
                {toast.ctaLabel || "Learn more"}
              </Link>
            )}
          </div>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="shrink-0 text-white/40 transition-colors hover:text-white"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
