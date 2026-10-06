"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NextLink from "next/link";
import { useSignIn } from "@clerk/nextjs/legacy";
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

// Custom-built replacement for the prebuilt `<SignIn />` component, built on
// Clerk's own `useSignIn()`/`setActive()` hooks (@clerk/nextjs) rather than
// @clerk/elements - that package's latest release still hard-depends on the
// older `@clerk/clerk-react@5.x` core, which resolves a different React
// Context than this app's `@clerk/nextjs@7.x` (built on the newer
// `@clerk/react@6.x` core), so `<ClerkProvider>` and Elements' hooks
// silently don't see each other ("useClerk can only be used within
// <ClerkProvider />" even though it genuinely wraps the tree - confirmed by
// actually running it, not visible from package.json alone). `useSignIn()`
// is Clerk's lower-level, always-compatible "build a custom flow" API (the
// same primitive Elements itself is built on) - every step below still goes
// through Clerk's real sign-in resource (`signIn.create`,
// `.attemptFirstFactor`, `.resetPassword`), it's just this component, not
// Elements, driving which step renders when.
//
// Imported from the `/legacy` subpath specifically: plain `@clerk/nextjs`'s
// `useSignIn()` now returns the newer Signals-based shape
// (`{ signIn, errors, fetchStatus }`, no `isLoaded`/`setActive`), which
// silently breaks every handler below (`isLoaded` reads as `undefined`
// forever, so the `if (!isLoaded || loading) return;` guards never let
// anything run). `/legacy` restores the classic `{ isLoaded, signIn,
// setActive }` shape this component is written against.

const RESEND_COOLDOWN_SECONDS = 30;

