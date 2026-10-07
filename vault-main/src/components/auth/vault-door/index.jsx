"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { getSafeRedirectUrl } from "@/components/auth/AuthFormPrimitives";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import { CoreHud } from "./CoreHud";
import { DoneList } from "./DoneList";
import { GitHubIcon, GoogleIcon } from "./icons";
import { StepField } from "./StepField";
import { UnderlineButton } from "./UnderlineButton";
import {
  DEFAULT_REDIRECT,
  FOCUS_RING_CLASS,
  LABEL_CLASS,
  LEGAL_LINKS,
  MODE_PATHS,
  OAUTH_PROVIDERS,
  PANES,
  SUBMIT_LABELS,
} from "./constants";
import { usePrefersReducedMotion, useResendCooldown, useSiteHeaderHeight, useVaultScene } from "./hooks";
import { useVaultClerk } from "./useVaultClerk";
import { getClerkErrorField, getFillEnergy, getStepHint, padStep, validateField } from "./utils";

gsap.registerPlugin(useGSAP);

// Constants
const EMPTY_VALUES = { name: "", email: "", password: "", newPassword: "", code: "" };
const SESSION_ERROR = "We couldn’t finish signing you in. Please try again.";
// Same treatment as the homepage's "Explore" text link
const PANE_LINK_CLASS = "text-white hover:text-primary transition-colors duration-300";
const OAUTH_ICONS = { oauth_google: GoogleIcon, oauth_github: GitHubIcon };
// The form fills its column (the container already sets the width and
// padding); the copyright shares its width so it lines up under the form
const FORM_WIDTH_CLASS = "w-full";

function modeFromPath(pathname) {
  return pathname.startsWith(MODE_PATHS["sign-up"]) ? "sign-up" : "sign-in";
}

