"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { useReCaptcha } from "next-recaptcha-v3";
import { Mail } from "lucide-react";
import { armRecaptcha } from "@/lib/recaptchaEvents";
import { buttonV3ClassName, ButtonV3Chrome } from "@/homepage-v3/components/ButtonV3";

// Site-wide exit-intent capture (except sign-in and /dashboard - see
// isExcludedRoute below), mirroring WorkWithHyperiuxModal.jsx's technical
// conventions (motion/react, same MODAL_TRANSITION curve, Lenis scroll-lock)
// but with local useState instead of a query-param-driven open state - this
// modal is triggered by cursor behavior, not a link anyone needs to
// deep-link to or share.
//
// Mounted globally from the root layout (inside LazyRecaptchaProvider, so
// executeRecaptcha() below actually has a provider to talk to - see
// lib/recaptchaEvents.js) rather than per-route, so the pathname check below
// is what keeps it off the excluded routes, not where it's rendered from.
//
// Submitting creates a real Clerk invitation and emails it via the existing
// waitlist-invite-email template (see api/exit-intent-invite/route.js) -
// accepting it lets the visitor set a password and land signed in, same
// flow as an admin-sent waitlist invite.

const SESSION_KEY = "hyperiux_exit_intent_shown";
// A visitor who bounces within the first minute hasn't actually engaged with
// the page yet - showing an invite popup to them reads as an ambush, not an
// offer. Arming only after 60s of real time on the page means a genuine exit
// attempt still triggers instantly (the listener is fully armed by then),
// it's just not listening at all during that first minute.
const ARM_DELAY_MS = 45000;
// Was 0 - required event.clientY to be exactly <=0 at the moment
// `mouseleave` fired, which real cursor movement (sampled, not continuous)
// rarely lands on exactly, hence needing several attempts before one
// happened to register. A small margin catches any leave-via-the-top
// gesture reliably on the first try.
const TOP_EDGE_TRIGGER_PX = 30;

