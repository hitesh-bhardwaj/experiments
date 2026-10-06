"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import CliTokenManager from "@/components/Dashboard/CliTokenManager";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";

function formatDate(value) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getBillingLabel(value) {
  const labels = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };

  return labels[value] || "Not available";
}

function StatCard({ label, value, detail, href }) {
  const content = (
    <div className="h-full flex flex-col justify-between  p-6 bg-[#272727] backdrop-blur-lg transition duration-300 hover:border-[#ff5f00]">
      <p className="text-white mb-3">{label}</p>

      <p className="text-2xl font-medium font-avenir leading-none">{value}</p>

      {detail && <p className="text-[#838383] mt-4">{detail}</p>}
    </div>
  );

  if (!href) return content;

  return <Link href={href}>{content}</Link>;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const justUpgraded = searchParams.get("upgraded") === "true";

  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch("/api/dashboard");
      const json = await res.json();

      if (active) setData(json);
    }

    const frame = requestAnimationFrame(() => {
      load();
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  const [now, setNow] = useState(null);

  // Date.now() must not run during render - it would differ between the
  // server render and the client, causing a hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);

  const daysRemaining = useMemo(() => {
    if (!data?.planValidUntil || now === null) return null;

    const end = new Date(data.planValidUntil).getTime();

    if (Number.isNaN(end)) return null;

    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }, [data, now]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400">Loading dashboard data...</p>
      </div>
    );
  }

  const planLabel = data.plan === "pro" ? "Pro" : "Free";
  const accessLabel = `${data.totalEffectsAccess}`;

  const proValidityDetail =
    data.plan === "pro"
      ? data.planValidUntil
        ? `${daysRemaining} days remaining`
        : "Active subscription"
      : "Upgrade to unlock validity";

  return (
    <div className="space-y-4">
      {justUpgraded && (
        <div className="border border-green-500/30  px-6 py-4 bg-green-500/10 text-green-400">
          🎉 Welcome to Pro! Your account has been upgraded.
        </div>
      )}

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
        <StatCard
          label="Joined"
          value={formatDate(data.joinedAt)}
          detail="Account creation date"
        />

        <StatCard
          label="Plan"
          value={planLabel}
          detail={data.plan === "pro" ? "Full vault access" : "Starter access"}
        />

        <StatCard
          label="Effects Access"
          value={accessLabel}
          detail={`${data.totalEffectsAccess} of ${data.totalEffects} effects available`}
        />

        <StatCard
          label={data.plan === "pro" ? "Valid Until" : "Plan Validity"}
          value={data.plan === "pro" ? formatDate(data.planValidUntil) : "Free"}
          detail={proValidityDetail}
        />
      </div>

      <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-4">
        <StatCard
          label="Saved Effects"
          value={data.savedCount}
          detail="Effects in your wishlist"
          href="/dashboard/saved"
        />

        <StatCard
          label="Copied Effects"
          value={data.copiedCount}
          detail="Effects copied from the website"
          href="/dashboard/usage"
        />

        <StatCard
          label="Installed Effects"
          value={data.installedCount}
          detail="Effects installed via web, CLI & MCP"
          href="/dashboard/usage"
        />
      </div>

      <div className="  p-6 bg-[#272727]">
        <div className="flex items-start justify-between gap-6 max-[1025px]:flex-col max-[1025px]:items-start">
          <div>

            <h2 className="text-2xl font-semibold">Vault access</h2>

            {data.plan === "pro" ? (
              <div className="mt-6 space-y-4 text-white/50">
                <p className="text-white">
                  Your Pro access is active. You have full access to the
                  Hyperiux Vault.
                </p>
                <p>
                  Billing cycle:{" "}
                  <span className="text-white">
                    {getBillingLabel(data.billingInterval)}
                  </span>
                </p>
                <p>
                  Valid until / renews on:{" "}
                  <span className="text-white">
                    {formatDate(data.planValidUntil)}
                  </span>
                </p>
                <p>
                  Status:{" "}
                  <span className="text-white capitalize">
                    {data.subscriptionStatus}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-white/75 mt-2">
                Free accounts include {data.totalFreeEffects} effects. Upgrade
                to unlock the full vault.
              </p>
            )}
          </div>
          {data.plan === "free" && (
            <>
              <Link
                href="/pricing#pricing-cards"
                onClick={markScrollToPricingCards}
                className="inline-flex px-5 py-3  bg-white text-black transition duration-300 hover:bg-[#ff5f00] hover:text-black"
              >
                Upgrade to Pro
              </Link>

            </>
          )}

          {data.plan === "pro" && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-3 max-md:flex-col">
                {data.manageSubscriptionUrl && (
                  <a
                    href={data.manageSubscriptionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex px-7 py-3  border border-white/20 text-white transition duration-300 hover:bg-white"
                  >
                    Manage Subscription
                  </a>
                )}
                <Link
                  href="/effects/pro"
                  className="inline-flex px-7 py-3  bg-white text-black transition duration-300 hover:bg-[#ff5f00] hover:text-white"
                >
                  Explore Pro Effects
                </Link>
              </div>
            </div>
          )}


        </div>
      </div>
      <CliTokenManager plan={data.plan} />
    </div>
  );
}
