"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { ACTION_LINE, ALL_DATES, CARD, CARD_PAD, DateRangeFilter } from "@/components/Dashboard/DashboardUI";
import { SOURCE_BARS, UsageBars } from "@/components/Dashboard/UsageBars";
import { SlidingSegment } from "@/components/ui/SlidingSegment";
import { Skeleton } from "@/components/ui/Skeleton";
import { TierBadge, effectCategoryLabel, resolveCover } from "@/app/(app)/(workspace)/effects/EffectCard";
import { TemplateCard } from "@/app/(app)/(workspace)/templates/TemplateCard";
import { getEffectHref } from "@/lib/categories";
import { getDashboardPreview, sampleAdminUser } from "@/lib/dev/dashboardPreview";

// One user's activity, for admins: who they are, their numbers, installs by day, the
// effects they saved / copied / installed, templates they bought, and every payment.

const EFFECT_TABS = [
  { id: "saved", label: "Saved", key: "savedEffects", date: "savedAt", verb: "Saved" },
  { id: "copied", label: "Copied", key: "copiedEffects", date: "lastCopiedAt", verb: "Last copied" },
  { id: "installed", label: "Installed", key: "installedEffects", date: "lastInstalledAt", verb: "Last installed" },
];

const formatDate = (value) => (value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—");

// `minorUnits`: invoices store paise / cents; template purchases and lifetime spend whole units
function money(amount, currency = "USD", minorUnits = false) {
  if (typeof amount !== "number") return "—";
  const value = minorUnits ? amount / 100 : amount;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

// The date filter as the API's range / from / to
function rangeParams(dates) {
  const params = new URLSearchParams();
  if (dates.preset === "custom") {
    if (dates.from) params.set("from", dates.from);
    if (dates.to) params.set("to", dates.to);
  } else {
    params.set("range", dates.preset);
  }
  return params;
}

function Kpi({ label, value, detail }) {
  return (
    <div className={`${CARD} ${CARD_PAD} min-w-0 flex-1 justify-between gap-(--cvw) max-lg:w-[calc((100%-1.5rem)/3)] max-lg:flex-none max-lg:gap-3 max-md:w-[calc((100%-0.75rem)/2)]`}>
      <p className="type-label text-black/60">{label}</p>
      <p className="type-h2 truncate">{value}</p>
      {detail && <p className="type-small text-black/60">{detail}</p>}
    </div>
  );
}

// Back to wherever the admin came from (Users, Activity...), or Activity on a cold load
function BackButton() {
  const { path } = useDashboard();
  const router = useRouter();
  return (
    <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push(path("admin/activity")))} className={ACTION_LINE}>
      <ArrowLeft aria-hidden="true" />
      Back
    </button>
  );
}

