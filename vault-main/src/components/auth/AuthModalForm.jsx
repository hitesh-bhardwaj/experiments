"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { GitHubIcon, GoogleIcon } from "./vault-door/icons";
import { StepField } from "./vault-door/StepField";
import { StepTrack } from "./vault-door/StepTrack";
import { UnderlineButton } from "./vault-door/UnderlineButton";
import { FOCUS_RING_CLASS, LABEL_CLASS, LEGAL_LINKS, OAUTH_PROVIDERS, PANES, SUBMIT_LABELS } from "./vault-door/constants";
import { useResendCooldown } from "./vault-door/hooks";
import { useVaultClerk } from "./vault-door/useVaultClerk";
import { getClerkErrorField, getStepHint, validateField } from "./vault-door/utils";

const EMPTY_VALUES = { name: "", email: "", password: "", newPassword: "", code: "" };
const OAUTH_ICONS = { oauth_google: GoogleIcon, oauth_github: GitHubIcon };
const NOT_READY = "Still connecting to the vault. Try again in a moment.";
const T13 = "text-[0.85vw] max-lg:text-[1.6vw] max-md:text-[3.4vw]";
const T16 = "text-[1.05vw] max-lg:text-[2vw] max-md:text-[4vw]";
const T32 = "text-[2.2vw] max-lg:text-[4vw] max-md:text-[7.5vw]";

/**
 * The sign-in page's form (components/auth/vault-door) without the door scene, for the
 * sign-in modal: the same steps, fields, Clerk calls, OAuth and copy. Sign in, create
 * account and reset password switch inside the modal instead of changing the page.
 * Once signed in, the session is activated on the current page (`redirectUrl`) and
 * `onDone` closes the modal.
 */
