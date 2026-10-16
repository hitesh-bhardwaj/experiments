"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CardLink } from "./DashboardUI";
import Button from "@/homepage/components/Button";
import { CopyButtonContent } from "@/components/ui/CodeBlock";
import { Modal } from "@/components/ui/SignInRequiredModal";
import { SlidingSegment } from "@/components/ui/SlidingSegment";
import { PACKAGE_MANAGERS, getPackageManager, getPackageManagerVariants, setPackageManager, subscribePackageManager } from "@/lib/package-manager";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";

// A dark well for a token or a command
const WELL = "flex items-center gap-3 bg-light px-[calc(var(--cvw)*1.2)] py-[calc(var(--cvw)*0.9)] ring-1 ring-inset ring-black/10 max-lg:px-4 max-lg:py-3";

const subscribeNever = () => () => {};

// The example install, in every package manager (the site-wide choice, as in code blocks)
const EXAMPLE = getPackageManagerVariants("npx hyperiux add helix-slider");
const PM_ITEMS = PACKAGE_MANAGERS.map((pm) => ({ id: pm, label: pm }));

function ExampleCommand() {
  const pm = useSyncExternalStore(subscribePackageManager, getPackageManager, () => "npm");
  const command = `HYPERIUX_TOKEN=hpx_your_token ${EXAMPLE[pm]}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the command stays on screen to select by hand
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-small text-black/60">Use it like this:</p>
        <SlidingSegment label="Package manager" items={PM_ITEMS} value={pm} onChange={setPackageManager} itemClassName="w-14" />
      </div>
      <div className={WELL}>
        <code className="type-small min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-code text-ink">{command}</code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Command copied" : "Copy command"}
          className={`type-small inline-flex shrink-0 cursor-pointer items-center gap-1.5 transition-colors duration-300 ${copied ? "text-primary" : "text-black/60 hover:text-primary"}`}
        >
          <CopyButtonContent copied={copied} />
        </button>
      </div>
    </div>
  );
}

export default function CliTokenManager({ plan }) {
  const [token, setToken] = useState("");
  // A new token opens a dialog in the middle of the screen: it's shown only once.
  const [tokenDialog, setTokenDialog] = useState(false);
  // Portals need <body>; false on the server and during hydration.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // The new token is shown once, so it gets its own Copy
  const [copied, setCopied] = useState(false);
  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the token stays on screen to select by hand
    }
  }

  const isPro = plan === "pro";

  // Any signed-in account can generate a token now, not just Pro (see
  // api/cli/token/route.js) - a token's job is proving identity to the
  // CLI/MCP so usage counts against this account's real daily quota
  // (lib/install-limit.js) instead of the anonymous device/IP bucket. Pro
  // effect access is decided separately, per-request, by effect-access.js -
  // unaffected by who can hold a token.
  async function generateToken() {
    if (isLoading) return;

    setIsLoading(true);
    setMessage("");
    setToken("");

    try {
      const response = await fetch("/api/cli/token", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate CLI token.");
      }

      setToken(data.token);
      setMessage(data.message);
      setCopied(false);
      setTokenDialog(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function revokeToken() {
    if (isLoading) return;

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/cli/revoke", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to revoke CLI token.");
      }

      setToken("");
      setMessage(data.message || "CLI token revoked.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section aria-labelledby="cli-token" className="flex flex-col gap-[calc(var(--cvw)*2)] bg-foreground p-[calc(var(--cvw)*1.6)] text-ink ring-1 ring-inset ring-black/10 max-lg:gap-6 max-lg:p-6">
      <div className="flex items-start justify-between gap-[calc(var(--cvw)*3)] max-lg:flex-col max-lg:gap-6">
        <div className="flex w-[70%] flex-col gap-[calc(var(--cvw)*0.6)] max-lg:w-full max-lg:gap-2">
          <h2 id="cli-token" className="type-h2 font-aeonik">CLI token</h2>
          <p className="type-body text-black/60">
            A private token that identifies you to the Hyperiux CLI and MCP, so installs count against your
            account&apos;s daily limit instead of the stricter anonymous one. Keep it secret: anyone with it can
            install under your account, including Pro downloads on a subscription.
          </p>
          <p className="type-small text-black/50">
            {isPro ? (
              "As a subscriber, it also unlocks Pro effect source and your plan’s daily limit (5 a day on Pro, 10 on Pro+)."
            ) : (
              <>
                On the Free plan it raises your daily installs from 1 (anonymous) to 3.{" "}
                <CardLink tone="accent" href="/pricing#plans" onClick={markScrollToPricingCards}>
                  Upgrade to Pro
                </CardLink>{" "}
                for 5 a day (10 on Pro+) and Pro effect downloads.
              </>
            )}
          </p>
        </div>

        {/* phones: stacked, full width */}
        <div className="flex shrink-0 gap-[calc(var(--cvw)*0.6)] max-lg:gap-3 max-md:w-full max-md:flex-col">
          <Button text="Revoke" variant="outline" preventDefault disabled={isLoading} onClick={revokeToken} className="max-md:w-full" />
          <Button text={isLoading ? "Working…" : "Generate Token"} preventDefault disabled={isLoading} onClick={generateToken} className="max-md:w-full" />
        </div>
      </div>

      {token && (
        <div className="flex flex-col gap-2">
          <p className="type-small text-black/60">Copy this token now. It won&apos;t be shown again.</p>
          <div className={WELL}>
            <code className="type-small min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-code text-primary">{token}</code>
            <button
              type="button"
              onClick={copyToken}
              aria-label={copied ? "Token copied" : "Copy token"}
              className={`type-small inline-flex shrink-0 cursor-pointer items-center gap-1.5 transition-colors duration-300 ${copied ? "text-primary" : "text-black/60 hover:text-primary"}`}
            >
              <CopyButtonContent copied={copied} />
            </button>
          </div>
        </div>
      )}

      {mounted &&
        createPortal(
          <Modal open={tokenDialog} onClose={() => setTokenDialog(false)} title="Copy this token now">
            It won&apos;t be shown again. Keep it somewhere safe, like your password manager or your project&apos;s .env file.
            <div className="flex w-full items-center gap-3 bg-foreground/5 px-4 py-3 ring-1 ring-inset ring-foreground/15">
              <code className="type-small min-w-0 flex-1 break-all text-left font-code text-foreground">{token}</code>
              <button
                type="button"
                onClick={copyToken}
                aria-label={copied ? "Token copied" : "Copy token"}
                className={`type-small inline-flex shrink-0 cursor-pointer items-center gap-1.5 transition-colors duration-300 ${copied ? "text-primary" : "text-foreground/80 hover:text-primary"}`}
              >
                <CopyButtonContent copied={copied} />
              </button>
            </div>
          </Modal>,
          document.body,
        )}

      {message && (
        <p role="status" className="type-small text-black/60">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <ExampleCommand />
        <p className="type-small text-black/60">
          Using an AI editor? Connect Vault over{" "}
          <CardLink tone="accent" href="/docs/mcp">
            MCP
          </CardLink>{" "}
          with the same token.
        </p>
      </div>
    </section>
  );
}
