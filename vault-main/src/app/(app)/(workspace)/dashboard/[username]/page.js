"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import CliTokenManager from "@/components/Dashboard/CliTokenManager";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { CARD, CARD_PAD, CardLink, SourceChip } from "@/components/Dashboard/DashboardUI";
import { Bar, ButtonBar, SkeletonCard, useAccountHint } from "@/components/Dashboard/DashboardSkeletons";
import { useDashboardData } from "@/components/Dashboard/useDashboardData";
import Button from "@/homepage/components/Button";
import { TierBadge, effectCategoryLabel, resolveCover } from "@/app/(app)/(workspace)/effects/EffectCard";
import { getEffectHref } from "@/lib/categories";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";
import { getDashboardPreview, sampleDashboard } from "@/lib/dev/dashboardPreview";
import { getCreditsPerYear } from "@/lib/plans";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const INTERVAL_LABEL = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function timeAgo(value, now) {
  const minutes = Math.max(0, Math.round((now - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

// The daily limit resets at midnight UTC (install_unlocks counts UTC days)
function untilReset(now) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const minutes = Math.ceil((next - now) / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// The label and arrow at the top of a stat card
function CardTop({ label, dark = false }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className={`type-label ${dark ? "text-foreground/80" : "text-black/60"}`}>{label}</p>
      <ArrowUpRight aria-hidden="true" className={`size-4 shrink-0 transition-[color,translate] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary ${dark ? "text-foreground/80" : "text-black/40"}`} />
    </div>
  );
}

// A stat card linking to its tab, spread top to bottom: label, the number in the
// middle, the caption at the foot
function StatCard({ label, href, value, detail, className = "" }) {
  return (
    <Link href={href} className={`group ${CARD} ${CARD_PAD} justify-between gap-[calc(var(--cvw)*1.2)] transition-shadow duration-300 hover:ring-primary max-lg:gap-4 ${className}`}>
      <CardTop label={label} />
      <p className="type-h1">{value}</p>
      <p className="type-small text-black/60">{detail}</p>
    </Link>
  );
}

// Loading: every card in its own shape, in the account's layout - the plan and credits
// cards only for plans (not admins), the period bar only on Pro, credit coins only when
// the plan earns credits
const ROW = "flex gap-[calc(var(--cvw)*0.8)] max-lg:gap-3";

function OverviewSkeleton() {
  const { isAdmin, plan, tier, billingInterval } = useAccountHint();
  const isPro = plan === "pro";
  const coins = isPro ? getCreditsPerYear(tier, billingInterval) : 0;
  return (
    <div aria-busy="true" aria-label="Loading your dashboard" className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {!isAdmin && (
        <div className={`${ROW} max-lg:flex-col`}>
          <SkeletonCard dark className="w-1/2 justify-between gap-[calc(var(--cvw)*2)] max-lg:w-full max-lg:gap-6">
            <div className="flex flex-col gap-(--cvw) max-lg:gap-4">
              <div className="flex flex-col gap-2">
                <Bar type="type-label" className="w-20" />
                <Bar type="type-h2" className="w-[45%]" />
              </div>
              <div className="flex w-[80%] flex-col gap-1 max-lg:w-full">
                <Bar type="type-body" className="w-full" />
                <Bar type="type-body" className="w-[60%]" />
              </div>
            </div>
            {isPro && (
              <div className="flex flex-col gap-2">
                <Bar className="h-1 w-full" />
                <div className="flex justify-between gap-4">
                  <Bar type="type-small" className="w-28" />
                  <Bar type="type-small" className="w-44" />
                </div>
              </div>
            )}
            <ButtonBar className="w-36" />
          </SkeletonCard>
          <SkeletonCard className="flex-1 gap-(--cvw) max-lg:gap-4">
            <Bar type="type-label" className="w-32" />
            {coins > 0 && (
              <div className="flex gap-2">
                {Array.from({ length: coins }, (_, i) => (
                  <Bar key={i} className="size-[calc(var(--cvw)*2.6)] max-lg:size-10" />
                ))}
              </div>
            )}
            <Bar type="type-h3" className="w-[55%]" />
            <div className="flex flex-col gap-1">
              <Bar type="type-small" className="w-full" />
              <Bar type="type-small" className="w-[70%]" />
            </div>
            <Bar type="type-label" className="mt-auto w-28" />
          </SkeletonCard>
        </div>
      )}

      <div className={`${ROW} max-md:flex-col max-lg:flex-wrap`}>
        <SkeletonCard dark className="w-[25%] justify-between gap-[calc(var(--cvw)*1.2)] max-lg:w-[calc((100%-0.75rem)/2)] max-lg:gap-4 max-md:w-full">
          <Bar type="type-label" className="w-24" />
          <Bar type="type-h2" className="w-[60%]" />
          <div className="flex flex-col gap-1">
            <Bar type="type-small" className="w-full" />
            <Bar type="type-small" className="w-[65%]" />
          </div>
        </SkeletonCard>
        <SkeletonCard className="flex-1 justify-between gap-[calc(var(--cvw)*1.2)] max-lg:order-last max-lg:w-full max-lg:flex-none max-lg:gap-4">
          <Bar type="type-label" className="w-28" />
          <div className="flex flex-1 gap-[calc(var(--cvw)*1.6)] max-md:gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex flex-1 flex-col justify-between gap-[calc(var(--cvw)*0.8)] max-lg:gap-3 ${i ? "border-l border-black/10 pl-[calc(var(--cvw)*1.6)] max-md:pl-4" : ""}`}>
                <Bar type="type-h1" className="w-[45%]" />
                <Bar type="type-small" className="w-12" />
                <Bar type="type-small" className="w-[80%]" />
              </div>
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard className="w-[25%] justify-between gap-[calc(var(--cvw)*1.2)] max-lg:w-[calc((100%-0.75rem)/2)] max-lg:gap-4 max-md:w-full">
          <Bar type="type-label" className="w-16" />
          <Bar type="type-h1" className="w-[35%]" />
          <Bar type="type-small" className="w-[75%]" />
        </SkeletonCard>
      </div>

      {/* the CLI token card */}
      <SkeletonCard className="gap-[calc(var(--cvw)*2)] max-lg:gap-6">
        <div className="flex items-start justify-between gap-[calc(var(--cvw)*3)] max-lg:flex-col max-lg:gap-6">
          <div className="flex w-[70%] flex-col gap-[calc(var(--cvw)*0.6)] max-lg:w-full max-lg:gap-2">
            <Bar type="type-h2" className="w-48" />
            <Bar type="type-body" className="w-full" />
            <Bar type="type-body" className="w-[85%]" />
            <Bar type="type-small" className="w-[60%]" />
          </div>
          <div className="flex shrink-0 gap-[calc(var(--cvw)*0.6)] max-lg:gap-3">
            <ButtonBar className="w-24" />
            <ButtonBar className="w-36" />
          </div>
        </div>
        <Bar className="h-[calc(var(--cvw)*3.4)] w-full max-lg:h-12" />
      </SkeletonCard>

      <div className={`${ROW} max-lg:flex-col`}>
        <SkeletonCard className="w-[63%] gap-(--cvw) max-lg:w-full max-lg:gap-4">
          <div className="flex justify-between gap-4">
            <Bar type="type-h3" className="w-40" />
            <Bar type="type-label" className="w-20" />
          </div>
          <div className="flex flex-col">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 border-t border-black/10 py-[calc(var(--cvw)*0.8)] first:border-t-0 max-lg:py-3">
                <Bar type="type-small" className="w-12" />
                <Bar type="type-body" className="w-[45%]" />
                <Bar type="type-small" className="ml-auto w-14" />
              </div>
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard className="flex-1 gap-(--cvw) max-lg:gap-4">
          <div className="flex justify-between gap-4">
            <Bar type="type-h3" className="w-36" />
            <Bar type="type-label" className="w-20" />
          </div>
          <div className="flex flex-col">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-(--cvw) border-t border-black/10 py-[calc(var(--cvw)*0.6)] first:border-t-0 first:pt-0 max-lg:gap-4 max-lg:py-3">
                <Bar className="aspect-[16/8.6] w-[38%] shrink-0 max-md:w-[42%]" />
                <div className="flex flex-1 flex-col gap-1">
                  <Bar type="type-body" className="w-[80%]" />
                  <Bar type="type-small" className="w-[55%]" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  );
}

function SectionHead({ title, href, label }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="type-h3">{title}</h2>
      <CardLink href={href}>{label}</CardLink>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const { path, effectBySlug, isAdmin, username } = useDashboard();
  const searchParams = useSearchParams();
  const justUpgraded = searchParams.get("upgraded") === "true";

  // Cached across tabs: the skeleton shows on the first load only; then it refreshes
  // quietly (copies, saves, focus, every 30s)
  const { data, failed, retry } = useDashboardData(
    `overview:${username}`,
    async () => {
      // Development preview (lib/dev/dashboardPreview): sample data, no session needed
      const preview = getDashboardPreview();
      if (preview) return sampleDashboard(preview);
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`dashboard ${res.status}`);
      return res.json();
    },
    { pollMs: 30000 },
  );

  // Date.now() must not run during render: it differs between server and browser.
  const [now, setNow] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (failed) {
    return (
      <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
        <p className="type-h3">We couldn’t load your dashboard.</p>
        <p className="type-body text-black/60">Check your connection and try again.</p>
        <Button text="Try again" preventDefault onClick={retry} />
      </div>
    );
  }

  if (!data) return <OverviewSkeleton />;

  const isPro = data.plan === "pro";
  const planName = isPro ? (data.tier === "pro_plus" ? "Pro+" : "Pro") : "Free";
  const interval = INTERVAL_LABEL[data.billingInterval];
  const limit = data.dailyInstallLimit ?? null;

  // The current period: it ends at planValidUntil and began one billing interval before
  const end = data.planValidUntil ? new Date(data.planValidUntil) : null;
  const start = end && PERIOD_MONTHS[data.billingInterval] ? new Date(end) : null;
  if (start) start.setMonth(start.getMonth() - PERIOD_MONTHS[data.billingInterval]);
  const daysLeft = end && now ? Math.max(0, Math.ceil((end - now) / DAY_MS)) : null;
  const elapsed = start && end && now ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0;
  // A cancelled plan keeps its access until the period ends, then doesn't renew
  const cancelled = data.subscriptionStatus === "cancelled" || Boolean(data.cancelAtPeriodEnd);

  const savedCard = <StatCard label="Saved" href={path("saved")} value={data.savedCount} detail="Effects in your shortlist" className="w-[25%] max-lg:w-[calc((100%-0.75rem)/2)] max-md:w-full" />;

  const credits = data.templateCredits ?? 0;
  const creditsPerYear = data.creditsPerYear ?? 0;

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {justUpgraded && (
        <p role="status" className="type-body flex items-center gap-3 bg-primary/10 px-[calc(var(--cvw)*1.6)] py-[calc(var(--cvw)*1)] ring-1 ring-inset ring-primary/30 max-lg:px-6 max-lg:py-4">
          <span aria-hidden="true" className="size-2 shrink-0 bg-primary" />
          {/* Paid, but the plan can take a moment to switch on (a slow database write, then
              the payment webhook); this card refreshes on its own every 30s */}
          {isPro ? `Welcome to ${planName}. Your account has been upgraded.` : "Payment received. Your plan is switching on - this can take a minute."}
        </p>
      )}

      {/* plan + template credits: not for admins, whose access isn't a plan */}
      {!isAdmin && (
        <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
          <section aria-labelledby="plan-h" className={`flex w-1/2 flex-col justify-between gap-[calc(var(--cvw)*2)] bg-ink text-foreground ${CARD_PAD} max-lg:w-full max-lg:gap-6`}>
            <div className="flex flex-col gap-[calc(var(--cvw)*1)] max-lg:gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <p className="type-label text-foreground/80">Your plan</p>
                  <h2 id="plan-h" className="type-h2">
                    {planName}
                    {isPro && interval && <span className="text-primary"> · {interval}</span>}
                  </h2>
                </div>
                {isPro && !cancelled && (
                  <span className="type-small inline-flex items-center gap-2 bg-foreground/10 px-3 py-1 capitalize">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                    {data.subscriptionStatus}
                  </span>
                )}
              </div>
              <p className="type-body max-w-[80%] text-foreground/80 max-lg:max-w-none">
                {isPro ? (
                  <>
                    Full access to all <span className="text-foreground">{data.totalEffects}</span> effects, {limit ? `${limit} a day across web, CLI and MCP` : "with no daily limit"}
                    {creditsPerYear > 0 ? `, and ${creditsPerYear} template credits a year.` : "."}
                  </>
                ) : (
                  <>
                    {data.totalFreeEffects} of {data.totalEffects} effects, {limit} a day. Upgrade for the full vault and template credits.
                  </>
                )}
              </p>
            </div>

            {isPro && start && (
              <div className="flex flex-col gap-2">
                <div className="h-1 w-full bg-foreground/10">
                  <div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${(elapsed * 100).toFixed(1)}%` }} />
                </div>
                <div className="type-small flex justify-between gap-4 text-foreground/80 max-md:flex-col max-md:gap-1">
                  <span>Started {formatDate(start)}</span>
                  <span>
                    {daysLeft ?? "—"} days left · {cancelled ? "ends" : "renews"} {formatDate(end)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
              {isPro ? (
                <>
                  <Button text="Manage plan" href={data.manageSubscriptionUrl || path("invoicing")} target_blank={Boolean(data.manageSubscriptionUrl)} />
                  {data.tier === "pro" && <CardLink tone="dark" href="/pricing#plans" onClick={markScrollToPricingCards}>See what Pro+ adds</CardLink>}
                </>
              ) : (
                <Button text="Upgrade to Pro" href="/pricing#plans" onClick={markScrollToPricingCards} />
              )}
            </div>
          </section>

          <section aria-labelledby="credits-h" className={`${CARD} ${CARD_PAD} flex-1 gap-[calc(var(--cvw)*1)] max-lg:gap-4`}>
            <p id="credits-h" className="type-label text-black/60">
              Template credits
            </p>
            {creditsPerYear > 0 ? (
              <>
                {/* one coin per credit this year, filled while unspent */}
                <div className="flex gap-2">
                  {Array.from({ length: Math.max(creditsPerYear, credits) }, (_, i) => (
                    <span
                      key={i}
                      className={`type-small grid size-[calc(var(--cvw)*2.6)] place-items-center max-lg:size-10 ${i < credits ? "bg-primary text-background" : "text-black/40 ring-1 ring-inset ring-black/20"}`}
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
                <p className="type-h3">
                  <span className="text-primary">{credits}</span> of {creditsPerYear} left this year
                </p>
                <p className="type-small text-black/60">Redeem one for any template in your catalogue. Credits refresh when your plan renews.</p>
              </>
            ) : (
              <>
                <p className="type-h3">{credits} credits</p>
                <p className="type-small text-black/60">Yearly Pro adds 3 template credits a year, and Pro+ adds them on every plan. Redeem a credit for a whole template.</p>
              </>
            )}
            <div className="mt-auto">
              <CardLink href={path("templates")}>Your templates</CardLink>
            </div>
          </section>
        </div>
      )}

      {/* today's usage, installations by surface, saved */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-md:flex-col max-lg:flex-wrap max-lg:gap-3">
        <Link href={path("usage")} className={`group flex w-[25%] flex-col justify-between gap-[calc(var(--cvw)*1.2)] bg-ink text-foreground ${CARD_PAD} max-lg:w-[calc((100%-0.75rem)/2)] max-lg:gap-4 max-md:w-full`}>
          <CardTop label="Daily usage" dark />
          {limit ? (
            <>
              <p className="type-h2">
                <span className="text-primary">{data.todayCount}</span>
                <span className="text-foreground/80"> of {limit}</span>
              </p>
              <p className="type-small text-foreground/80">
                Effects today across web, CLI and MCP.{now ? ` Resets in ${untilReset(now)}.` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="type-h2 text-primary">Unlimited</p>
              <p className="type-small text-foreground/80">No daily limit on admin accounts: every effect, free and Pro, across web, CLI and MCP.</p>
            </>
          )}
        </Link>
        <Link href={path("usage")} className={`group ${CARD} ${CARD_PAD} flex-1 justify-between gap-[calc(var(--cvw)*1.2)] transition-shadow duration-300 hover:ring-primary max-lg:order-last max-lg:w-full max-lg:flex-none max-lg:gap-4`}>
          <CardTop label="Installations" />
          {/* effects taken through each surface, divided by hairlines: chip, number, caption */}
          <div className="flex flex-1 gap-[calc(var(--cvw)*1.6)] max-md:gap-4">
            {[
              ["web", data.webCount, "From the website"],
              ["cli", data.cliCount, "Installed with the CLI"],
              ["mcp", data.mcpCount, "Through an AI editor"],
            ].map(([source, count, detail], i) => (
              <div key={source} className={`flex flex-1 flex-col justify-between gap-[calc(var(--cvw)*0.8)] max-lg:gap-3 ${i ? "border-l border-black/10 pl-[calc(var(--cvw)*1.6)] max-md:pl-4" : ""}`}>
                <p className="type-h1">{count ?? 0}</p>
                <SourceChip source={source} />
                <p className="type-small text-black/60">{detail}</p>
              </div>
            ))}
          </div>
        </Link>
        {savedCard}
      </div>

      <CliTokenManager plan={data.plan} hasToken={data.hasCliToken} />

      {/* recent activity + recently saved */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
        <section className={`${CARD} ${CARD_PAD} w-[63%] gap-[calc(var(--cvw)*1)] max-lg:w-full max-lg:gap-4`}>
          <SectionHead title="Recent Installation Activity" href={path("usage")} label="All Usage" />
          {data.recentActivity?.length ? (
            <ul className="flex flex-col">
              {data.recentActivity.map((item) => {
                const effect = effectBySlug(item.name);
                return (
                  <li key={`${item.name}-${item.at}`} className="flex items-center gap-4 border-t border-black/10 py-[calc(var(--cvw)*0.8)] first:border-t-0 max-lg:py-3">
                    <SourceChip source={item.source} />
                    <Link href={effect ? getEffectHref(effect) : "/effects"} className="type-body min-w-0 flex-1 truncate transition-colors duration-300 hover:text-primary">
                      {effect?.title || item.title}
                    </Link>
                    {now && <span className="type-small shrink-0 text-black/60">{timeAgo(item.at, now)}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="type-body text-black/60">Nothing yet. Install an effect (copy it on the site, or use the CLI or MCP) and it shows up here.</p>
          )}
        </section>

        <section className={`${CARD} ${CARD_PAD} flex-1 gap-[calc(var(--cvw)*1)] max-lg:gap-4`}>
          <SectionHead title="Recently Saved" href={path("saved")} label="All Saved" />
          {data.recentlySaved?.length ? (
            <ul className="flex flex-col">
              {data.recentlySaved.slice(0, 4).map((item) => {
                const effect = effectBySlug(item.name) || item;
                const cover = resolveCover(effect);
                return (
                  <li key={item.name} className="border-t border-black/10 py-[calc(var(--cvw)*0.6)] first:border-t-0 first:pt-0 max-lg:py-3">
                    {/* the cover on the left (Pro tag on it), the name, category and when it was saved on the right */}
                    <Link href={effect.name ? getEffectHref(effect) : "/effects"} className="group flex items-center gap-[calc(var(--cvw)*1)] max-lg:gap-4">
                      <span className="relative block aspect-[16/8.6] w-[38%] shrink-0 overflow-hidden max-md:w-[42%] border border-black/10">
                        {cover && <Image src={cover} alt="" fill sizes="(max-width: 767px) 40vw, (max-width: 1024px) 35vw, 12vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                        {/* Pro effects get a small tag on the image; free ones none */}
                        {effect.tier === "pro" && <TierBadge tier="pro" className="absolute top-1.5 right-1.5 px-1.5 py-0.5" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                        <span className="type-body w-full truncate transition-colors duration-300 group-hover:text-primary">{effect.title || item.title}</span>
                        <span className="type-small truncate text-black/60">
                          {effectCategoryLabel(effect)}
                          {item.savedAt && now ? ` · ${timeAgo(item.savedAt, now)}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="type-body text-black/60">Tap the heart on any effect to keep it here.</p>
          )}
        </section>
      </div>
    </div>
  );
}
