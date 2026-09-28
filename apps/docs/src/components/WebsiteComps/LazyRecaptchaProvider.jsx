"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReCaptchaProvider } from "next-recaptcha-v3";
import { RECAPTCHA_ARM_EVENT } from "@/lib/recaptchaEvents";

const MODAL_KEYS = ["custom-animation-form", "work-with-hyperiux"];

// reCAPTCHA (~250KB) was loaded on every page via a root provider even though
// it is only needed inside contact modals. Mount the provider only when a
// modal query is open so the homepage never downloads it on first paint.
function LazyRecaptchaProviderInner({ children }) {
  const searchParams = useSearchParams();
  const needsRecaptcha = MODAL_KEYS.some(
    (key) => searchParams.get(key) === "open"
  );
  // Stick once armed so closing the modal doesn't tear down the provider mid-token.
  const [armed, setArmed] = useState(false);
  const enabled = armed || needsRecaptcha;

  // Stick once armed - derived purely from needsRecaptcha, which is already
  // available during render, guarded so it only fires once.
  if (needsRecaptcha && !armed) {
    setArmed(true);
  }

  // Non-query-param triggers (e.g. ExitIntentInviteModal, opened by cursor
  // behavior rather than a "?work-with-hyperiux=open" link) can't be
  // detected from searchParams above, so they ask for the provider via this
  // event instead - see lib/recaptchaEvents.js.
  useEffect(() => {
    if (armed) return;

    const handleArm = () => setArmed(true);
    window.addEventListener(RECAPTCHA_ARM_EVENT, handleArm);
    return () => window.removeEventListener(RECAPTCHA_ARM_EVENT, handleArm);
  }, [armed]);

  if (!enabled) return children;

  return (
    <ReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
    >
      {children}
    </ReCaptchaProvider>
  );
}

export default function LazyRecaptchaProvider({ children }) {
  return (
    <Suspense fallback={children}>
      <LazyRecaptchaProviderInner>{children}</LazyRecaptchaProviderInner>
    </Suspense>
  );
}