const MODAL_TRANSITION = {
  duration: 0.5,
  ease: [0.76, 0, 0.24, 1],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ExitIntentInviteModal() {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | submitting | success
  const [error, setError] = useState("");
  const [sendHovered, setSendHovered] = useState(false);
  const shownRef = useRef(false);
  const { executeRecaptcha } = useReCaptcha();
  const lenis = useLenis();
  const pathname = usePathname();
  // Was homepage-only ("/") - now every route except sign-in (mid-auth-flow,
  // an invite-to-sign-up popup is redundant there) and the whole /dashboard
  // app (already-signed-in users past the point this invite is for).
  const isExcludedRoute =
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname.startsWith("/dashboard") || pathname.startsWith("/template-demo") || pathname.startsWith("/demo")
  const isEligibleRoute = !isExcludedRoute;

  // Arms after a short delay (so a visitor who bounces in the first few
  // seconds doesn't get ambushed instantly) and only once per tab session -
  // sessionStorage, not localStorage, so it's fair game again on a fresh
  // visit later, just not spammed across repeated mouse-out flicks in one visit.
  // Mounted globally (see the note above), so this also has to bail out on
  // excluded routes - re-checked on every pathname change since the
  // component no longer unmounts on navigation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isEligibleRoute) return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;

    const armTimer = window.setTimeout(() => {
      setArmed(true);
      // Asks LazyRecaptchaProvider to mount <ReCaptchaProvider> now, not on
      // submit - this modal opens on a mouseleave, not a query param, so it
      // wouldn't otherwise be picked up (see lib/recaptchaEvents.js) and
      // executeRecaptcha() would throw "Recaptcha has not been loaded".
      armRecaptcha();
    }, ARM_DELAY_MS);
    return () => window.clearTimeout(armTimer);
  }, [isEligibleRoute]);

  useEffect(() => {
    if (!armed) return;
    if (!isEligibleRoute) return;

    function handleMouseLeave(event) {
      if (shownRef.current) return;
      // Only the top edge - a cursor leaving toward the browser's tab bar
      // or URL bar is a real "about to leave" signal; leaving the sides or
      // bottom of the viewport is normal scrolling/window-resizing noise.
      if (event.clientY > TOP_EDGE_TRIGGER_PX) return;

      shownRef.current = true;
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setOpen(true);
    }

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [armed, isEligibleRoute]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop?.();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      lenis?.start?.();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, lenis]);

  const close = () => setOpen(false);

  useEffect(() => {
    if (open) return;
    const id = window.setTimeout(() => {
      setEmail("");
      setAgreed(true);
      setStatus("idle");
      setError("");
    }, 500);
    return () => window.clearTimeout(id);
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the privacy policy first.");
      return;
    }

    setStatus("submitting");

    try {
      const recaptchaToken = await executeRecaptcha("exit_intent_invite");
      const res = await fetch("/api/exit-intent-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), recaptchaToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("idle");
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      window.setTimeout(close, 2000);
    } catch {
      setStatus("idle");
      setError("Something went wrong. Please try again.");
    }
  };

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";

  // Safety net alongside the effect guards above: covers the moment a
  // client-side navigation fires while the modal happens to already be open.
  if (!isEligibleRoute) return null;

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          key="exit-intent-modal"
          className="fixed inset-0 z-9999 flex items-center justify-center px-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-intent-title"
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MODAL_TRANSITION}
          />

          <motion.div
            className="relative z-10 w-[36vw] max-md:w-full max-[1025px]:w-[70%] border border-white/20 bg-[#0e0e0e] p-10 max-md:p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={MODAL_TRANSITION}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="group absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-white/20 bg-white/10 text-white/70 transition-all duration-300 hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white"
            >
              <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
                <span className="h-px w-4 rotate-45 bg-white" />
                <span className="absolute h-px w-4 -rotate-45 bg-white" />
              </div>
            </button>

            {isSuccess ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Mail className="h-10 w-10 text-[#ff5f00]" strokeWidth={1.2} />
                <h3 className="text-xl font-bold text-white">Invite sent.</h3>
                <p className="max-w-sm text-sm leading-relaxed text-white/60">
                  Check your inbox for your Hyperiux Vault invite - accept it to set a
                  password and you&apos;re in.
                </p>
              </div>
            ) : (
              <>
                <span className="inline-block bg-[#ff5f00]/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#ff5f00]">
                  Before you go
                </span>

                <h3
                  id="exit-intent-title"
                  className="mt-6 text-2xl font-bold leading-tight text-white max-md:text-xl"
                >
                  Get instant access to 50+ free effects.
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-white/60">
                  Source-first scroll effects, cursor systems, and page transitions for
                  React and Next.js. We&apos;ll email you an invite to set up your free
                  account - no credit card, ever.
                </p>

                <form onSubmit={handleSubmit} noValidate className="mt-14 space-y-8">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your email address"
                    autoComplete="email"
                    // globals.css's base input:-webkit-autofill rule fakes a
                    // background override via an inset box-shadow (Chrome's
                    // own autofill fill can't be styled directly), falling
                    // back to a light fill meant for light-surface inputs -
                    // transparent here means that fake fill paints nothing,
                    // so this field's own transparent background just shows
                    // through either way. -webkit-text-fill-color still
                    // needs the explicit white override: browsers force
                    // autofilled text to a fixed dark color otherwise.
                    style={{
                      "--input-autofill-bg": "transparent",
                      "--input-autofill-text": "#ffffff",
                    }}
                    className="w-full border-b border-white bg-transparent pb-4 text-sm text-white placeholder:text-white/60 outline-none focus:border-[#ff5f00]"
                  />

                  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-white/60">
                    {/* accent-color styles the browser's native checkbox
                        widget, which keeps its own rounded corners baked in
                        by the platform - border-radius/rounded-none can't
                        override that. Drawing the box as a plain span (with
                        the real input visually hidden but still driving
                        state/keyboard/a11y) keeps it a genuine square. */}
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => {
                        setAgreed(e.target.checked);
                        setError("");
                      }}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#ff5f00] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black ${
                        agreed ? "border-[#ff5f00] bg-[#ff5f00]" : "border-white/30 bg-transparent"
                      }`}
                    >
                      {agreed && (
                        <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5 text-white">
                          {/* pathLength (a Motion-specific SVG prop) animates
                              the stroke as if it were being drawn, rather
                              than just appearing - remounts (and so
                              replays) every time the checkbox goes from
                              unchecked to checked, including the initial
                              checked-by-default state on open. */}
                          <motion.path
                            d="M2 6l2.5 2.5L10 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                          />
                        </svg>
                      )}
                    </span>
                    <span>
                      I agree to the{" "}
                      <Link
                        href="/legal/privacy-policy"
                        target="_blank"
                        className="text-white/80 underline underline-offset-2 hover:text-white"
                      >
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  {/* Same buttonV3ClassName + ButtonV3Chrome pair
                      TemplatePaywallModal's RazorpayButtonV3 uses - this is
                      a real form-submitting <button>, not a navigation
                      <Link>, so it can't just render <ButtonV3> itself, but
                      these two give it the exact same look (scramble label,
                      square/arrow chrome) as every other ButtonV3 on the
                      site. */}
                  <div
                    className="contents"
                    onPointerEnter={() => setSendHovered(true)}
                    onPointerLeave={() => setSendHovered(false)}
                  >
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={buttonV3ClassName({
                        className: "w-fit disabled:pointer-events-none disabled:opacity-60",
                      })}
                    >
                      <ButtonV3Chrome
                        label={isSubmitting ? "Sending…" : "Send it to me"}
                        hovered={sendHovered}
                      />
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ExitIntentInviteModal;