// The vault door: sign in, sign up and password reset as one full-screen scene.
// Rendered by the (auth) layout; the URL picks sign-in or sign-up.
export default function VaultDoorAuth({ catalogue }) {
  // Hooks
  const router = useRouter();
  const routeMode = modeFromPath(usePathname());
  const searchParams = useSearchParams();
  const reducedMotion = usePrefersReducedMotion();
  const rawRedirectUrl = searchParams.get("redirect_url");
  const redirectUrl = getSafeRedirectUrl(rawRedirectUrl, DEFAULT_REDIRECT);
  const clerk = useVaultClerk({ redirectUrl });
  const { sound } = useInteraction();
  const { doorCanvasRef, coreCanvasRef, coreLayerRef, tooltipRef, sceneRef, showCore } = useVaultScene({
    effects: catalogue.effects,
    reducedMotion,
    sound,
  });
  const [resendSeconds, startResendCooldown] = useResendCooldown();

  // Refs
  const rootRef = useRef(null);
  const formLayerRef = useRef(null);
  const paneRef = useRef(null);
  const valuesRef = useRef(EMPTY_VALUES);
  const animateStepRef = useRef(false);
  useSiteHeaderHeight(rootRef);

  // State
  const [mode, setMode] = useState(routeMode);
  const [syncedRouteMode, setSyncedRouteMode] = useState(routeMode);
  const [steps, setSteps] = useState(PANES[routeMode].steps);
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);

  // Back/forward between /sign-in and /sign-up switches the pane
  if (routeMode !== syncedRouteMode) {
    setSyncedRouteMode(routeMode);
    resetPane(routeMode);
  }

  const pane = PANES[mode];
  const field = steps[stepIndex];
  const inputId = `${mode}-${field}`;

  // Effects
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    sceneRef.current.core?.setMode(mode);
    document.title = `${pane.title} — Hyperiux Vault`;
  }, [mode, pane.title, sceneRef, showCore]);

  // Charge the seam and the core with progress through the pane
  useEffect(() => {
    const { door, core } = sceneRef.current;
    const energy = getFillEnergy(stepIndex, steps.length, field, values[field]);
    door?.fill(energy);
    core?.energy(energy);
  }, [stepIndex, steps.length, field, values, sceneRef, reducedMotion, showCore]);

  // Animation
  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from(doorCanvasRef.current, { opacity: 0, duration: 1.6 });
      gsap.from("[data-intro]", { opacity: 0, duration: 1.6, delay: 0.4 });
    },
    { scope: rootRef }
  );

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.fromTo(paneRef.current.children, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.06, ease: "expo.out" });
    },
    { dependencies: [mode], scope: rootRef }
  );

  useGSAP(
    () => {
      if (!animateStepRef.current || reducedMotion) return;
      animateStepRef.current = false;
      gsap.fromTo("[data-step]", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, ease: "expo.out" });
      gsap.fromTo("[data-done-item]:last-child", { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" });
    },
    { dependencies: [stepIndex, mode], scope: rootRef }
  );

  // Functions
  function resetPane(nextMode) {
    setMode(nextMode);
    setSteps(PANES[nextMode].steps);
    setStepIndex(0);
    setMessage(null);
    setValues((current) => ({ ...EMPTY_VALUES, name: current.name, email: current.email }));
  }

  function switchMode(event, nextMode) {
    event.preventDefault();
    if (opening || busy || nextMode === mode) return;
    if (MODE_PATHS[nextMode] && routeMode !== nextMode) {
      setSyncedRouteMode(nextMode);
      window.history.pushState(null, "", event.currentTarget.getAttribute("href"));
    }
    resetPane(nextMode);
  }

  function hrefFor(nextMode) {
    const path = MODE_PATHS[nextMode] ?? MODE_PATHS["sign-in"];
    return rawRedirectUrl ? `${path}?redirect_url=${encodeURIComponent(redirectUrl)}` : path;
  }

  function goToStep(index, nextSteps = steps) {
    animateStepRef.current = true;
    setSteps(nextSteps);
    setStepIndex(index);
    setMessage(null);
  }

  function deny(text) {
    const { door, core } = sceneRef.current;
    setMessage({ text, tone: "bad" });
    door?.deny();
    core?.deny();
    sound?.gameSfx("bug");
    document.getElementById(inputId)?.focus();
  }

  function handleKeyDown(event) {
    if (opening) return;
    const { door, core } = sceneRef.current;
    if (event.key.length === 1) {
      door?.key(false);
      core?.pulse();
    } else if (event.key === "Backspace") {
      door?.key(true);
    }
  }

  function handleChange(value) {
    setValues((current) => ({ ...current, [field]: value }));
    if (message && (message.tone !== "bad" || !validateField(field, value))) setMessage(null);
  }

  // "Change" on an answered step; codes are one-time so they never reopen
  function handleRevisit(index) {
    if (busy || opening) return;
    const baseSteps = PANES[mode].steps;
    setValues((current) => ({ ...current, code: "" }));
    goToStep(index, index < baseSteps.length ? baseSteps : steps);
  }

  function handleOutcome(outcome) {
    if (outcome.type === "complete") return openDoor(outcome.sessionId);
    if (outcome.type === "session-exists") return router.push(redirectUrl);

    if (outcome.type === "error") {
      const target = steps.indexOf(getClerkErrorField(outcome.error, steps, field));
      if (target >= 0 && target < stepIndex) goToStep(target);
      return deny(outcome.message);
    }

    const nextSteps = outcome.type === "add-step" ? [...steps, outcome.field] : steps;
    if (nextSteps[stepIndex + 1] === "code") {
      startResendCooldown();
      sound?.gameSfx("power");
    }
    goToStep(stepIndex + 1, nextSteps);
    sound?.note(stepIndex + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy || opening) return;

    const error = validateField(field, values[field]);
    if (error) return deny(error);

    const action = clerk.getStepAction(mode, field);
    if (!action) {
      sound?.note(stepIndex + 1);
      return goToStep(stepIndex + 1);
    }
    if (!clerk.isLoaded) return setMessage({ text: "Still connecting to the vault. Try again in a moment.", tone: "info" });

    setBusy(true);
    const outcome = await action(values);
    setBusy(false);
    handleOutcome(outcome);
  }

  function closeDoor() {
    const { door, core } = sceneRef.current;
    door?.reset();
    core?.reset();
    [formLayerRef, coreLayerRef].forEach((ref) => {
      if (ref.current) ref.current.style.transform = "";
    });
    setOpening(false);
  }

  async function finishSignIn(sessionId) {
    try {
      await clerk.activate(sessionId, { email: valuesRef.current.email.trim(), isNewAccount: mode === "sign-up" });
      router.push(redirectUrl);
    } catch (err) {
      console.error("Clerk setActive() failed:", err);
      closeDoor();
      deny(SESSION_ERROR);
    }
  }

  // Panels slide apart along the seam, then the session is activated
  function openDoor(sessionId) {
    const { door, core } = sceneRef.current;
    setOpening(true);
    router.prefetch(redirectUrl);
    core?.go();

    door.open({
      onFlare: () => sound?.hover(0.8, "primary"),
      onSwing: () => {
        sound?.whoosh();
        sound?.reform();
      },
      onMove: (offset, portrait) => {
        const formShift = portrait ? `translateY(${offset}px)` : `translateX(${-offset}px)`;
        const coreShift = portrait ? `translateY(${-offset}px)` : `translateX(${offset}px)`;
        formLayerRef.current.style.transform = formShift;
        coreLayerRef.current.style.transform = coreShift;
      },
      onComplete: () => finishSignIn(sessionId),
    });
  }

  async function handleOAuth(strategy) {
    if (busy || opening) return;
    if (!clerk.isLoaded) return setMessage({ text: "Still connecting to the vault. Try again in a moment.", tone: "info" });

    setBusy(true);
    // On success the browser leaves for the provider, so busy stays on
    const outcome = await clerk.startOAuth(mode, strategy);
    if (outcome.type === "session-exists") return router.push(redirectUrl);
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

  // Render
  const fieldMessage = message ?? getStepHint(mode, field, values[field], values.email);

  function paneLink(nextMode, label) {
    return (
      <LinkButton
        href={hrefFor(nextMode)}
        text={label}
        tilted={false}
        underlineClassName="mt-0"
        className={PANE_LINK_CLASS}
        data-no-page-transition
        onClick={(event) => switchMode(event, nextMode)}
      />
    );
  }

  return (
    // Full-height section in normal flow, like the homepage sections: a
    // max-1536px container with 3vw inline padding (6vw beside the mobile
    // header), split into two equal columns; top-down in portrait. The
    // header floats over the top, so the columns are padded by its height
    // (--header-h, measured live). The door canvas is a background layer and
    // finds the seam from the column boundary (utils/measureSeam).
    <section
      ref={rootRef}
      className="home-type relative h-dvh overflow-hidden font-avenir text-foreground [--header-h:calc(4vw_+_45px)] max-lg:[--header-h:80px]"
    >
      <canvas ref={doorCanvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block size-full" />

      <div className="mx-auto grid h-full max-w-[1536px] grid-cols-2 px-[3vw] pt-(--header-h) max-lg:px-[6vw] portrait:grid-cols-1 portrait:grid-rows-[30%_1fr] max-lg:portrait:grid-rows-[auto_1fr]">
        <div
          ref={formLayerRef}
          className="relative z-[6] grid min-h-0 grid-rows-[1fr_auto] pr-[10vw] pb-[3vw] will-change-transform max-lg:pb-6 portrait:row-start-2 portrait:overflow-y-auto portrait:pt-[8vw] portrait:pr-0 max-lg:portrait:pt-36 max-md:portrait:pt-[5.3rem]"
        >
        <main className={`${FORM_WIDTH_CLASS} mt-[3vw] self-start portrait:mt-0`}>
          {/* minmax(0,1fr): the no-wrap heading may run past the block without widening the field */}
          <form ref={paneRef} key={mode} noValidate onSubmit={handleSubmit} className="grid grid-cols-[minmax(0,1fr)]">
            <p className={`${LABEL_CLASS} mb-[1.2vw] flex items-baseline gap-[0.8vw] text-white/40 max-lg:mb-4 max-lg:gap-3`}>
              {pane.eyebrow}
              {pane.showCount && (
                <span className="text24 font-aeonik tracking-[-.02em] text-primary" aria-live="polite">
                  {padStep(stepIndex + 1)} / {padStep(steps.length)}
                </span>
              )}
            </p>

            <h1 className="text64 mb-[3.5vw] font-aeonik whitespace-nowrap text-[#F4F4F4] max-lg:mb-10 portrait:mb-9">
              {pane.lead} <span className="gradient-text-animate">{pane.accent}</span>
            </h1>

            <DoneList fields={steps.slice(0, stepIndex)} values={values} onChange={handleRevisit} />

            <fieldset disabled={opening} className="m-0 min-w-0 border-0 p-0">
              <StepField
                key={inputId}
                id={inputId}
                field={field}
                value={values[field]}
                message={fieldMessage}
                busy={busy}
                submitLabel={SUBMIT_LABELS[mode]?.[field] ?? "Continue"}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
            </fieldset>

            {field === "code" && (
              <p className="text18 flex items-baseline gap-2 text-light-grey">
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
              <div className="mt-[2.4vw] grid gap-[1vw] max-lg:mt-8 max-lg:gap-4">
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
                        disabled={busy || opening}
                        className={`text18 flex cursor-pointer items-center justify-center gap-[0.7vw] border border-white/20 bg-black/30 px-[1.2vw] py-[0.85vw] text-white backdrop-blur-lg transition-colors duration-300 hover:border-white/60 hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50 max-lg:gap-2.5 max-lg:px-4 max-lg:py-3 ${FOCUS_RING_CLASS}`}
                      >
                        <Icon className="size-[1.2vw] shrink-0 max-lg:size-5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* div, not p: LinkButton renders block elements */}
            <div className="text18 mt-[1.6vw] flex flex-wrap items-baseline gap-x-[0.6vw] gap-y-1 text-light-grey max-lg:mt-6 max-lg:gap-x-2">
              {mode === "sign-in" && (
                <>
                  New to Vault? {paneLink("sign-up", "Create an account")}
                  <span className="mx-[0.4vw] text-white/20 max-lg:mx-1" aria-hidden="true">·</span>
                  {paneLink("reset", "Forgot password")}
                </>
              )}
              {mode === "sign-up" && (
                <>
                  Already have an account? {paneLink("sign-in", "Sign in")}
                </>
              )}
              {mode === "reset" && paneLink("sign-in", "Back to sign in")}
            </div>
          </form>
        </main>

        <p data-intro className={`${FORM_WIDTH_CLASS} text18 text-light-grey`}>
          © {new Date().getFullYear()} Hyperiux. All rights reserved.
        </p>
        </div>

        <CoreHud
          ref={coreLayerRef}
          canvasRef={coreCanvasRef}
          tooltipRef={tooltipRef}
          mode={mode}
          stats={catalogue.stats}
          effects={catalogue.effects}
          name={values.name}
        />
      </div>
    </section>
  );
}
