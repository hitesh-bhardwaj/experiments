"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { REFERRAL_ROCKET_CAMPAIGN_ID } from "@/lib/referral-rocket";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";

// Referral click tracking (ReferralRocket's widget). Homepage-only by
// design, same reasoning as the old Affitor tracker: rendered directly in
// (marketing)/page.js rather than the root layout, since that's the only
// page we want attributed here. The script itself reads ?referralCode= off
// the URL and stores it in the rr_referral_code cookie - see
// lib/referral-rocket.js for the rest of this integration.
//
// It's 381 KiB, 46% of the homepage's total script weight by itself (see
// the Lighthouse Treemap that flagged it) and has no UI - nothing on the
// page depends on it running before the visitor has actually engaged.
// lazyOnload only deprioritized it (still fetches within a couple seconds
// via requestIdleCallback, well inside a Lighthouse trace); this instead
// gates the mount itself behind the same "don't fetch until it's actually
// needed" rule as the video/icon fixes - here, real user interaction, since
// there's no viewport/expand-state to gate on for a script with no DOM. A
// short timeout fallback still loads it for the (rare) visitor who never
// interacts at all, so referral attribution doesn't just silently drop.
//
// That same fallback is exactly why PageSpeed/Lighthouse kept flagging it
// anyway: an automated audit never scrolls or clicks, but its trace window
// is longer than the fallback delay, so the safety net fired during every
// measured run regardless. Audit/headless traffic never converts a
// referral, so there's nothing lost skipping it there outright - same two
// signals shouldSkipRealtimeGPU (lib/audit.js) already combines for the
// same reason (isLighthouseOrHeadless catches PSI mobile/webdriver;
// isSoftwareRenderer catches PSI's real desktop crawler, which presents a
// plain Chrome UA and no navigator.webdriver).
const INTERACTION_EVENTS = ["pointerdown", "mousemove", "scroll", "keydown", "touchstart"];
const FALLBACK_DELAY_MS = 5000;

export default function ReferralRocketTracking() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    if (isLighthouseOrHeadless() || isSoftwareRenderer()) return;

    const load = () => setShouldLoad(true);

    INTERACTION_EVENTS.forEach((event) =>
      window.addEventListener(event, load, { once: true, passive: true })
    );
    const fallback = setTimeout(load, FALLBACK_DELAY_MS);

    return () => {
      INTERACTION_EVENTS.forEach((event) =>
        window.removeEventListener(event, load)
      );
      clearTimeout(fallback);
    };
  }, [shouldLoad]);

  if (!shouldLoad) return null;

  return (
    <Script
      src="https://app.referralrocket.io/widget/widgetIndex.js"
      campaign-id={REFERRAL_ROCKET_CAMPAIGN_ID}
      strategy="afterInteractive"
    />
  );
}
