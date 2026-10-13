"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import CliTokenManager from "@/components/Dashboard/CliTokenManager";
import Button from "@/homepage/components/Button";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";
import { getDashboardPreview, sampleDashboard } from "@/lib/dev/dashboardPreview";

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

// The dashboard's card surface
const CARD = "flex flex-col bg-foreground text-ink ring-1 ring-inset ring-black/10";

// One figure: label, value, detail. With `href` the whole card links there (an arrow
// shows it, and the ring warms to orange on hover).
function StatCard({ label, value, detail, href, className = "" }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="type-small text-black/60">{label}</p>
        {href && (
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 shrink-0 text-black/40 transition-[color,translate] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
          />
        )}
      </div>
      <p className="type-h3 font-aeonik">{value}</p>
      {detail && <p className="type-small text-black/50">{detail}</p>}
    </>
  );
  const cls = `${CARD} gap-[1vw] p-[1.6vw] max-lg:gap-3 max-lg:p-6 ${className}`;
  if (!href) return <div className={cls}>{body}</div>;
  return (
    <Link href={href} className={`group ${cls} transition-shadow duration-300 hover:ring-primary`}>
      {body}
    </Link>
  );
}

// Card widths for a row of four and a row of three (two up on tablet, one on phones)
const QUARTER = "w-[calc((100%-1.8vw)/4)] max-lg:w-[calc((100%-0.75rem)/2)] max-md:w-full";
const THIRD = "w-[calc((100%-1.2vw)/3)] max-lg:w-[calc((100%-0.75rem)/2)] max-md:w-full";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const justUpgraded = searchParams.get("upgraded") === "true";

  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      // Development preview (lib/dev/dashboardPreview): sample data, no session needed
      const preview = getDashboardPreview();
      if (preview) {
        if (active) setData(sampleDashboard(preview));
        return;
      }
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error(`dashboard ${res.status}`);
        const json = await res.json();
        if (active) setData(json);
      } catch (error) {
        console.error(error);
        if (active) setFailed(true);
      }
    }

    const frame = requestAnimationFrame(() => {
      load();
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [attempt]);

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

  if (failed) {
    return (
      <div className={`${CARD} items-start gap-4 p-[1.6vw] max-lg:p-6`}>
        <p className="type-h3">We couldn’t load your dashboard.</p>
        <p className="type-body text-black/60">Check your connection and try again.</p>
        <Button text="Try again" preventDefault onClick={retry} />
      </div>
    );
  }

  // The layout renders straight away; values show skeletons until /api/dashboard answers.
  if (!data) {
    return (
      <div aria-busy="true" aria-label="Loading your dashboard" className="flex flex-col gap-[0.6vw] max-lg:gap-3">
        <div className="flex flex-wrap gap-[0.6vw] max-lg:gap-3">
          {["Joined", "Plan", "Effects access", "Plan validity"].map((label) => (
            <StatCard key={label} className={QUARTER} label={label} value={<Skeleton className="h-[1em] w-[60%]" />} detail={<Skeleton className="h-[1em] w-[80%]" />} />
          ))}
        </div>
        <div className="flex flex-wrap gap-[0.6vw] max-lg:gap-3">
          <StatCard className={THIRD} label="Saved effects" value={<Skeleton className="h-[1em] w-[15%]" />} detail="Effects in your wishlist" href="/dashboard/saved" />
          <StatCard className={THIRD} label="Copied effects" value={<Skeleton className="h-[1em] w-[15%]" />} detail="Effects copied from the website" href="/dashboard/usage" />
          <StatCard className={THIRD} label="Installed effects" value={<Skeleton className="h-[1em] w-[15%]" />} detail="Effects installed via web, CLI & MCP" href="/dashboard/usage" />
        </div>
        <section className={`${CARD} gap-[0.8vw] p-[1.6vw] max-lg:gap-3 max-lg:p-6`}>
          <h2 className="type-h2 font-aeonik">Vault access</h2>
          <Skeleton className="h-[1em] w-2/3" />
          <Skeleton className="h-[1em] w-1/3" />
          <Skeleton className="h-[1em] w-1/4" />
        </section>
      </div>
    );
  }

  const planLabel = data.plan === "pro" ? (data.tier === "pro" ? "Pro" : "Pro+") : "Free";
  const isPro = data.plan === "pro";
  const credits = `${data.templateCredits} template credit${data.templateCredits === 1 ? "" : "s"}`;
  const proValidityDetail = isPro ? (data.planValidUntil ? `${daysRemaining} days remaining` : "Active subscription") : "Upgrade to unlock validity";

  // The plan's details, one row each
  const planRows = isPro
    ? [
        ["Daily installs (copies, CLI & MCP)", data.dailyInstallLimit ?? "Unlimited"],
        ["Template credits", <Link key="c" href="/templates" className="underline underline-offset-3 transition-colors duration-300 hover:text-primary">{data.templateCredits}</Link>],
        ["Billing cycle", getBillingLabel(data.billingInterval)],
        ["Valid until / renews on", formatDate(data.planValidUntil)],
        ["Status", <span key="s" className="capitalize">{data.subscriptionStatus}</span>],
      ]
    : [];

  return (
    <div className="flex flex-col gap-[0.6vw] max-lg:gap-3">
      {justUpgraded && (
        <p role="status" className="type-body flex items-center gap-3 bg-primary/10 px-[1.6vw] py-[1vw] text-ink ring-1 ring-inset ring-primary/30 max-lg:px-6 max-lg:py-4">
          <span aria-hidden="true" className="size-2 shrink-0 bg-primary" />
          Welcome to {planLabel}. Your account has been upgraded.
        </p>
      )}

      {/* account */}
      <div className="flex flex-wrap gap-[0.6vw] max-lg:gap-3">
        <StatCard className={QUARTER} label="Joined" value={formatDate(data.joinedAt)} detail="Account creation date" />
        <StatCard
          className={QUARTER}
          label="Plan"
          value={planLabel}
          detail={isPro ? `${data.dailyInstallLimit ?? "Unlimited"} installs a day · ${credits}` : "Starter access"}
        />
        <StatCard className={QUARTER} label="Effects access" value={data.totalEffectsAccess} detail={`${data.totalEffectsAccess} of ${data.totalEffects} effects available`} />
        <StatCard className={QUARTER} label={isPro ? "Valid until" : "Plan validity"} value={isPro ? formatDate(data.planValidUntil) : "Free"} detail={proValidityDetail} />
      </div>

      {/* activity: each links to its tab */}
      <div className="flex flex-wrap gap-[0.6vw] max-lg:gap-3">
        <StatCard className={THIRD} label="Saved effects" value={data.savedCount} detail="Effects in your wishlist" href="/dashboard/saved" />
        <StatCard className={THIRD} label="Copied effects" value={data.copiedCount} detail="Effects copied from the website" href="/dashboard/usage" />
        <StatCard className={THIRD} label="Installed effects" value={data.installedCount} detail="Effects installed via web, CLI & MCP" href="/dashboard/usage" />
      </div>

      {/* plan */}
      <section aria-labelledby="vault-access" className={`${CARD} gap-[2vw] p-[1.6vw] max-lg:gap-6 max-lg:p-6`}>
        <div className="flex items-start justify-between gap-[3vw] max-lg:flex-col max-lg:gap-6">
          <div className="flex flex-col gap-[0.6vw] max-lg:gap-2">
            <h2 id="vault-access" className="type-h2 font-aeonik">Vault access</h2>
            <p className="type-body text-black/60">
              {isPro
                ? `Your ${planLabel} access is active, with the full Hyperiux Vault.`
                : `Free accounts include ${data.totalFreeEffects} effects. Upgrade to unlock the full vault.`}
            </p>
          </div>
          {/* phones: stacked, full width */}
          <div className="flex shrink-0 flex-wrap gap-[0.6vw] max-lg:gap-3 max-md:w-full max-md:flex-col">
            {isPro ? (
              <>
                {data.manageSubscriptionUrl && (
                  <Button text="Manage subscription" href={data.manageSubscriptionUrl} target_blank variant="outline" className="max-md:w-full" />
                )}
                <Button text="Explore Pro effects" href="/effects/pro" className="max-md:w-full" />
              </>
            ) : (
              <Button text="Upgrade to Pro" href="/pricing#plans" onClick={markScrollToPricingCards} className="max-md:w-full" />
            )}
          </div>
        </div>

        {planRows.length > 0 && (
          <dl className="flex flex-col">
            {planRows.map(([term, value]) => (
              <div key={term} className="flex items-baseline justify-between gap-4 border-t border-black/10 py-[0.9vw] max-lg:py-3">
                <dt className="type-small text-black/60">{term}</dt>
                <dd className="type-body text-right">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {data.tier === "pro" && (
          <p className="type-small text-black/60">
            Need 10 installs a day and the full template catalogue?{" "}
            <Link href="/pricing#plans" className="text-ink underline underline-offset-3 transition-colors duration-300 hover:text-primary">
              Upgrade to Pro+
            </Link>
          </p>
        )}
      </section>

      <CliTokenManager plan={data.plan} />
    </div>
  );
}
