"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";

// Shared building blocks for the custom Clerk auth flows (SignInFlow,
// SignUpFlow) - both step through Clerk's low-level useSignIn()/useSignUp()
// resources with the same split-panel layout, so the visual pieces (and the
// requestSubmit()-via-ButtonV3 wiring) live here once instead of being
// duplicated per flow.

export function errorMessage(err, fallback) {
  return err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || fallback;
}

// Only ever redirect to a same-app relative path after auth completes -
// `redirect_url` comes straight from a query param (e.g. a "buy this
// template" link bouncing an anonymous visitor through sign-in), so an
// unvalidated value would let a crafted link send a freshly authenticated
// session to an attacker's origin. "/" prefix only, and explicitly not
// "//..." (protocol-relative - still cross-origin).
export function getSafeRedirectUrl(rawValue, fallback) {
  if (typeof rawValue !== "string") return fallback;
  if (!rawValue.startsWith("/") || rawValue.startsWith("//")) return fallback;
  return rawValue;
}

// Clerk rejects signIn.create()/signUp.create() with this code when the
// browser already holds a valid session (single-session mode) - a real,
// currently-valid session, not a stale one. The prebuilt <SignIn/>/<SignUp/>
// components handle it by redirecting automatically; SignInFlow/SignUpFlow
// call the lower-level signIn.create()/signUp.create() directly (see
// SignInFlow.jsx's top comment for why), so without this check the form
// just dead-ends on a raw Clerk error with no way forward short of a
// manual reload - which is what actually surfaces the real session, via
// the sign-in/sign-up page's own server-side auth() redirect.
export function isSessionExistsError(err) {
  return err?.errors?.[0]?.code === "session_exists";
}

// Sized in fixed steps (not vw) because the card itself is now a fixed
// max-width (see SplitAuthLayout), not a viewport-relative column - vw units
// would keep growing with screen width even though the card stops growing
// past its cap.
export function StepHeading({ title, subtitle }) {
  return (
    <div className="mb-8 space-y-2 max-[1025px]:mb-7 max-md:mb-10 max-md:space-y-3">
      <h1 className="text-4xl font-semibold text-white max-[1025px]:text-[2rem] max-md:text-3xl">{title}</h1>
      {subtitle && <p className="text-base text-white max-md:text-sm">{subtitle}</p>}
    </div>
  );
}

export function TextField({ id, label, type = "text", value, onChange, placeholder, autoComplete }) {
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-5 space-y-2 max-md:mb-4">
      <label htmlFor={id} className="block text-sm font-mono font-medium tracking-wide text-white/80">
        {label}
      </label>
      <div className="group relative w-full h-fit">
        <input
          id={id}
          name={id}
          type={isPassword && visible ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          // text-base (16px), not smaller, on every breakpoint - anything
          // under 16px makes iOS Safari auto-zoom the page on focus.
          className={`w-full border border-white/10 bg-white/5 py-3 text-base! text-white placeholder:text-white/30 outline-none transition ${
            isPassword ? "pl-4 pr-12" : "px-4"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <span className="pointer-events-none max-sm:hidden absolute top-0 left-0 h-1.5 w-1.5 border-t border-l border-primary opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 max-md:h-3 max-md:w-3 focus-frame" />
        <span className="pointer-events-none max-sm:hidden absolute top-0 right-0 h-1.5 w-1.5 border-t border-r border-primary opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 max-md:h-3 max-md:w-3" />
        <span className="pointer-events-none max-sm:hidden absolute bottom-0 left-0 h-1.5 w-1.5 border-b border-l border-primary opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 max-md:h-3 max-md:w-3" />
        <span className="pointer-events-none max-sm:hidden absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-primary opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 max-md:h-3 max-md:w-3" />
      </div>
    </div>
  );
}

export function GlobalError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-5 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      {message}
    </div>
  );
}

// ButtonV3 renders a <Link>, not a <button type="submit">, so a click on it
// can't trigger native form submission on its own - requestSubmit() on the
// owning form reuses the exact same submit event (and required-field
// validation) a native type="submit" button relied on.
//
// That same gap breaks Enter-to-submit: browsers only do implicit
// submission-on-Enter when the form contains a real submit control, and an
// <a> never counts. The visually-hidden button below is that real control -
// it renders inside the same <form> as ButtonV3, so pressing Enter in any
// field fires the browser's native submit against it, which runs this
// step's onSubmit handler exactly like a ButtonV3 click does via
// requestSubmit().
export function SubmitButton({ loading, formRef, children, className }) {
  return (
    <>
      <button
        type="submit"
        disabled={loading}
        tabIndex={-1}
        aria-hidden="true"
        className="h-0 w-0 overflow-hidden border-0 p-0 opacity-0"
      />
      <ButtonV3
        href="#"
        preventDefault
        disabled={loading}
        onClick={() => formRef.current?.requestSubmit()}
        className={className || "w-full justify-center"}
      >
        {loading ? "Please wait…" : children}
      </ButtonV3>
    </>
  );
}

export function SecondaryButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-white/50 transition hover:text-[#ff5f00] duration-300 ease-in-out "
    >
      {children}
    </button>
  );
}
