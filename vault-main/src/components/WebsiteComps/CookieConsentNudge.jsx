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

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-5 left-5 z-9000 w-88 max-w-[calc(100vw-2.5rem)] border border-white/10 bg-[#141414] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl max-md:bottom-3 max-md:left-3 max-md:right-3 max-md:w-auto"
    >
      <p className="text-sm leading-relaxed text-white/70">
        We use cookies to keep you signed in and understand how Hyperiux Vault
        is used. By continuing, you agree to our{" "}
        <Link
          href="/legal/privacy-policy"
          className="text-white underline underline-offset-2 hover:text-[#ff5f00]"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <button
        type="button"
        onClick={dismiss}
        className="mt-8 cursor-pointer bg-[#ff5f00] px-5 py-2 text-xs font-medium text-black transition-colors hover:bg-[#ff7300]"
      >
        OK
      </button>
    </div>
  );
}

export default CookieConsentNudge;