export function AuthModalForm({ redirectUrl = "/", initialMode = "sign-in", intro, onDone }) {
  const router = useRouter();
  const clerk = useVaultClerk({ redirectUrl });
  const { sound } = useInteraction();
  const [resendSeconds, startResendCooldown] = useResendCooldown();

  const [mode, setMode] = useState(initialMode);
  const [steps, setSteps] = useState(PANES[initialMode].steps);
  const [stepIndex, setStepIndex] = useState(0);
  // 1 forward, -1 back: which way the steps slide (StepTrack)
  const [direction, setDirection] = useState(1);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const pane = PANES[mode];
  const field = steps[stepIndex];
  const inputId = `modal-${mode}-${field}`;

  function switchMode(nextMode) {
    if (busy || nextMode === mode) return;
    setMode(nextMode);
    setSteps(PANES[nextMode].steps);
    setStepIndex(0);
    setMessage(null);
    setValues((current) => ({ ...EMPTY_VALUES, name: current.name, email: current.email }));
  }

  function goToStep(index, nextSteps = steps) {
    setDirection(index < stepIndex ? -1 : 1);
    setSteps(nextSteps);
    setStepIndex(index);
    setMessage(null);
  }

  function deny(text) {
    setMessage({ text, tone: "bad" });
    sound?.gameSfx?.("bug");
    document.getElementById(inputId)?.focus();
  }

  function handleChange(value) {
    setValues((current) => ({ ...current, [field]: value }));
    if (message && (message.tone !== "bad" || !validateField(field, value))) setMessage(null);
  }

  function handleRevisit(index) {
    if (busy) return;
    const baseSteps = PANES[mode].steps;
    setValues((current) => ({ ...current, code: "" }));
    goToStep(index, index < baseSteps.length ? baseSteps : steps);
  }

  async function finish(sessionId) {
    setBusy(true);
    try {
      await clerk.activate(sessionId, { email: values.email.trim(), isNewAccount: mode === "sign-up" });
      router.refresh();
      onDone?.({ isNewAccount: mode === "sign-up" });
    } catch (err) {
      console.error("Clerk setActive() failed:", err);
      setBusy(false);
      deny("We couldn’t finish signing you in. Please try again.");
    }
  }

  function handleOutcome(outcome) {
    if (outcome.type === "complete") return finish(outcome.sessionId);
    if (outcome.type === "session-exists") {
      router.refresh();
      return onDone?.();
    }
    if (outcome.type === "error") {
      const target = steps.indexOf(getClerkErrorField(outcome.error, steps, field));
      if (target >= 0 && target < stepIndex) goToStep(target);
      return deny(outcome.message);
    }
    const nextSteps = outcome.type === "add-step" ? [...steps, outcome.field] : steps;
    if (nextSteps[stepIndex + 1] === "code") startResendCooldown();
    goToStep(stepIndex + 1, nextSteps);
    sound?.note?.(stepIndex + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const error = validateField(field, values[field]);
    if (error) return deny(error);

    const action = clerk.getStepAction(mode, field);
    if (!action) {
      sound?.note?.(stepIndex + 1);
      return goToStep(stepIndex + 1);
    }
    if (!clerk.isLoaded) return setMessage({ text: NOT_READY, tone: "info" });

    setBusy(true);
    const outcome = await action(values);
    setBusy(false);
    handleOutcome(outcome);
  }

  async function handleOAuth(strategy) {
    if (busy) return;
    if (!clerk.isLoaded) return setMessage({ text: NOT_READY, tone: "info" });
    setBusy(true);
    // On success the browser leaves for the provider and comes back to this page
    const outcome = await clerk.startOAuth(mode, strategy);
    if (outcome.type === "session-exists") {
      router.refresh();
      return onDone?.();
    }
    if (outcome.type === "error") {
      setBusy(false);
      deny(outcome.message);
    }
  }

  async function handleResend() {
    if (busy || resendSeconds > 0) return;
    setBusy(true);
    const outcome = await clerk.resendCode(mode, values);
    setBusy(false);
    if (outcome.type === "error") return deny(outcome.message);
    startResendCooldown();
    setMessage({ text: `New code sent to ${values.email.trim()}.`, tone: "info" });
  }

  const fieldMessage = message ?? getStepHint(mode, field, values[field], values.email);
  const modeLink = (nextMode, label) => (
    <UnderlineButton onClick={() => switchMode(nextMode)} disabled={busy}>
      {label}
    </UnderlineButton>
  );

  return (
    <form key={mode} noValidate onSubmit={handleSubmit} className="home-type grid grid-cols-[minmax(0,1fr)] text-left font-avenir">

      <h2 className={`${T32} mb-[0.6vw] font-aeonik leading-[1.1] text-[#F4F4F4] max-lg:mb-2`}>
        {pane.lead} <span className="gradient-text-animate">{pane.accent}</span>
      </h2>
      {intro && <p className={`${T16} mb-[2vw] text-white/60 max-lg:mb-6`}>{intro}</p>}

      <StepTrack
        stepIndex={stepIndex}
        total={steps.length}
        direction={direction}
        stepKey={inputId}
        busy={busy}
        onBack={() => handleRevisit(stepIndex - 1)}
      >
        <StepField
          id={inputId}
          field={field}
          value={values[field]}
          message={fieldMessage}
          busy={busy}
          submitLabel={SUBMIT_LABELS[mode]?.[field] ?? "Continue"}
          onChange={handleChange}
        />
        {/* Only on the password step, right under the field (it slides with it) */}
        {mode === "sign-in" && field === "password" && <div className={`${T13} w-fit`}>{modeLink("reset", "Forgot password?")}</div>}
      </StepTrack>

      {field === "code" && (
        <p className={`${T16} flex items-baseline gap-2 text-light-grey`}>
          Didn’t get it?
          {resendSeconds > 0 ? (
            <span className="text-white/30">Resend in {resendSeconds}s</span>
          ) : (
            <UnderlineButton onClick={handleResend}>Resend code</UnderlineButton>
          )}
        </p>
      )}

      {mode === "sign-up" && field === "newPassword" && (
        <p className={`${LABEL_CLASS} mt-[0.4vw] text-white/40 max-lg:mt-1.5`}>
          By continuing you agree to the{" "}
          <Link href={LEGAL_LINKS.terms} className="text-white/70 underline underline-offset-3 transition-colors duration-300 hover:text-primary">
            Terms
          </Link>{" "}
          and{" "}
          <Link href={LEGAL_LINKS.privacy} className="text-white/70 underline underline-offset-3 transition-colors duration-300 hover:text-primary">
            Privacy Policy
          </Link>
          .
        </p>
      )}

      {/* Clerk mounts its bot-protection challenge here during sign-up */}
      {mode === "sign-up" && <div id="clerk-captcha" />}

      {mode !== "reset" && (
        <div className="mt-[1.6vw] grid gap-[0.8vw] max-lg:mt-6 max-lg:gap-3">
          <p className={`${LABEL_CLASS} flex items-center gap-[1vw] text-white/40 after:h-px after:flex-1 after:bg-white/10 after:content-[''] max-lg:gap-3`}>
            or continue with
          </p>
          <div className="grid grid-cols-2 gap-[0.8vw] max-lg:gap-3">
            {OAUTH_PROVIDERS.map(({ strategy, label }) => {
              const Icon = OAUTH_ICONS[strategy];
              return (
                <button
                  key={strategy}
                  type="button"
                  onClick={() => handleOAuth(strategy)}
                  disabled={busy}
                  className={`${T16} flex cursor-pointer items-center justify-center gap-[0.7vw] border border-white/20 bg-black/30 px-[1.2vw] py-[0.75vw] text-white transition-colors duration-300 hover:border-white/60 hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50 max-lg:gap-2.5 max-lg:px-4 max-lg:py-3 ${FOCUS_RING_CLASS}`}
                >
                  <Icon className="size-[1.1vw] shrink-0 max-lg:size-5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`${T13} mt-[1.4vw] flex flex-wrap items-baseline gap-x-[0.6vw] gap-y-1 text-light-grey max-lg:mt-5 max-lg:gap-x-2`}>
        {mode === "sign-in" && (
          <>
            New to Vault? {modeLink("sign-up", "Create an account")}
          </>
        )}
        {mode === "sign-up" && <>Already have an account? {modeLink("sign-in", "Sign in")}</>}
        {mode === "reset" && modeLink("sign-in", "Back to sign in")}
      </div>
    </form>
  );
}
