"use client";

import { useCallback, useState } from "react";
import { useReCaptcha } from "next-recaptcha-v3";

export default function CustomVerifyCheckbox({ action, checked, onChange }) {
  const { executeRecaptcha } = useReCaptcha();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isVerifying) return;

    if (checked) {
      onChange(false, null);
      return;
    }

    setIsVerifying(true);

    try {
      const token = await executeRecaptcha(action);
      onChange(true, token);
    } catch (error) {
      console.error("reCAPTCHA verification error:", error);
      onChange(false, null);
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, checked, executeRecaptcha, action, onChange]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isVerifying}
      aria-pressed={checked}
      className="inline-flex items-center gap-3 rounded-none border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80 transition-colors hover:border-[#ff5f00]/60 disabled:cursor-wait"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-none border transition-colors ${
          checked
            ? "border-[#ff5f00] bg-[#ff5f00]"
            : "border-white/30 bg-transparent"
        }`}
      >
        {isVerifying ? (
          <span className="h-3 w-3 animate-spin rounded-none border-2 border-white/40 border-t-white" />
        ) : checked ? (
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>

      <span>
        {isVerifying ? "Verifying..." : checked ? "Verified" : "I'm not a robot"}
      </span>
    </button>
  );
}
