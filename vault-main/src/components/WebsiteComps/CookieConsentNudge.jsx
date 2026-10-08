"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
const STORAGE_KEY = "hyperiux_cookie_notice_acknowledged";

export function CookieConsentNudge() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const isExcludedRoute =
    pathname.startsWith("/demo") || pathname.startsWith("/template-demo");

  useEffect(() => {
    if (isExcludedRoute) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      
      setVisible(true);
    }
  }, [isExcludedRoute]);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      
    }
  };

  if (isExcludedRoute) return null;
  if (!visible) return null;

  // One row, centred at the bottom: the notice and its "Learn more" link, then OK.
  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-[1.5vw] left-1/2 z-9000 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-[2.2vw] border border-white/10 bg-[#141414] py-[1.1vw] pr-[1.1vw] pl-[1.2vw] font-avenir shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-lg:bottom-[3vw] max-lg:gap-[4vw] max-lg:py-[2vw] max-lg:pr-[2vw] max-lg:pl-[2.4vw] max-md:bottom-[4vw] max-md:w-[calc(100vw-8vw)] max-md:gap-[5vw] max-md:py-[4vw] max-md:pr-[4vw] max-md:pl-[5vw]"
    >
      <p className="text-[0.95vw] leading-snug text-white/75 max-lg:text-[1.9vw] max-md:text-[3.6vw]">
        This website uses cookies to improve your experience.{" "}
        <Link
          href="/legal/privacy-policy"
          className="text-white underline underline-offset-2 transition-colors hover:text-[#ff5f00]"
        >
          Learn more
        </Link>
      </p>

      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 cursor-pointer bg-[#ff5f00] px-[1.35vw] py-[0.6vw] text-[0.85vw] text-black transition-colors hover:bg-[#ff7300] max-lg:px-[2.6vw] max-lg:py-[1.2vw] max-lg:text-[1.7vw] max-md:px-[5vw] max-md:py-[2.4vw] max-md:text-[3.4vw]"
      >
        OK
      </button>
    </div>
  );
}

export default CookieConsentNudge;
