"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NextLink from "next/link";
import { useSignUp } from "@clerk/nextjs/legacy";
import SplitAuthLayout from "./SplitAuthLayout";
import {
  errorMessage,
  getSafeRedirectUrl,
  isSessionExistsError,
  StepHeading,
  TextField,
  GlobalError,
  SubmitButton,
  SecondaryButton,
} from "./AuthFormPrimitives";

// Custom-built replacement for the prebuilt `<SignUp />` component, mirroring
// SignInFlow.jsx's approach and layout - see that file for why `useSignUp()`
// is imported from the `/legacy` subpath (plain `@clerk/nextjs` now returns
// a Signals-based shape with no `isLoaded`/`setActive`, which silently
// breaks the `if (!isLoaded || loading) return;` guards below).

const RESEND_COOLDOWN_SECONDS = 30;

// Matches SignInFlow.jsx's post-auth destination, the ClerkProvider's
// signInFallbackRedirectUrl, and the invite-accept continuation flow
// (signup/continue/page.js) - a new signup should land in the vault like
// every other auth path, not detour through pricing.
const REDIRECT_AFTER_SIGN_UP = "/effects";

export default function SignUpFlow() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef(null);

  // Lets a gated action (e.g. buying a template while signed out) bounce
  // an anonymous visitor through sign-up and land back exactly where they
  // clicked, instead of always dropping them at /effects.
  const rawRedirectUrl = searchParams.get("redirect_url");
  const redirectUrl = getSafeRedirectUrl(rawRedirectUrl, REDIRECT_AFTER_SIGN_UP);
  const signInHref = rawRedirectUrl
    ? `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/sign-in";

  // "start" | "verify-email"
  const [step, setStep] = useState("start");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  function startResendCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    const timer = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function completeSignUp(result) {
    // redirectUrl passed directly into setActive() - the ClerkProvider in
    // (app)/layout.js sets signInForceRedirectUrl="/effects" globally,
    // which setActive() otherwise falls back to for its own internal
    // navigation (it runs "just before the session...is set", per Clerk's
    // types) regardless of what a later router.push() here tries to do.
    // An explicit per-call redirectUrl is the documented way to override
    // that. router.push stays as a fallback in case this Clerk version's
    // own redirect doesn't fully complete the client-side transition.
    await setActive({ session: result.createdSessionId, redirectUrl });

    // Client-side only: ReferralRocket's server-side REST API
    // (addParticipant) needs a paid-plan API key we don't have, so this is
    // the sole lead-tracking path - the widget script (loaded on the
    // homepage, see ReferralRocketTracking.jsx) reads the rr_referral_code
    // cookie it set at click time and, if present, attributes this signup
    // to that referrer. Never lets a tracking failure block the real signup.
    try {
      window.Rocket?.getCampaign?.().addParticipant({ email });
    } catch (referralRocketError) {
      console.error("REFERRAL_ROCKET_ADD_PARTICIPANT_ERROR:", referralRocketError);
    }

    router.push(redirectUrl);
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    if (!isLoaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Split on the first space - Clerk stores first/last name separately,
      // but this form only asks for one "Name" field. A single-word name
      // just becomes firstName with no lastName, which is fine everywhere
      // else in the app (every display already falls back to firstName
      // when fullName - firstName + lastName - is incomplete).
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const lastName = rest.join(" ") || undefined;

      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      if (result.status === "complete") {
        await completeSignUp(result);
      } else if (result.status === "abandoned") {
        // SignUpStatus is 'missing_requirements' | 'complete' | 'abandoned' -
        // an abandoned attempt has no valid next step (Clerk expired/reset
        // it), so calling prepareEmailAddressVerification() on it would just
        // surface a confusing Clerk error via the catch block below instead
        // of a clear "start over" message.
        setError("Your sign-up session expired. Please try again.");
      } else {
        // Every sign-up on this instance requires email verification before
        // it can complete - prepare it up front rather than branching on
        // exactly which requirement Clerk reports missing.
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setStep("verify-email");
        startResendCooldown();
      }
    } catch (err) {
      // Same session_exists case as SignInFlow.jsx - the browser already
      // has a real, currently-valid session, so route onward instead of
      // surfacing a dead-end Clerk error.
      if (isSessionExistsError(err)) {
        router.push(REDIRECT_AFTER_SIGN_UP);
        return;
      }
      setError(errorMessage(err, "Unable to create your account. Check your details and try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!isLoaded || loading || resendCooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      startResendCooldown();
    } catch (err) {
      setError(errorMessage(err, "Unable to resend the code. Try again in a moment."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmail(event) {
    event.preventDefault();
    if (!isLoaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await completeSignUp(result);
      } else {
        // Not currently reachable (this instance only requires email
        // verification), but logged with the real status rather than a bare
        // "contact support" so it's diagnosable if Clerk's requirements
        // ever change (e.g. a phone number or additional profile field).
        console.error("attemptEmailAddressVerification did not complete:", result);
        setError(`Additional verification is required for this account (${result.status}). Please contact support.`);
      }
    } catch (err) {
      setError(errorMessage(err, "That code didn't work. Check it and try again."));
    } finally {
      setLoading(false);
    }
  }

  function backToStart() {
    setError(null);
    setStep("start");
  }

  return (
    <SplitAuthLayout>
      <GlobalError message={error} />

      {step === "start" && (
        <form ref={formRef} onSubmit={handleCreateAccount}>
          <StepHeading
            title="Open the Vault."
            subtitle="Create an account and start with the Free Core. Install what you need. Own what you ship."
          />

          <TextField
            id="full-name"
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
          <TextField
            id="email-address"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <TextField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            autoComplete="new-password"
          />

          {/* Required by Clerk's bot sign-up protection (Smart CAPTCHA) for
              custom flows - signUp.create() has nowhere to mount its
              challenge widget without this and hangs indefinitely. See
              https://clerk.com/docs/guides/development/custom-flows/authentication/bot-sign-up-protection */}
          <div id="clerk-captcha" />

          <div className="mt-6">
            <SubmitButton loading={loading} formRef={formRef} className="w-fit">
              Create my account
            </SubmitButton>
          </div>

          <p className="mt-6 text-left text-sm text-white/50 font-geist-mono">
            Already have an account?{" "}
            <NextLink href={signInHref} className="text-[#ff5f00] hover:text-[#ff7a29]">
              Sign in
            </NextLink>
          </p>
        </form>
      )}

      {step === "verify-email" && (
        <form ref={formRef} onSubmit={handleVerifyEmail}>
          <StepHeading
            title="Check your email."
            subtitle={`Enter the code we sent to ${email} to verify your account.`}
          />

          <TextField
            id="code"
            label="Verification code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            autoComplete="one-time-code"
          />

          <div className="mb-6">
            <SubmitButton loading={loading} formRef={formRef} className="w-fit">
              Verify email
            </SubmitButton>
          </div>

          <div className="flex items-center justify-between text-sm">
            <SecondaryButton onClick={backToStart}>Go back</SecondaryButton>
            {resendCooldown > 0 ? (
              <span className="text-white/30">Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendCode}
                className="text-[#ff5f00] hover:text-[#ff7a29]"
              >
                Resend code
              </button>
            )}
          </div>
        </form>
      )}
    </SplitAuthLayout>
  );
}
