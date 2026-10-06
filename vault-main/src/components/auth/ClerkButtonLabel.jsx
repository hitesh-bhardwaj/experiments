"use client";

import { useEffect, useRef } from "react";

// Clerk's primary-button text (the formButtonPrimary localization key) is
// global - shared by every Clerk form in the app - and can only be set once
// on <ClerkProvider>, so it can't read "Continue to Vault" on /sign-in and
// "Create my account" on /sign-up at the same time via localization alone.
// This patches just that one button's rendered text after Clerk mounts its
// widget into the DOM, and keeps re-applying it via MutationObserver since
// Clerk re-renders the widget internally on its own (step changes, etc).
export default function ClerkButtonLabel({ label, children }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const applyLabel = () => {
      const button = container.querySelector(".cl-formButtonPrimary");

      if (button && button.textContent !== label) {
        button.textContent = label;
      }
    };

    applyLabel();

    const observer = new MutationObserver(applyLabel);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [label]);

  return <div ref={containerRef}>{children}</div>;
}
