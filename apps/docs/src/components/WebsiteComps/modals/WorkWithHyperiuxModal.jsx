"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLenis } from "lenis/react";
import WebsiteButton from "@/components/WebsiteComps/Button";
import Input from "@/components/animated-form/Input";
import PhoneInput from "@/components/animated-form/PhoneInput";
import Textarea from "@/components/animated-form/Textarea";
import CustomVerifyCheckbox from "@/components/WebsiteComps/Recaptcha/CustomVerifyCheckbox";
import { validateForm } from "@/lib/form-validation";

const MODAL_QUERY_KEY = "work-with-hyperiux";
const MODAL_QUERY_VALUE = "open";

const MODAL_TRANSITION = {
  duration: 0.5,
  ease: [0.76, 0, 0.24, 1],
};

// Input/Textarea/PhoneInput (components/animated-form) forward unknown
// props onto their real <input>/<textarea>, so this reaches the actual DOM
// node without touching those shared components - they're also reused by
// light-background template-demo forms, which still want the browser's
// light default. globals.css's base input:-webkit-autofill rule paints an
// inset box-shadow the size of the field to fake a background override
// (Chrome's own autofill fill can't be styled directly) - transparent here
// means that fake fill paints nothing, so the field's own background (set
// via its own className) just shows through autofilled or not, instead of
// flashing a solid color. -webkit-text-fill-color still needs the explicit
// white override regardless: browsers force autofilled text to a fixed dark
// color otherwise, unreadable here no matter what the background does.
const AUTOFILL_STYLE = {
  "--input-autofill-bg": "transparent",
  "--input-autofill-text": "#ffffff",
};

const INITIAL_FORM = {
  name: "",
  email: "",
  number: "",
  message: "",
};

const COUNTRIES = [
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "India" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { code: "SG", dial: "+65", flag: "🇸🇬", name: "Singapore" },
];

function buildUrlWith(pathname, searchParams) {
  const params = new URLSearchParams(searchParams.toString());
  params.set(MODAL_QUERY_KEY, MODAL_QUERY_VALUE);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function buildUrlWithout(pathname, searchParams) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete(MODAL_QUERY_KEY);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}


function FieldLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[clamp(14px,0.9vw,18px)] font-medium text-white/90"
    >
      {children}
    </label>
  );
}

function useWorkWithHyperiuxModalInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isOpen = searchParams.get(MODAL_QUERY_KEY) === MODAL_QUERY_VALUE;

  const open = useCallback(() => {
    router.push(buildUrlWith(pathname, searchParams), { scroll: false });
  }, [pathname, router, searchParams]);

  const close = useCallback(() => {
    router.push(buildUrlWithout(pathname, searchParams), { scroll: false });
  }, [pathname, router, searchParams]);

  return { isOpen, open, close };
}

export function useWorkWithHyperiuxModal() {
  return useWorkWithHyperiuxModalInner();
}

function WorkWithHyperiuxTriggerInner({ children = "Work with Hyperiux", className = "" }) {
  const { open } = useWorkWithHyperiuxModalInner();
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}

export function WorkWithHyperiuxTrigger(props) {
  return (
    <Suspense fallback={null}>
      <WorkWithHyperiuxTriggerInner {...props} />
    </Suspense>
  );
}

