"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/homepage/components/Button";
import { CopyButtonContent } from "@/components/ui/CodeBlock";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";

// A dark well for a token or a command
const WELL = "flex items-center gap-3 bg-light px-[1.2vw] py-[0.9vw] ring-1 ring-inset ring-black/10 max-lg:px-4 max-lg:py-3";

export default function CliTokenManager({ plan }) {
  const [token, setToken] = useState("");
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
    <section aria-labelledby="cli-token" className="flex flex-col gap-[2vw] bg-foreground p-[1.6vw] text-ink ring-1 ring-inset ring-black/10 max-lg:gap-6 max-lg:p-6">
      <div className="flex items-start justify-between gap-[3vw] max-lg:flex-col max-lg:gap-6">
        <div className="flex w-[70%] flex-col gap-[0.6vw] max-lg:w-full max-lg:gap-2">
          <h2 id="cli-token" className="type-h2 font-aeonik">CLI token</h2>
          <p className="type-body text-black/60">
            A private token that identifies you to the Hyperiux CLI and MCP, so installs count against your
            account&apos;s daily limit instead of the stricter anonymous one. Keep it secret: anyone with it can
            install under your account, including Pro downloads on a subscription.
          </p>
          <p className="type-small text-black/50">
            {isPro ? (
              "As a Pro subscriber, it also unlocks Pro effect source and a 10/day install limit."
            ) : (
              <>
                On the Free plan it raises your daily installs from 1 (anonymous) to 3.{" "}
                <Link
                  href="/pricing#plans"
                  onClick={markScrollToPricingCards}
                  className="text-primary underline-offset-3 hover:underline"
                >
                  Upgrade to Pro
                </Link>{" "}
                for 10/day and Pro effect downloads.
              </>
            )}
          </p>
        </div>

        {/* phones: stacked, full width */}
        <div className="flex shrink-0 gap-[0.6vw] max-lg:gap-3 max-md:w-full max-md:flex-col">
          <Button text="Revoke" variant="outline" preventDefault disabled={isLoading} onClick={revokeToken} className="max-md:w-full" />
          <Button text={isLoading ? "Working…" : "Generate token"} preventDefault disabled={isLoading} onClick={generateToken} className="max-md:w-full" />
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

      {message && (
        <p role="status" className="type-small text-black/60">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <p className="type-small text-black/60">Use it like this:</p>
        <div className={WELL}>
          <code className="type-small min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-code text-ink">
            HYPERIUX_TOKEN=hpx_your_token npx hyperiux add helix-slider
          </code>
        </div>
      </div>
    </section>
  );
}
