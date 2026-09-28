"use client";

import { useState } from "react";
import Link from "next/link";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";

export default function CliTokenManager({ plan }) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    <div className=" bg-[#272727] p-6 backdrop-blur-lg">
      <div className="flex items-start justify-between gap-6 max-[1025px]:flex-col">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            CLI Token
          </h2>

          <p className="mt-6 max-w-2xl">
            Generate a private token to identify yourself to the Hyperiux CLI
            and MCP - logging in like this is now required to have your daily
            install limit tracked correctly, instead of falling back to a
            stricter anonymous limit. Keep it secret: anyone with this token
            can install under your account, including Pro downloads if you
            have a subscription.
          </p>

          <p className="mt-4 text-sm text-white/50">
            {isPro
              ? "As a Pro subscriber, this token also unlocks Pro effect source and a 10/day install limit."
              : (
                <>
                  On the Free plan this raises your daily install limit from 1
                  (anonymous) to 3.{" "}
                  <Link
                    href="/pricing#pricing-cards"
                    onClick={markScrollToPricingCards}
                    className="text-[#ff5f00] hover:underline"
                  >
                    Upgrade to Pro
                  </Link>{" "}
                  for 10/day and Pro effect downloads.
                </>
              )}
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={revokeToken}
            disabled={isLoading}
            className=" border border-white/20 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40 duration-300"
          >
            Revoke
          </button>
          <button
            type="button"
            onClick={generateToken}
            disabled={isLoading}
            className=" bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-[#ff5f00]  disabled:cursor-not-allowed disabled:opacity-40 duration-300"
          >
            {isLoading ? "Working..." : "Generate Token"}
          </button>
        </div>
      </div>

      {token && (
        <div className="mt-6  bg-[#0E0E0E] p-4">
          <p className="mb-2 text-sm text-white/50">
            Copy this token now. It will not be shown again.
          </p>

          <code className="block overflow-x-auto whitespace-nowrap px-4 py-3 text-sm text-[#ff5f00]">
            {token}
          </code>
        </div>
      )}

      {message && (
        <p className="mt-4 text-sm text-white/60">
          {message}
        </p>
      )}

      <div className="mt-6  bg-[#0E0E0E] p-4">
        <p className="mb-4 text-sm text-white/50">
          Use it like this:
        </p>

        <code className="block overflow-x-auto whitespace-nowrap text-sm text-white">
          HYPERIUX_TOKEN=hpx_your_token npx hyperiux add helix-slider
        </code>
      </div>
    </div>
  );
}