function WorkWithHyperiuxModalInner() {
  const { isOpen, close } = useWorkWithHyperiuxModalInner();
  const lenis = useLenis();

  const [values, setValues] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [status, setStatus] = useState("idle");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState("");

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    lenis?.stop?.();

    const restartStop = window.setInterval(() => { lenis?.stop?.(); }, 80);

    const handleKeyDown = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearInterval(restartStop);
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      lenis?.start?.();
      requestAnimationFrame(() => { lenis?.start?.(); });
      window.setTimeout(() => { lenis?.start?.(); }, 80);
    };
  }, [isOpen, lenis, close]);

  useEffect(() => {
    if (isOpen) return;
    const id = window.setTimeout(() => {
      setValues(INITIAL_FORM);
      setErrors({});
      setServerError("");
      setStatus("idle");
      setCaptchaVerified(false);
      setCaptchaToken(null);
      setCaptchaError("");
    }, 500);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  const updateField = (field) => (eventOrValue) => {
    const nextValue =
      typeof eventOrValue === "string"
        ? eventOrValue
        : eventOrValue?.target?.value || "";
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setServerError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm(values);
    setErrors(nextErrors);
    setServerError("");
    if (Object.keys(nextErrors).length > 0) return;

    if (!captchaToken) {
      setCaptchaError("Please verify you're not a robot.");
      return;
    }

    setCaptchaError("");
    setStatus("submitting");

    try {
      const response = await fetch("/api/work-with-hyperiux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          number: values.number.trim(),
          message: values.message.trim(),
          recaptchaToken: captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("idle");
        setCaptchaVerified(false);
        setCaptchaToken(null);
        // Field-level errors (e.g. the server-side blocked-domain check) land
        // on their inputs; the banner is only for non-field failures.
        if (data?.errors && Object.keys(data.errors).length > 0) {
          setErrors((prev) => ({ ...prev, ...data.errors }));
        } else {
          setServerError(data?.error || "Something went wrong. Please try again.");
        }
        return;
      }

      setStatus("success");
      window.setTimeout(() => { close(); }, 1100);
    } catch {
      setStatus("idle");
      setServerError("Something went wrong. Please try again.");
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="work-with-hyperiux-modal"
          className="fixed inset-0 z-9999 flex items-center justify-center px-6 py-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="work-with-hyperiux-title"
        >
          <motion.button
            type="button"
            aria-label="Close modal"
            onClick={close}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MODAL_TRANSITION}
          />

          <motion.div
            className="relative z-10 w-[80vw] max-[1025px]:w-[95%]"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={MODAL_TRANSITION}
          >
            {/* Mobile/tablet close button - floats above the box */}
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="group md:hidden absolute -top-12 right-0 flex h-9 w-9 items-center justify-center rounded-none border border-white/20 bg-white/10 text-white/70 transition-all duration-300 hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white max-md:right-[-5%]"
            >
              <div className="relative flex h-4 w-4 items-center justify-center transition-transform duration-500 ease-in-out group-hover:rotate-90">
                <span className="h-px w-4 rotate-45 bg-white" />
                <span className="absolute h-px w-4 -rotate-45 bg-white" />
              </div>
            </button>

            <div
              className="relative w-full overflow-x-hidden overflow-y-auto rounded-none border border-white/20 bg-black/4 p-[3.5vw] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl h-[80vh] max-[1025px]:h-[75vh] max-[1025px]:p-[6vw]"
              onWheelCapture={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
            {/* Desktop close button - inside the box */}
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="max-[1025px]:hidden group absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-none border border-white/20 bg-white/10 text-xl leading-none text-white/70 transition-all duration-500 ease-in-out hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white "
            >
              <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
                <span className="h-px w-4 rotate-45 bg-white" />
                <span className="absolute h-px w-4 -rotate-45 bg-white" />
              </div>
            </button>

            <div className="relative z-10">
              <h3
                id="work-with-hyperiux-title"
                className="text-[3vw] leading-none max-md:text-[8vw] max-[1025px]:text-[5vw]"
              >
                {isSuccess ? "Enquiry sent." : "Work with Hyperiux"}
              </h3>

              <p className="mt-[1vw] max-w-[70vw] text24 leading-relaxed text-white/80 max-[1025px]:mt-4 max-[1025px]:max-w-full max-md:text-[4vw]! max-[1025px]:text-[2.2vw]!">
                {isSuccess
                  ? "We received your message. A confirmation has been sent to your email. Closing now."
                  : "Tell us about your project - what you're building, the interaction or experience you have in mind, and your timeline. We'll get back to you within 1-2 business days."}
              </p>

              {isSuccess ? (
                <div className="mt-[4vw] rounded-none border border-emerald-400/20 bg-emerald-400/10 p-[2vw] max-[1025px]:mt-8 max-[1025px]:p-6">
                  <p className="text-[1.4vw] font-medium text-emerald-100 max-[1025px]:text-xl">
                    Your enquiry has been sent successfully.
                  </p>
                  <p className="mt-2 text-[1vw] text-white/70 max-[1025px]:text-sm">
                    Check your inbox for a confirmation. We&apos;ll be in touch shortly.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="mt-[3vw] grid grid-cols-2 gap-x-[3vw] gap-y-[2vw] max-[1025px]:mt-8 max-[1025px]:grid-cols-1 max-[1025px]:gap-5"
                >
                  <div className="space-y-[1vw] max-[1025px]:space-y-5">
                    <div>
                      <FieldLabel htmlFor="wwh-name">Name*</FieldLabel>
                      <Input
                        id="wwh-name"
                        name="name"
                        label={false}
                        className="rounded-none! border-white/20 bg-white/10 text-white placeholder:text-white/35 focus:border-[#ff5f00]!"
                        style={AUTOFILL_STYLE}
                        value={values.name}
                        onChange={updateField("name")}
                        autoComplete="name"
                        error={errors.name}
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="wwh-email">Email*</FieldLabel>
                      <Input
                        id="wwh-email"
                        name="email"
                        type="email"
                        label={false}
                        className="rounded-none! border-white/20 bg-white/10 text-white placeholder:text-white/35 focus:border-[#ff5f00]!"
                        style={AUTOFILL_STYLE}
                        value={values.email}
                        onChange={updateField("email")}
                        autoComplete="email"
                        error={errors.email}
                        placeholder="you@company.com"
                      />
                    </div>

                    <div>
                      <FieldLabel htmlFor="wwh-number">Phone Number*</FieldLabel>
                      <PhoneInput
                        id="wwh-number"
                        name="number"
                        label={false}
                        placeholder="98765 43210"
                        value={values.number}
                        onChange={updateField("number")}
                        defaultCountry="IN"
                        countries={COUNTRIES}
                        showCountryName
                        error={errors.number}
                        className="rounded-none! border-white/20 bg-white/10 text-white focus-within:border-[#ff5f00]!"
                        style={AUTOFILL_STYLE}
                        countryButtonClassName="text-white/80 hover:text-white"
                        flagClassName="text-base"
                        dialCodeClassName="text-white"
                        chevronClassName="text-white/60"
                        dividerClassName="bg-white/15"
                        // PhoneInput's own <input> hardcodes rounded-r-full
                        // (it's designed as a standalone pill) - the wrapper
                        // above is squared via className's rounded-none!,
                        // but without also squaring the input itself here,
                        // the browser's autofill fill (which follows the
                        // input's own border-radius) renders rounded
                        // corners poking out of the now-square field.
                        inputClassName="rounded-none! text-white placeholder:text-white/35"
                        dropdownClassName="rounded-none! min-w-64 border-white/10! bg-[#111111]! text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                        optionClassName="rounded-none! text-white/70 hover:bg-white/10 hover:text-white"
                        activeOptionClassName="text-[#ff5f00]"
                        optionDialClassName="text-white/40"
                        errorClassName="text-red-300"
                      />
                    </div>
                  </div>

                  <div className="h-full">
                    <FieldLabel htmlFor="wwh-message">Message*</FieldLabel>
                    <Textarea
                      id="wwh-message"
                      name="message"
                      label={false}
                      className="h-[17.3vw]! rounded-none! border-white/20 bg-white/10 text-white placeholder:text-white/35 focus:border-[#ff5f00]! max-[1025px]:h-36!"
                      style={AUTOFILL_STYLE}
                      rows={3}
                      value={values.message}
                      onChange={updateField("message")}
                      error={errors.message}
                      placeholder="Tell us about your project..."
                    />
                  </div>

                  {serverError && (
                    <div className="col-span-2 rounded-none border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm leading-6 text-red-200 max-[1025px]:col-span-1">
                      {serverError}
                    </div>
                  )}

                  <div className="col-span-2 max-[1025px]:col-span-1">
                    <CustomVerifyCheckbox
                      action="work_with_hyperiux"
                      checked={captchaVerified}
                      onChange={(verified, token) => {
                        setCaptchaVerified(verified);
                        setCaptchaToken(token);
                        if (verified) setCaptchaError("");
                      }}
                    />
                    {captchaError && (
                      <p className="mt-2 text-sm text-red-300">{captchaError}</p>
                    )}
                  </div>

                  <div className="col-span-2 mt-4 flex items-center gap-4 max-[1025px]:col-span-1 max-[1025px]:flex-col max-[1025px]:items-start">
                    {/* WebsiteButton renders a <Link>, not a <button type="submit">,
                        so it can't be the form's implicit-submit target - without a
                        real submit control here, pressing Enter in a field does
                        nothing. This is visually hidden and out of tab order but
                        still native, so Enter triggers the form's onSubmit normally. */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="h-0 w-0 overflow-hidden border-0 p-0 opacity-0"
                    />
                    <WebsiteButton
                      text={isSubmitting ? "Sending..." : "Send Enquiry"}
                      href="#"
                      preventDefault
                      disabled={isSubmitting}
                      onClick={handleSubmit}
                      variant="orange"
                      scaleClass="group-hover:scale-[50]"
                      className="min-w-0 rounded-none!"
                      circleClassName="rounded-none!"
                    />
                  </div>
                </form>
              )}
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function WorkWithHyperiuxModal() {
  return (
    <Suspense fallback={null}>
      <WorkWithHyperiuxModalInner />
    </Suspense>
  );
}
