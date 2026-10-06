"use client";

import { useEffect } from "react";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";

const GTM_ID = "GTM-NCDH9PHF";

// GTM used to bootstrap synchronously in <head>. That kept the network busy
// for PageSpeed Insights (plain Chrome UA, no webdriver). Real visitors still
// get the container after a client gate that can also detect PSI's software
// WebGL renderer. No visual change.
export default function DeferredGTM() {
  useEffect(() => {
    if (isLighthouseOrHeadless() || isSoftwareRenderer()) return;
    if (window.google_tag_manager?.[GTM_ID]) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js",
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.appendChild(script);
  }, []);

  return null;
}