export default function SignInFlow() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef(null);

  // Lets a gated action (e.g. buying a template while signed out) bounce
  // an anonymous visitor through sign-in and land back exactly where they
  // clicked, instead of always dropping them at /effects.
  const rawRedirectUrl = searchParams.get("redirect_url");
  const redirectUrl = getSafeRedirectUrl(rawRedirectUrl, "/effects");
  const signUpHref = rawRedirectUrl
    ? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/sign-up";

  // "start" | "forgot-password" | "verify-reset-code" | "reset-password" |
  // "verify-client-trust"
  const [step, setStep] = useState("start");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function completeSignIn(result) {
    // redirectUrl passed directly into setActive() - the ClerkProvider in
    // (app)/layout.js sets signInForceRedirectUrl="/effects" globally,
    // which setActive() otherwise falls back to for its own internal
    // navigation (it runs "just before the session...is set", per Clerk's
    // types) regardless of what a later router.push() here tries to do.
    // An explicit per-call redirectUrl is the documented way to override
    // that. router.push stays as a fallback in case this Clerk version's
    // own redirect doesn't fully complete the client-side transition.
    await setActive({ session: result.createdSessionId, redirectUrl });
    router.push(redirectUrl);
  }

  // Shared by the reset-password code step and the client-trust code step -
  // both are a "we just emailed you a code" resend timer.
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

  async function handleSignIn(event) {
    event.preventDefault();
    if (!isLoaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.create({ identifier: email, password });

      if (result.status === "complete") {
        await completeSignIn(result);
      } else if (result.status === "needs_client_trust") {
        // Clerk's Device Trust: correct password, but this browser/device
        // hasn't been seen before, so Clerk wants an email-code check
        // before it'll trust the client. Mirrors the reset-password code
        // step below, just against attemptSecondFactor instead of
        // attemptFirstFactor. (If the account also has real MFA enabled,
        // Clerk returns needs_second_factor instead of this - MFA takes
        // precedence, see the branch below.)
        const emailCodeFactor = result.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code"
        );

        if (!emailCodeFactor) {
          console.error("needs_client_trust with no email_code factor available:", result);
          setError(
            "This device needs to be verified, but no supported verification method is available. Please contact support."
          );
        } else {
          try {
            await signIn.prepareSecondFactor({ strategy: "email_code" });
            setStep("verify-client-trust");
            startResendCooldown();
          } catch (err) {
            setError(errorMessage(err, "Unable to send a verification code. Try again in a moment."));
          }
        }
      } else if (result.status === "needs_second_factor") {
        // This flow never implemented a second-factor step (no code path
        // collects a TOTP/SMS/backup code) - if the account has MFA
        // enrolled, or the Clerk instance requires it, sign-in can never
        // complete here no matter how correct the password is.
        setError(
          "This account requires two-factor authentication, which isn't supported by this sign-in form yet. Please contact support."
        );
      } else {
        // Anything else (needs_new_password, needs_identifier, etc.) -
        // logged with the real status so it's actually diagnosable instead
        // of a generic dead end.
        console.error("Clerk signIn.create() did not complete:", result);
        setError(
          `Additional verification is required for this account (${result.status}). Please contact support.`
        );
      }
    } catch (err) {
      // The browser already has a real, currently-valid session - stale
      // client-side "signed out" rendering (e.g. after clearing cookies
      // that this app's own cache reads but Clerk's own session cookie
      // survives) is what got them to this form in the first place. Route
      // them onward instead of surfacing a dead-end Clerk error.
      if (isSessionExistsError(err)) {
        router.push("/effects");
        return;
      }
      setError(errorMessage(err, "Unable to sign in. Check your email and password."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendResetCode(event) {
    event?.preventDefault();
    if (!isLoaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email });
      setStep("verify-reset-code");
      startResendCooldown();
    } catch (err) {
      setError(errorMessage(err, "Unable to send a reset code. Check your email address."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    if (!isLoaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code });

      if (result.status === "needs_new_password") {
        setStep("reset-password");
      } else if (result.status === "complete") {
        await completeSignIn(result);
      } else {
        // No known next step for this status - without this branch the
        // button just stops loading with zero feedback, which reads as a
        // broken form rather than an actual error.
        console.error("attemptFirstFactor (reset code) did not complete:", result);
        setError(`Something went wrong verifying that code (${result.status}). Please contact support.`);
      }
    } catch (err) {
      setError(errorMessage(err, "That code didn't work. Check it and try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyClientTrust(event) {
    event.preventDefault();
    if (!isLoaded || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptSecondFactor({ strategy: "email_code", code });

      if (result.status === "complete") {
        await completeSignIn(result);
      } else {
        console.error("attemptSecondFactor (client trust) did not complete:", result);
        setError(`Additional verification is required for this account (${result.status}). Please contact support.`);
      }
    } catch (err) {
      setError(errorMessage(err, "That code didn't work. Check it and try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendClientTrustCode() {
    if (!isLoaded || loading || resendCooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      await signIn.prepareSecondFactor({ strategy: "email_code" });
      startResendCooldown();
    } catch (err) {
      setError(errorMessage(err, "Unable to resend the code. Try again in a moment."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    if (!isLoaded || loading) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.resetPassword({ password: newPassword });

      if (result.status === "complete") {
        await completeSignIn(result);
      } else {
        console.error("resetPassword did not complete:", result);
        setError(`Something went wrong resetting your password (${result.status}). Please contact support.`);
      }
    } catch (err) {
      setError(errorMessage(err, "Unable to reset your password."));
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
        <form ref={formRef} onSubmit={handleSignIn}>
          <StepHeading
            title="Back to the Vault."
            subtitle="Sign in to access your effects, Pro downloads, and CLI authentication."
          />

          <TextField
            id="identifier"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            autoComplete="email"
          />
          <TextField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <div className="mb-6 flex justify-start font-geist-mono">
            <SecondaryButton
              onClick={() => {
                setError(null);
                setStep("forgot-password");
              }}
            >
              Forgot password?
            </SecondaryButton>
          </div>
          
          <SubmitButton loading={loading} formRef={formRef} className="w-fit">Continue to Vault</SubmitButton>

          <p className="mt-6 text-left text-sm text-white/50 font-geist-mono">
            New here?{" "}
            <NextLink href={signUpHref} className="text-[#ff5f00] hover:text-[#ff7a29]">
              Create an account
            </NextLink>
          </p>
        </form>
      )}

      {step === "verify-client-trust" && (
        <form ref={formRef} onSubmit={handleVerifyClientTrust}>
          <StepHeading
            title="Verify this device."
            subtitle={`For your security, enter the code we sent to ${email} to trust this device.`}
          />

          <TextField
            id="client-trust-code"
            label="Verification code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            autoComplete="one-time-code"
          />

          <div className="mb-6">
            <SubmitButton loading={loading} formRef={formRef} className="w-fit">Verify device</SubmitButton>
          </div>

          <div className="flex items-center justify-between text-sm">
            <SecondaryButton onClick={backToStart}>Go back</SecondaryButton>
            {resendCooldown > 0 ? (
              <span className="text-white/30">Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendClientTrustCode}
                className="text-[#ff5f00] hover:text-[#ff7a29]"
              >
                Resend code
              </button>
            )}
          </div>
        </form>
      )}

      {step === "forgot-password" && (
        <form ref={formRef} onSubmit={handleSendResetCode}>
          <StepHeading
            title="Forgot your password?"
            subtitle="We'll send a verification code to your email."
          />

          <TextField
            id="reset-identifier"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <div className="mb-6">
            <SubmitButton loading={loading} formRef={formRef} className="w-fit">
              Send reset code
            </SubmitButton>
          </div>

          <div className="text-left">
            <SecondaryButton onClick={backToStart}>Go back</SecondaryButton>
          </div>
        </form>
      )}

      {step === "verify-reset-code" && (
        <form ref={formRef} onSubmit={handleVerifyCode}>
          <StepHeading title="Check your email." subtitle={`Enter the code we sent to ${email} to reset your password.`} />

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
            <SubmitButton loading={loading} formRef={formRef} className={"w-fit"}>Verify code</SubmitButton>
          </div>

          <div className="flex items-center justify-between text-sm">
            <SecondaryButton onClick={() => setStep("forgot-password")}>Go back</SecondaryButton>
            {resendCooldown > 0 ? (
              <span className="text-white/30">Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleSendResetCode}
                className="text-[#ff5f00] hover:text-[#ff7a29]"
              >
                Resend code
              </button>
            )}
          </div>
        </form>
      )}

      {step === "reset-password" && (
        <form ref={formRef} onSubmit={handleResetPassword}>
          <StepHeading title="Set a new password." subtitle="Choose a strong password for your account." />

          <TextField
            id="new-password"
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Create a new password"
            autoComplete="new-password"
          />
          <TextField
            id="confirm-password"
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
          />

          <SubmitButton loading={loading} formRef={formRef} className={"w-fit"}>Reset password</SubmitButton>
        </form>
      )}
    </SplitAuthLayout>
  );
}
