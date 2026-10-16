"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile widget for the site's forms. It loads Cloudflare's
// script itself the first time a form shows one, so nothing is loaded on pages
// without a form. Same props as the old reCAPTCHA checkbox:
//   action    the form's name, checked again on the server (lib/turnstile.js)
//   checked   whether the form currently holds a token
//   onChange  (verified, token) - called with a token, or (false, null) when it
//             expires or fails
// Tokens are single-use: when the form drops its token after a failed submit
// (checked goes false), the widget fetches a fresh one.
// appearance "interaction-only" keeps the widget invisible unless Cloudflare
// needs the visitor to click.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  scriptPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function Turnstile({ action, checked, onChange, appearance = "always", className = "" }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetRef.current = turnstile.render(containerRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          action,
          appearance,
          theme: "dark",
          size: "flexible",
          callback: (token) => onChangeRef.current?.(true, token),
          "expired-callback": () => onChangeRef.current?.(false, null),
          "error-callback": () => onChangeRef.current?.(false, null),
        });
      })
      .catch(() => onChangeRef.current?.(false, null));

    return () => {
      cancelled = true;
      if (widgetRef.current != null) window.turnstile?.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [action, appearance]);

  // The form dropped its token (used or rejected): get a fresh one
  useEffect(() => {
    const widget = widgetRef.current;
    if (!checked && widget != null && window.turnstile?.getResponse(widget)) {
      window.turnstile.reset(widget);
    }
  }, [checked]);

  return <div ref={containerRef} className={className} />;
}
