"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, FileCode2, LoaderCircle, LockKeyhole } from "lucide-react";
import { buttonClassName, ButtonChrome } from "@/homepage/components/Button";
import { useCopyLimit } from "./useCopyLimit";
import { getLimitNudge } from "@/lib/limitNudge";
import { AnimatePresence, motion } from "motion/react";

// The trigger's text rolls like the code block's Copy -> Copied label
const ROLL_EASE = [0.65, 0, 0.35, 1];

// "Get code" dropdown beside Live Preview - the only way to take an effect's
// source from its page. JSX/TSX and the AI prompt are fetched from
// /api/effects/[slug]/copy (sign-in + Pro checks there; only JSX/TSX use a
// daily copy slot). The CLI command and MCP prompt carry no source, so
// they're built here and never metered - an install from them is counted
// by the CLI/MCP themselves.
//
// Signed out: the trigger opens the "log in first" modal instead of the
// dropdown. Pro effect without Pro: the panel still opens with every row
// visible but locked, under an overlay with an "Upgrade to Pro" button that
// opens the upgrade modal.
//
// Picking a row closes the panel straight away; the trigger itself then
// reports the copy - spinner + "Copying ...", tick + "... copied", and back
// to "Get Code" after COPIED_HOLD_MS.

const MCP_INSTALLED_KEY = "hyperiux-mcp-installed";
// How long "... copied" stays on the trigger before "Get Code" returns.
const COPIED_HOLD_MS = 1000;
// Local copies (CLI/MCP) finish instantly - hold the spinner this long so
// the "Copying ..." step is actually seen instead of flashing past.
const MIN_COPYING_MS = 450;

// Trigger text for each copy, while it runs and once it's done.
const TRIGGER_LABELS = {
  jsx: { copying: "Copying code", copied: "Code copied" },
  tsx: { copying: "Copying code", copied: "Code copied" },
  cli: { copying: "Copying CLI command", copied: "CLI command copied" },
  mcp: { copying: "Copying MCP prompt", copied: "MCP prompt copied" },
  prompt: { copying: "Copying AI prompt", copied: "AI prompt copied" },
};

function buildMcpPrompt(slug, title) {
  return `Use the Hyperiux MCP to add the "${title}" effect to this project.

Call the hyperiux_get_effect tool with name "${slug}" and include_source: true, install the npm dependencies it lists, and add the file exactly as the MCP returns it - do not recreate or rewrite it from scratch.

If the tool says you need to log in, run \`npx hyperiux login\` in the terminal first, then try again.`;
}

function readMcpInstalled() {
  try {
    return window.localStorage.getItem(MCP_INSTALLED_KEY) === "yes";
  } catch {
    return false;
  }
}

function rememberMcpInstalled() {
  try {
    window.localStorage.setItem(MCP_INSTALLED_KEY, "yes");
  } catch {
    // Storage blocked (private mode etc.) - the question just shows again.
  }
}

// Safari only allows clipboard writes inside the click that triggered them,
// and a server round-trip breaks that. Handing ClipboardItem a *promise* of
// the text keeps the write tied to the click while the fetch is in flight.
async function copyServerText(fetchResult) {
  let result = null;
  const textPromise = fetchResult().then((data) => {
    result = data;
    if (!data.ok) throw new Error("copy-denied");
    return data.content;
  });

  if (typeof window.ClipboardItem === "function" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          "text/plain": textPromise.then((text) => new Blob([text], { type: "text/plain" })),
        }),
      ]);
      return result;
    } catch {
      // Denied by the route (result.ok false), or the browser rejected the
      // promise form - fall through and let the caller read `result`.
      if (result && !result.ok) return result;
    }
  }

  try {
    const text = await textPromise;
    await navigator.clipboard.writeText(text);
  } catch {
    // result already carries the denial reason when there is one
  }
  return result ?? { ok: false, status: 0 };
}

// Nudge shown after a copy that doesn't already report daily usage.
const COPY_TOASTS = {
  cli: { title: "CLI command copied", description: "Paste it into your project's terminal to install the effect." },
  mcp: { title: "MCP prompt copied", description: "Paste it into your agent with the Hyperiux MCP installed." },
  prompt: { title: "AI prompt copied", description: "Paste it into any coding agent to add the effect." },
};

