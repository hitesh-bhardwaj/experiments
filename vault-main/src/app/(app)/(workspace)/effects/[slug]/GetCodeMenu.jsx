"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, FileCode2, LoaderCircle, LockKeyhole } from "lucide-react";
import { buttonV3ClassName, ButtonV3Chrome } from "@/homepage-v3/components/ButtonV3";
import { useCopyLimit } from "./useCopyLimit";

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
      className={`group relative isolate flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-[0.95vw] leading-snug text-foreground outline-none max-[1025px]:text-[1.9vw] max-md:text-[3.8vw] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#ff5f00] transition-transform duration-300 ease-out group-hover:scale-y-100 group-focus-visible:scale-y-100 group-disabled:scale-y-0! motion-reduce:transition-none"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 transition-colors duration-200 group-hover:text-[#111111] group-focus-visible:text-[#111111] group-disabled:text-foreground!">
        {children}
      </span>
      {trailing && (
        <span className="flex shrink-0 items-center text-white/40 transition-colors duration-200 group-hover:text-[#111111] group-focus-visible:text-[#111111] group-disabled:text-white/70!">
          {trailing}
        </span>
      )}
    </button>
  );
}

// End-of-row icon, only on rows the user can't copy from. Copy progress is
// shown on the trigger, not per row.
function LockTrail({ locked = false }) {
  return locked ? <LockKeyhole className="size-4 text-[#ff5f00]" aria-hidden="true" /> : null;
}

// Covers the open panel on a Pro effect for accounts without Pro.
function ProLockOverlay({ onUpgrade }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#1a1a1a]/75 px-6 text-center backdrop-blur-[3px]">
      <LockKeyhole className="size-5 text-[#ff5f00]" aria-hidden="true" />
      <p className="text-[0.95vw] leading-snug text-white/80 max-[1025px]:text-[1.9vw] max-md:text-[3.8vw]">
        Pro effect - upgrade to copy or install it.
      </p>
      <div className="contents" onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
        <button
          type="button"
          role="menuitem"
          onClick={onUpgrade}
          className={buttonV3ClassName({
            variant: "orange",
            className: "cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          })}
        >
          <ButtonV3Chrome label="Upgrade to Pro" hovered={hovered} />
        </button>
      </div>
    </div>
  );
}

export default function GetCodeMenu({
  effectSlug,
  effectTitle,
  isLocked = false,
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
  } = useCopyLimit();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("menu"); // "menu" | "mcp"
  // null | { key, phase: "copying" | "copied" } - drives the trigger label.
  const [copyStatus, setCopyStatus] = useState(null);
  // Set after the first copy, so "Get Code" only fades back in after one.
  const [hasCopied, setHasCopied] = useState(false);
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
      setHasCopied(true);
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
      // Free accounts out of copies get the upgrade offer; Pro accounts
      // already saw the "limit reached" toast from applyUsage.
      if (data.plan !== "pro") requireUpgrade("limit");
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
  // Each trigger state fades in as it mounts (`starting:` = @starting-style).
  const fadeIn = "transition-opacity duration-300 ease-out starting:opacity-0 motion-reduce:transition-none";

  return (
    <div ref={rootRef} className={`relative flex shrink-0 self-stretch ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={onTriggerClick}
        className={`relative flex h-full cursor-pointer items-center border bg-white/5 backdrop-blur-lg py-2.75 pr-[3vw] pl-[1.2vw] text-left text-[1.1vw] border-white/20 tracking-wide text-white outline-none transition hover:border-white/25 focus-visible:border-white/25 max-[1025px]:py-3.75 max-[1025px]:pr-12 max-[1025px]:pl-5 max-[1025px]:text-[2vw] max-md:text-[4vw] ${triggerClassName}`}
      >
        {statusLabel ? (
          <span key={`${copyStatus.key}-${copyStatus.phase}`} className={`flex items-center gap-2 whitespace-nowrap ${fadeIn}`}>
            {copyStatus.phase === "copying" ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-[1.1vw] shrink-0 animate-spin text-white/60 max-[1025px]:size-4 motion-reduce:animate-none"
              />
            ) : (
              <Check aria-hidden="true" className="size-[1.1vw] shrink-0 text-[#ff5f00] max-[1025px]:size-4" />
            )}
            {statusLabel}
          </span>
        ) : (
          <span key="idle" className={hasCopied ? fadeIn : ""}>
            Get Code
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 right-[1vw] size-[1.1vw] -translate-y-1/2 text-white/40 transition-[transform,opacity] duration-300 max-[1025px]:right-4 max-[1025px]:size-4 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          } ${statusLabel ? "opacity-0" : "opacity-100"}`}
        />
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
          className={`absolute top-full z-40 mt-2 w-[24vw] min-w-72 border border-white/10 bg-[#1a1a1a] p-1.5 shadow-2xl max-[1025px]:w-[55vw] max-md:w-full max-md:min-w-0 ${
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
              <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-[0.95vw] text-white max-[1025px]:text-[1.6vw] max-md:text-[3.2vw]">
                Copy Code
                {codeLocked && (
                  <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[#ff5f00]">
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

              <span aria-hidden="true" className="my-1.5 block h-px w-full bg-white/10" />

              <MenuItem
                onSelect={() => copyLocalText("cli", cliCommand)}
                disabled={codeLocked}
                aria-label="Copy CLI command"
                trailing={<LockTrail locked={codeLocked} />}
              >
                Copy CLI command
                <span className="text-[0.8em] text-white/50 group-enabled:group-hover:text-[#111111]/70">
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
                <span className="text-[0.8em] text-white/50 group-enabled:group-hover:text-[#111111]/70">
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
                <span className="text-[0.8em] text-white/50 group-enabled:group-hover:text-[#111111]/70">
                  Full source + setup steps for any coding agent
                </span>
              </MenuItem>

              {codeLimited && (
                <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-white/10 px-3 pt-3 pb-1.5 text-[0.85vw] text-white/60 max-[1025px]:text-[1.7vw] max-md:text-[3.4vw]">
                  <span>You&apos;ve reached today&apos;s copy limit.</span>
                  {lockedCtaHref && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        close();
                        requireUpgrade("limit");
                      }}
                      className="shrink-0 cursor-pointer text-[#ff5f00] underline underline-offset-2 outline-none focus-visible:text-white"
                    >
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              <p className="px-2 pb-2 text-[0.95vw] leading-snug text-foreground max-[1025px]:text-[1.9vw] max-md:text-[3.8vw]">
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
                className="group relative isolate flex w-full items-center px-4 py-2.5 text-[0.95vw] text-foreground outline-none max-[1025px]:text-[1.9vw] max-md:text-[3.8vw]"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#ff5f00] transition-transform duration-300 ease-out group-hover:scale-y-100 group-focus-visible:scale-y-100 motion-reduce:transition-none"
                />
                <span className="transition-colors duration-200 group-hover:text-[#111111] group-focus-visible:text-[#111111]">
                  No, show me how to install it
                </span>
              </Link>
              <MenuItem onSelect={() => setView("menu")} className="text-white/60">
                Back
              </MenuItem>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