export default function AdminUserActivityPage({ params }) {
  const { userSlug } = use(params);
  const { effectBySlug, catalog } = useDashboard();

  const [dates, setDates] = useState(ALL_DATES);
  const [tab, setTab] = useState("saved");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dates.preset === "custom" && !dates.from) return undefined;
    let active = true;
    if (getDashboardPreview()) {
      requestAnimationFrame(() => active && setData(sampleAdminUser(catalog)));
      return () => {
        active = false;
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    // The API route turns the slug back into the Clerk user
    fetch(`/api/admin/activity/${userSlug}?${rangeParams(dates)}`)
      .then((res) => res.json().then((json) => (res.ok ? json : Promise.reject(new Error(json.error || "Failed to load user activity")))))
      .then((json) => active && setData(json))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [userSlug, dates, catalog]);

  if (error) {
    return (
      <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
        <BackButton />
        <p className="type-h3">We couldn’t load this user.</p>
        <p className="type-body text-black/60">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div aria-busy="true" aria-label="Loading user" className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
        <Skeleton className="h-[calc(var(--cvw)*8)] w-full max-lg:h-28" />
        <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[calc(var(--cvw)*9)] flex-1 max-lg:h-32" />
          ))}
        </div>
        <Skeleton className="h-[calc(var(--cvw)*18)] w-full max-lg:h-64" />
        <Skeleton className="h-[calc(var(--cvw)*24)] w-full max-lg:h-80" />
      </div>
    );
  }

  const { profile, session, subscription, stats, installTrend, templatePurchases, purchasedTemplates, invoices } = data;
  const current = EFFECT_TABS.find((t) => t.id === tab);
  const effects = data[current.key] || [];
  const spend = stats.lifetimeSpendByCurrency || [];
  const usd = spend.find((row) => row.currency === "USD")?.amount || 0;
  const days = (installTrend || []).map(({ date, web, cli, mcp }) => ({ date, web: web || 0, cli: cli || 0, mcp: mcp || 0 }));

  // Subscriptions and templates together, newest first
  const payments = [
    ...invoices.map((invoice) => ({
      id: `i-${invoice.id}`,
      date: invoice.created_at,
      description: invoice.plan_label || "Vault Pro",
      amount: money(invoice.amount, invoice.currency, true),
      paymentId: invoice.razorpay_payment_id,
      status: invoice.status,
      url: invoice.invoice_url,
    })),
    ...templatePurchases.map((purchase) => ({
      id: `t-${purchase.id}`,
      date: purchase.createdAt,
      description: `Template · ${purchase.templateTitle}`,
      amount: money(purchase.amount, purchase.currency),
      paymentId: purchase.paymentId,
      status: purchase.status,
      url: purchase.invoiceUrl,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {/* who: back, the person, their plan; the date filter */}
      <section aria-label="User" className={`${CARD} ${CARD_PAD} flex-row flex-wrap items-center justify-between gap-4`}>
        <div className="flex min-w-0 items-center gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
          <BackButton />
          {profile.imageUrl ? (
            <Image src={profile.imageUrl} alt="" width={56} height={56} className="size-14 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="type-h3 grid size-14 shrink-0 place-items-center rounded-full bg-ink text-foreground">{(profile.name?.[0] || profile.email?.[0] || "?").toUpperCase()}</span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="type-h3 truncate">{profile.name || "Unnamed user"}</span>
              <span className={`type-small px-2 py-0.5 ${profile.isAdmin || subscription?.plan === "pro" ? "bg-primary text-background" : "text-black/60 ring-1 ring-inset ring-black/10"}`}>
                {profile.isAdmin ? "Admin" : subscription?.plan === "pro" ? "Pro" : "Free"}
              </span>
            </p>
            <span className="type-small truncate text-black/60">{profile.email || profile.id}</span>
          </div>
        </div>
        <DateRangeFilter label="Showing" value={dates} onChange={setDates} />
      </section>

      {/* their numbers */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-wrap max-lg:gap-3">
        <Kpi label="Saved" value={stats.savedCount} detail="Effects saved" />
        <Kpi label="Installed" value={stats.installedCount} detail="Web, CLI and MCP" />
        <Kpi label="Copied" value={stats.copiedCount} detail="From the website" />
        <Kpi label="Templates" value={templatePurchases.length} detail="Bought" />
        <Kpi
          label="Lifetime spend"
          value={money(usd, "USD")}
          detail={
            spend
              .filter((row) => row.currency !== "USD")
              .map((row) => `+ ${money(row.amount, row.currency)}`)
              .join(" ") || "Subscriptions and templates"
          }
        />
        <Kpi
          label="Last sign-in"
          value={profile.lastSignInAt ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(profile.lastSignInAt)) : "Never"}
          detail={session ? [session.browserName, session.deviceType, session.city, session.country].filter(Boolean).join(" · ") || "Active session" : "No active session"}
        />
      </div>

      {/* installs by day */}
      <section aria-labelledby="user-by-day-h" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.6)] max-lg:gap-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="user-by-day-h" className="type-h3">
              Installs &amp; copies by day
            </h2>
            <p className="type-small text-black/60">Hover a bar for its numbers.</p>
          </div>
          <ul className="type-small flex gap-3 text-black/60">
            {SOURCE_BARS.map(({ key, label, tone }) => (
              <li key={key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2 ${tone}`} />
                {label}
              </li>
            ))}
          </ul>
        </div>
        {days.length ? <UsageBars days={days} /> : <p className="type-body text-black/60">Nothing in this window.</p>}
      </section>

      {/* their effects: saved / copied / installed */}
      <section aria-labelledby="user-effects-h" className={`${CARD} ${CARD_PAD} gap-(--cvw) max-lg:gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="user-effects-h" className="type-h3">
            Effects
          </h2>
          <SlidingSegment label="Effects" items={EFFECT_TABS} value={tab} onChange={setTab} itemClassName="w-24" />
        </div>
        {effects.length === 0 ? (
          <p className="type-body text-black/60">None in this window.</p>
        ) : (
          <ul className="flex flex-wrap gap-x-[calc(var(--cvw)*1.6)] max-lg:gap-x-4">
            {effects.map((item) => {
              const effect = effectBySlug(item.slug) || item;
              const cover = resolveCover(effect);
              return (
                <li key={item.slug} className="w-[calc((100%-var(--cvw)*3.2)/3)] border-b border-black/10 py-[calc(var(--cvw)*0.7)] max-lg:w-[calc((100%-1rem)/2)] max-lg:py-3 max-md:w-full">
                  <Link href={getEffectHref(effect)} className="group flex items-center gap-(--cvw) max-lg:gap-4">
                    <span className="relative block aspect-[16/8.6] w-[40%] shrink-0 overflow-hidden border border-black/10 bg-dark-card">
                      {cover && <Image src={cover} alt="" fill sizes="(max-width: 767px) 40vw, 12vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                      {effect.tier === "pro" && <TierBadge tier="pro" className="absolute top-1.5 right-1.5 px-1.5 py-0.5" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="type-body truncate transition-colors duration-300 group-hover:text-primary">{effect.title || item.slug}</span>
                      <span className="type-small truncate text-black/60">
                        {effectCategoryLabel(effect)} · {current.verb} {formatDate(item[current.date])}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* templates they own */}
      {purchasedTemplates.length > 0 && (
        <section aria-labelledby="user-templates-h" className="flex flex-col gap-(--cvw) max-lg:gap-4">
          <h2 id="user-templates-h" className="type-h3">
            Purchased templates
          </h2>
          <div className="flex flex-wrap gap-[calc(var(--cvw)*1.3)] max-lg:gap-4">
            {purchasedTemplates.map((template) => (
              <div key={template.slug} className="w-[calc((100%-var(--cvw)*1.3)/2)] max-md:w-full">
                <TemplateCard template={template} small />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* every payment */}
      <section aria-labelledby="user-payments-h" className={`${CARD} ${CARD_PAD} gap-(--cvw) max-lg:gap-4`}>
        <h2 id="user-payments-h" className="type-h3">
          Payments
        </h2>
        {payments.length === 0 ? (
          <p className="type-body text-black/60">No payments.</p>
        ) : (
          <div className="flex flex-col">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.7)] last:border-b-0 max-lg:py-3 max-md:flex-wrap">
                <span className="type-small w-[16%] text-black/60 max-md:w-auto">{formatDate(payment.date)}</span>
                <span className="type-body min-w-0 flex-1 truncate">{payment.description}</span>
                <span className="type-small font-mono text-black/60 max-lg:hidden">{payment.paymentId || "—"}</span>
                <span className="type-body w-[14%] text-right font-aeonik max-md:w-auto">{payment.amount}</span>
                <span className="type-small inline-flex w-[10%] items-center gap-1.5 capitalize max-md:w-auto">
                  <span aria-hidden="true" className={`size-1.5 rounded-full ${payment.status === "paid" ? "bg-primary" : "bg-black/20"}`} />
                  {payment.status || "unknown"}
                </span>
                <span className="w-12 text-right max-md:w-auto">
                  {payment.url ? (
                    <a href={payment.url} target="_blank" rel="noopener noreferrer" className="type-small text-ink underline underline-offset-3 transition-colors duration-300 hover:text-primary">
                      View
                    </a>
                  ) : (
                    <span className="type-small text-black/20">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