function MenuItem({ children, trailing = null, onSelect, disabled = false, className = "", ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={`group relative isolate flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left type-small leading-snug text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 origin-top scale-y-0 bg-primary transition-transform duration-300 ease-out group-hover:scale-y-100 group-focus-visible:scale-y-100 group-disabled:scale-y-0! motion-reduce:transition-none"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 transition-colors duration-200 group-hover:text-background group-focus-visible:text-background group-disabled:text-foreground!">
        {children}
      </span>
      {trailing && (
        <span className="flex shrink-0 items-center text-foreground/40 transition-colors duration-200 group-hover:text-background group-focus-visible:text-background group-disabled:text-foreground/70!">
          {trailing}
        </span>
      )}
    </button>
  );
}

// End-of-row icon, only on rows the user can't copy from. Copy progress is
// shown on the trigger, not per row.
function LockTrail({ locked = false }) {
  return locked ? <LockKeyhole className="size-4 text-primary" aria-hidden="true" /> : null;
}

// Covers the open panel on a Pro effect for accounts without Pro.
function ProLockOverlay({ onUpgrade }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-dark-card/75 px-6 text-center backdrop-blur-lg">
      <LockKeyhole className="size-5 text-primary" aria-hidden="true" />
      <p className="type-small leading-snug text-foreground/80">
        Pro effect - upgrade to copy or install it.
      </p>
      <div className="contents" onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
        <button
          type="button"
          role="menuitem"
          onClick={onUpgrade}
          className={buttonClassName({
            variant: "orange",
            className: "cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
          })}
        >
          <ButtonChrome label="Upgrade to Pro" hovered={hovered} />
        </button>
      </div>
    </div>
  );
}

export default function GetCodeMenu({
  effectSlug,
  effectTitle,
  isLocked = false,
  // The server already found today's limit used up (and this effect not one
  // of today's) - true before the browser's own usage check has loaded
  serverLimitReached = false,
  // The visitor's plan as the server saw it, for the limit message until usage loads
  lockTier = null,
  align = "right",
  className = "",
  triggerClassName = "",
}) {
  const {
    isLoaded,
    isSignedIn,
    isLocked: isLimitReached,
    applyUsage,
    requireSignIn,
    requireUpgrade,
    showToast,
    lockedCtaHref,
    lockedCtaLabel,
    usage,
  } = useCopyLimit();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("menu"); // "menu" | "mcp"
  // null | { key, phase: "copying" | "copied" } - drives the trigger label.
  const [copyStatus, setCopyStatus] = useState(null);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();
  const title = effectTitle || effectSlug;
  const cliCommand = `npx hyperiux add ${effectSlug}`;

  const statusTimerRef = useRef(null);
  const copyStartedRef = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    setView("menu");
  }, []);

  useEffect(() => () => window.clearTimeout(statusTimerRef.current), []);

  // Close the panel and put the trigger into its "Copying ..." state.
  const startCopy = useCallback(
    (key) => {
      window.clearTimeout(statusTimerRef.current);
      copyStartedRef.current = Date.now();
      close();
      triggerRef.current?.focus();
      setCopyStatus({ key, phase: "copying" });
    },
    [close]
  );

  // Swap to "... copied" (after the minimum spinner time), then back to
  // "Get Code".
  const finishCopy = useCallback((key) => {
    const wait = Math.max(0, MIN_COPYING_MS - (Date.now() - copyStartedRef.current));
    window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => {
      setCopyStatus({ key, phase: "copied" });
      statusTimerRef.current = window.setTimeout(() => setCopyStatus(null), COPIED_HOLD_MS);
    }, wait);
  }, []);

  const failCopy = useCallback(() => {
    window.clearTimeout(statusTimerRef.current);
    setCopyStatus(null);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Focus the first item whenever the panel opens or switches view.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector("[role='menuitem']:not(:disabled)")?.focus();
  }, [open, view]);

  const onPanelKeyDown = (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...(panelRef.current?.querySelectorAll("[role='menuitem']:not(:disabled)") ?? [])];
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(index + step + items.length) % items.length].focus();
  };

  const copyLocalText = async (key, text) => {
    startCopy(key);
    try {
      await navigator.clipboard.writeText(text);
      finishCopy(key);
      showToast(COPY_TOASTS[key]);
    } catch {
      failCopy();
      showToast({ title: "Couldn't copy", description: "Your browser blocked clipboard access." });
    }
  };

  const copyFromServer = async (option) => {
    if (!isLoaded) {
      showToast({ title: "One moment", description: "Still checking your account - try again in a second." });
      return;
    }
    if (!isSignedIn) {
      close();
      requireSignIn();
      return;
    }

    startCopy(option);
    const data = await copyServerText(async () => {
      const response = await fetch(`/api/effects/${effectSlug}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option }),
      });
      const body = await response.json().catch(() => ({}));
      return { ...body, ok: response.ok && Boolean(body.allowed), status: response.status };
    });

    // JSX/TSX responses carry the shared daily usage - keep the count and
    // its toast in sync whether the copy was allowed or hit the limit.
    if (option !== "prompt" && typeof data.limit !== "undefined") applyUsage(data);

    if (!data.ok) failCopy();

    if (data.ok) {
      finishCopy(option);
      // JSX/TSX copies already got the "X of Y left" toast from applyUsage -
      // except for accounts with no daily limit, which get a plain confirm.
      const reportedUsage = option !== "prompt" && typeof data.limit === "number" && !data.isAdmin;
      if (!reportedUsage) {
        showToast(COPY_TOASTS[option] ?? { title: "Copied", description: `${effectSlug}.${option} is on your clipboard.` });
      }
      return;
    }

    if (data.status === 401) {
      close();
      requireSignIn();
    } else if (data.status === 403) {
      requireUpgrade("pro-effect");
    } else if (data.status === 429) {
      // The limit message already showed, from applyUsage
    } else {
      showToast({ title: "Couldn't copy", description: data.error || "Something went wrong. Please try again." });
    }
  };

  const onMcpSelect = () => {
    if (readMcpInstalled()) {
      copyLocalText("mcp", buildMcpPrompt(effectSlug, title));
      return;
    }
    setView("mcp");
  };

  const onTriggerClick = () => {
    if (copyStatus?.phase === "copying") return;
    if (open) {
      close();
      return;
    }
    if (!isLoaded) {
      showToast({ title: "One moment", description: "Still checking your account - try again in a second." });
      return;
    }
    if (!isSignedIn) {
      requireSignIn();
      return;
    }
    // Today's limit is used up (and this effect isn't one of today's): no
    // menu, just the limit message for the visitor's plan
    if ((isLimitReached || serverLimitReached) && !isLocked) {
      const knownUsage = usage ?? {
        plan: lockTier === "pro" || lockTier === "pro_plus" ? "pro" : "free",
        tier: lockTier,
        isAdmin: lockTier === "admin",
      };
      showToast(getLimitNudge(knownUsage));
      return;
    }
    window.clearTimeout(statusTimerRef.current);
    setCopyStatus(null);
    setOpen(true);
  };

  // Pro effect without Pro locks the whole panel; the daily limit only
  // locks the two source files.
  const codeLocked = isLocked;
  const codeLimited = !isLocked && isLimitReached;
  const busy = copyStatus?.phase === "copying";
  const statusLabel = copyStatus ? TRIGGER_LABELS[copyStatus.key]?.[copyStatus.phase] : null;

  return (
    <div ref={rootRef} className={`relative flex shrink-0 self-stretch ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={onTriggerClick}
        // Text size and vertical padding are Button's (buttonClassName), so it sits at the standard
        // button size; an inset ring rather than a border, which would add 2px of height
        className={`relative flex h-full cursor-pointer items-center ring-1 ring-inset bg-foreground/5 backdrop-blur-lg py-2 pr-[3vw] pl-[1.2vw] text-left text-[calc(var(--hx-vw,1vw)*1.15)] ring-foreground/20 tracking-wide text-foreground outline-none transition hover:ring-foreground/25 focus-visible:ring-foreground/25 max-lg:pr-12 max-lg:pl-5 max-lg:text-[clamp(13px,calc(var(--hx-vw,1vw)*1.6),15px)] max-md:py-3 max-md:text-[calc(var(--hx-vw,1vw)*2.2)] max-sm:text-[calc(var(--hx-vw,1vw)*4)] ${triggerClassName}`}
      >
        {/* The label rolls up out of a clipped line, like the code block's copy button */}
        <span className="relative block overflow-hidden whitespace-nowrap">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={statusLabel ?? "Get Code"}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.4, ease: ROLL_EASE }}
              className="block"
            >
              {statusLabel ?? "Get Code"}
            </motion.span>
          </AnimatePresence>
        </span>
        {/* Chevron, spinner and check share the right-hand slot */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-[1vw] grid size-[1.1vw] -translate-y-1/2 place-items-center max-lg:right-4 max-lg:size-4"
        >
          <AnimatePresence initial={false}>
            <motion.span
              key={copyStatus?.phase ?? "idle"}
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3, ease: ROLL_EASE }}
              className="absolute inset-0 grid place-items-center"
            >
              {copyStatus?.phase === "copying" ? (
                <LoaderCircle className="size-full animate-spin text-foreground/60 motion-reduce:animate-none" />
              ) : copyStatus?.phase === "copied" ? (
                <Check className="size-full text-primary" />
              ) : (
                <ChevronDown
                  className={`size-full text-foreground/40 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                />
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {statusLabel ?? ""}
      </span>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={`Get the code for ${title}`}
          onKeyDown={onPanelKeyDown}
          // Phones: the button starts the row at the page gutter, so the panel opens from
          // its left edge across the whole content width (87vw, the stage's width) instead of the button's.
          className={`absolute top-[calc(100%+0.5vw)] z-40 w-[24vw] min-w-72 border border-foreground/10 bg-dark-card p-1.5 shadow-2xl max-lg:w-[55vw] max-md:left-0! max-md:right-auto! max-md:w-[87vw] max-md:min-w-0 ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          {view === "menu" && codeLocked && (
            <ProLockOverlay
              onUpgrade={() => {
                close();
                requireUpgrade("pro-effect");
              }}
            />
          )}
          {view === "menu" ? (
            <div className="space-y-1" aria-hidden={codeLocked || undefined}>
              <div className="flex items-center gap-2 px-3 pt-2 pb-1 type-small text-foreground">
                Copy Code
                {codeLocked && (
                  <span className="inline-flex items-center gap-1 normal-case tracking-normal text-primary">
                    <LockKeyhole className="size-3" aria-hidden="true" /> Pro
                  </span>
                )}
              </div>

              {["jsx", "tsx"].map((option) => (
                <MenuItem
                  key={option}
                  onSelect={() => copyFromServer(option)}
                  disabled={codeLocked || codeLimited || busy}
                  aria-label={`Copy ${effectSlug}.${option}`}
                  className="pl-6"
                  trailing={<LockTrail locked={codeLocked || codeLimited} />}
                >
                  <span className="flex items-center gap-2 font-mono text-[0.92em]">
                    <FileCode2 className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                    {effectSlug}.{option}
                  </span>
                </MenuItem>
              ))}

              <span aria-hidden="true" className="block py-1.5"><span className="block h-px w-full bg-foreground/10" /></span>

              <MenuItem
                onSelect={() => copyLocalText("cli", cliCommand)}
                disabled={codeLocked}
                aria-label="Copy CLI command"
                trailing={<LockTrail locked={codeLocked} />}
              >
                Copy CLI command
                <span className="text-[0.8em] text-foreground/50 group-enabled:group-hover:text-background/70">
                  Install it in the terminal of your preferred IDE
                </span>
              </MenuItem>

              <MenuItem
                onSelect={onMcpSelect}
                disabled={codeLocked}
                aria-label="Copy MCP prompt"
                trailing={<LockTrail locked={codeLocked} />}
              >
                Copy MCP prompt
                <span className="text-[0.8em] text-foreground/50 group-enabled:group-hover:text-background/70">
                  For agents with the Hyperiux MCP installed
                </span>
              </MenuItem>

              <MenuItem
                onSelect={() => copyFromServer("prompt")}
                disabled={codeLocked || busy}
                aria-label="Copy AI prompt"
                trailing={<LockTrail locked={codeLocked} />}
              >
                Copy AI prompt
                <span className="text-[0.8em] text-foreground/50 group-enabled:group-hover:text-background/70">
                  Full source + setup steps for any coding agent
                </span>
              </MenuItem>

              {codeLimited && (
                <div className="flex items-center justify-between gap-3 border-t border-foreground/10 px-3 pt-3 pb-1.5 text-[0.9vw] text-foreground/60 max-lg:text-[1.7vw] max-md:text-[3.4vw]">
                  <span>You&apos;ve reached today&apos;s copy limit.</span>
                  {lockedCtaHref && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        close();
                        requireUpgrade(usage?.tier === "pro" ? "limit-pro" : "limit");
                      }}
                      className="shrink-0 cursor-pointer text-primary underline underline-offset-2 outline-none focus-visible:text-foreground"
                    >
                      {lockedCtaLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              <p className="px-2 pb-2 type-small leading-snug text-foreground">
                Is the Hyperiux MCP installed in your project?
              </p>
              <MenuItem
                onSelect={() => {
                  rememberMcpInstalled();
                  copyLocalText("mcp", buildMcpPrompt(effectSlug, title));
                }}
              >
                Yes, copy the prompt
              </MenuItem>
              <Link
                href="/docs/mcp"
                role="menuitem"
                onClick={close}
                className="group relative isolate flex w-full items-center px-4 py-2.5 type-small text-foreground outline-none"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 origin-top scale-y-0 bg-primary transition-transform duration-300 ease-out group-hover:scale-y-100 group-focus-visible:scale-y-100 motion-reduce:transition-none"
                />
                <span className="transition-colors duration-200 group-hover:text-background group-focus-visible:text-background">
                  No, show me how to install it
                </span>
              </Link>
              <MenuItem onSelect={() => setView("menu")} className="text-foreground/60">
                Back
              </MenuItem>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
