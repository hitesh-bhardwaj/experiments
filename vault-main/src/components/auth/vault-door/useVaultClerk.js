"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { errorMessage, isSessionExistsError } from "@/components/auth/AuthFormPrimitives";
import { SSO_CALLBACK_URL } from "./constants";
import { splitName } from "./utils";

// Clerk's classic custom-flow API. Imported from `/legacy`: plain
// `@clerk/nextjs` now returns the Signals shape with no isLoaded/setActive.
//
// Every action resolves to an outcome the door UI acts on:
//   { type: "next" }                      advance to the pane's next step
//   { type: "add-step", field }           append a step (device trust code)
//   { type: "complete", sessionId }       open the door, then activate
//   { type: "session-exists" }            already signed in, just redirect
//   { type: "error", message, error }     show on the step that owns it

function failure(err, fallback) {
  if (isSessionExistsError(err)) return { type: "session-exists" };
  return { type: "error", message: errorMessage(err, fallback), error: err };
}

function unexpected(label, result, message) {
  console.error(`${label} did not complete:`, result);
  return { type: "error", message: `${message} (${result.status}). Please contact support.` };
}

export function useVaultClerk({ redirectUrl }) {
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const isLoaded = signInLoaded && signUpLoaded;

  async function signInWithPassword({ email, password }) {
    try {
      const result = await signIn.create({ identifier: email.trim(), password });

      if (result.status === "complete") return { type: "complete", sessionId: result.createdSessionId };

      // Device trust: right password, unfamiliar browser - Clerk wants an email code
      if (result.status === "needs_client_trust") {
        const hasEmailCode = result.supportedSecondFactors?.some((factor) => factor.strategy === "email_code");
        if (!hasEmailCode) return unexpected("needs_client_trust", result, "This device can’t be verified");
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        return { type: "add-step", field: "code" };
      }

      if (result.status === "needs_second_factor") {
        return {
          type: "error",
          message: "This account uses two-factor authentication, which this form doesn’t support yet. Please contact support.",
        };
      }

      return unexpected("signIn.create()", result, "Additional verification is required for this account");
    } catch (err) {
      return failure(err, "Unable to sign in. Check your email and password.");
    }
  }

  async function verifyDevice({ code }) {
    try {
      const result = await signIn.attemptSecondFactor({ strategy: "email_code", code: code.trim() });
      if (result.status === "complete") return { type: "complete", sessionId: result.createdSessionId };
      return unexpected("attemptSecondFactor", result, "Additional verification is required for this account");
    } catch (err) {
      return failure(err, "That code didn’t work. Check it and try again.");
    }
  }

  async function createAccount({ name, email, newPassword }) {
    try {
      const result = await signUp.create({ emailAddress: email.trim(), password: newPassword, ...splitName(name) });

      if (result.status === "complete") return { type: "complete", sessionId: result.createdSessionId };
      if (result.status === "abandoned") return { type: "error", message: "Your sign-up session expired. Please try again." };

      // Every sign-up on this instance needs a verified email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      return { type: "next" };
    } catch (err) {
      return failure(err, "Unable to create your account. Check your details and try again.");
    }
  }

  async function verifyEmail({ code }) {
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete") return { type: "complete", sessionId: result.createdSessionId };
      return unexpected("attemptEmailAddressVerification", result, "Additional verification is required for this account");
    } catch (err) {
      return failure(err, "That code didn’t work. Check it and try again.");
    }
  }

  async function sendResetCode({ email }) {
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() });
      return { type: "next" };
    } catch (err) {
      return failure(err, "Unable to send a reset code. Check your email address.");
    }
  }

  async function verifyResetCode({ code }) {
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code: code.trim() });
      if (result.status === "needs_new_password") return { type: "next" };
      if (result.status === "complete") return { type: "complete", sessionId: result.createdSessionId };
      return unexpected("attemptFirstFactor (reset code)", result, "Something went wrong verifying that code");
    } catch (err) {
      return failure(err, "That code didn’t work. Check it and try again.");
    }
  }

  async function setNewPassword({ newPassword }) {
    try {
      const result = await signIn.resetPassword({ password: newPassword });
      if (result.status === "complete") return { type: "complete", sessionId: result.createdSessionId };
      return unexpected("resetPassword", result, "Something went wrong resetting your password");
    } catch (err) {
      return failure(err, "Unable to reset your password.");
    }
  }

  // Which Clerk call runs when a given step is submitted
  const STEP_ACTIONS = {
    "sign-in": { password: signInWithPassword, code: verifyDevice },
    "sign-up": { newPassword: createAccount, code: verifyEmail },
    reset: { email: sendResetCode, code: verifyResetCode, newPassword: setNewPassword },
  };

  function getStepAction(mode, field) {
    return STEP_ACTIONS[mode]?.[field] ?? null;
  }

  async function resendCode(mode, { email }) {
    try {
      if (mode === "sign-up") await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      else if (mode === "reset") await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() });
      else await signIn.prepareSecondFactor({ strategy: "email_code" });
      return { type: "next" };
    } catch (err) {
      return failure(err, "Unable to resend the code. Try again in a moment.");
    }
  }

  // Redirects away to the provider; Clerk lands back on /sso-callback
  async function startOAuth(mode, strategy) {
    try {
      const resource = mode === "sign-up" ? signUp : signIn;
      await resource.authenticateWithRedirect({ strategy, redirectUrl: SSO_CALLBACK_URL, redirectUrlComplete: redirectUrl });
      return { type: "next" };
    } catch (err) {
      return failure(err, "That sign-in option isn’t available right now.");
    }
  }

  // redirectUrl goes straight into setActive so the provider's fallback can't override it
  async function activate(sessionId, { email, isNewAccount } = {}) {
    await setActive({ session: sessionId, redirectUrl });

    // Referral lead tracking (client-side only, see lib/referral-rocket.js)
    if (isNewAccount) {
      try {
        window.Rocket?.getCampaign?.().addParticipant({ email });
      } catch (referralError) {
        console.error("REFERRAL_ROCKET_ADD_PARTICIPANT_ERROR:", referralError);
      }
    }
  }

  return { isLoaded, getStepAction, resendCode, startOAuth, activate };
}
