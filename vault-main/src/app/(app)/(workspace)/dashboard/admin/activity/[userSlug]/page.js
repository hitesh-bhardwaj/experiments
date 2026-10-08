"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { LineTrendChart } from "@/components/admin/charts/LineTrendChart";
import { EffectRankSlider } from "@/components/admin/EffectRankSlider";
import { TemplateCard } from "@/components/ui/TemplateCard";
import { DateRangeCalendarPicker } from "@/components/admin/DateRangeCalendarPicker";
import { CustomSelect } from "@/components/ui/CustomSelect";

// Same date-range picker as dashboard/admin/activity - every stat, list,
// and chart on this page is scoped to it, not just a fixed "last 30 days".
const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const INSTALL_SOURCE_SERIES = [
  { dataKey: "web", color: "#ff5f00", label: "Web" },
  { dataKey: "cli", color: "#4ade80", label: "CLI" },
  { dataKey: "mcp", color: "#60a5fa", label: "MCP" },
];

// Users can land here from three different places (User Management, the
// Activity tab's user table, or its "Top users by copies" list) - going
// back should return to whichever of those was actually clicked, not
// always the Activity tab. router.back() does that; the history-length
// check is only a fallback for a cold load (bookmark, refresh, direct
// link) where there's nothing in this tab's history to go back to.
function BackLink() {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard/admin/activity");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back
    </button>
  );
}

function StatCardSkeleton() {
  return (
    <div className="flex h-full flex-col justify-between  p-6 bg-[#272727]">
      <div className="mb-3 h-4 w-20 animate-pulse  bg-white/10" />
      <div className="h-7 w-16 animate-pulse  bg-white/15" />
    </div>
  );
}

function ActivityDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-32 animate-pulse  bg-white/10" />

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse  bg-white/10" />

        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse  bg-white/10" />
          <div className="h-4 w-52 animate-pulse  bg-white/8" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className=" bg-[#272727] p-6">
        <div className="mb-4 h-4 w-48 animate-pulse  bg-white/10" />
        <div className="h-[220px] animate-pulse  bg-white/5" />
      </div>

      <div className="flex flex-col gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className=" bg-[#272727] p-6">
            <div className="mb-4 h-5 w-40 animate-pulse  bg-white/10" />
            <div className="flex gap-6 overflow-hidden">
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="min-w-[26vw] max-xl:min-w-[38vw] max-md:min-w-[70vw] shrink-0 space-y-3">
                  <div className="aspect-3/2 animate-pulse bg-white/5" />
                  <div className="h-5 w-2/3 animate-pulse bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// `amount` is in the smallest currency unit (paise for INR), matching how
// invoices.amount is stored - see recordInvoice() in @/lib/pro-access.
function formatAmount(amount, currency = "INR") {
  if (typeof amount !== "number") return "-";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

// template_purchases.amount is already whole currency units (see
// api/admin/template-purchases/route.js's own comment on this), unlike
// invoices.amount above - this must not divide by 100.
function formatTemplateAmount(amount, currency = "USD") {
  if (typeof amount !== "number") return "-";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// stats.lifetimeSpendByCurrency amounts are already decimals (pre-divided/
// combined server-side across invoices and template_purchases), not the
// smallest currency unit - format directly rather than round-tripping
// through formatAmount's paise assumption.
function formatSpend(amount, currency = "INR") {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${(amount || 0).toFixed(2)} ${currency}`;
  }
}

// Looks up each currency's own total instead of summing the array or
// defaulting to "whichever invoice happened to be first" - a user can have
// both an INR and a USD payment on file, and blending/mislabeling those is
// exactly the bug this replaced (a real $179 spend was showing as "₹179").
function spendFor(stats, currency) {
  return stats?.lifetimeSpendByCurrency?.find((row) => row.currency === currency)?.amount || 0;
}

function StatusBadge({ status }) {
  const isPaid = status === "paid";

  return (
    <span
      className={`inline-flex items-center  px-3 py-1 text-xs font-medium capitalize ${
        isPaid ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-white/60"
      }`}
    >
      {status || "unknown"}
    </span>
  );
}

export default function AdminUserActivityPage({ params }) {
  const { userSlug } = use(params);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const isCustomRange = range === "custom";

  useEffect(() => {
    if (isCustomRange && !customFrom && !customTo) return;

    let active = true;

    async function loadActivity() {
      try {
        const params = new URLSearchParams();
        if (isCustomRange) {
          if (customFrom) params.set("from", customFrom);
          if (customTo) params.set("to", customTo);
        } else {
          params.set("range", range);
        }

        // The API route extracts the real Clerk user id from the slug -
        // forwarding the whole thing keeps the two in lockstep instead of
        // duplicating the "--id" parsing on the client too.
        const res = await fetch(`/api/admin/activity/${userSlug}?${params.toString()}`);
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Failed to load user activity");
        if (active) setData(json);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadActivity();

    return () => {
      active = false;
    };
  }, [userSlug, range, isCustomRange, customFrom, customTo]);

  if (loading) {
    return <ActivityDetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <BackLink />

        <div className=" border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error || "User not found."}
        </div>
      </div>
    );
  }

  const {
    profile,
    session,
    subscription,
    stats,
    installTrend,
    savedEffects,
    copiedEffects,
    installedEffects,
    templatePurchases,
    purchasedTemplates,
    invoices,
  } = data;

  // Copies are always a subset of installs (every web copy is also an
  // install_unlocks row) - when a user has never installed anything via
  // CLI/MCP, "Installed Effects" would just be the exact same list as
  // "Copied Effects" a second time, so it's hidden rather than shown
  // twice.
  const installsMatchCopies =
    installedEffects.length === copiedEffects.length &&
    installedEffects.every((effect) => copiedEffects.some((copied) => copied.slug === effect.slug));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <BackLink />

        <div className="flex items-center gap-2 flex-wrap">
          {isCustomRange && (
            <DateRangeCalendarPicker
              from={customFrom}
              to={customTo}
              onFromChange={setCustomFrom}
              onToChange={setCustomTo}
            />
          )}
          <CustomSelect size="compact" align="right" value={range} onChange={setRange} options={DATE_RANGE_OPTIONS} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {profile.imageUrl ? (
          <Image
            src={profile.imageUrl}
            alt={profile.name || ""}
            width={56}
            height={56}
            className="h-14 w-14  object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center  bg-white/10 text-lg font-medium">
            {(profile.name?.[0] || profile.email?.[0] || "?").toUpperCase()}
          </div>
        )}

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{profile.name || "Unnamed user"}</h1>

            {profile.isAdmin && (
              <span className=" bg-[#ff5f00]/15 px-2.5 py-0.5 text-xs font-medium text-[#ff5f00]">
                Admin
              </span>
            )}

            {!profile.isAdmin && (
              <span
                className={` px-2.5 py-0.5 text-xs font-medium ${
                  subscription?.plan === "pro"
                    ? "bg-[#ff5f00]/15 text-[#ff5f00]"
                    : "bg-white/8 text-white/60"
                }`}
              >
                {subscription?.plan === "pro" ? "Pro" : "Free"}
              </span>
            )}
          </div>

          <p className="text-sm text-white/50">{profile.email || profile.id}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Saved Effects" value={stats.savedCount} />
        <StatCard label="Total Installed" value={stats.installedCount} />
        <StatCard label="Copied from Web" value={stats.copiedCount} />
        <StatCard label="Templates Purchased" value={templatePurchases.length} />
        <StatCard
          label="Last Sign-in"
          value={profile.lastSignInAt ? formatDate(profile.lastSignInAt) : "Never"}
          detail={
            session ? (
              <span>
                {[session.browserName, session.deviceType, session.city, session.country]
                  .filter(Boolean)
                  .join(" · ") || "Active session"}
              </span>
            ) : (
              "No active session"
            )
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Lifetime Spend (INR)"
          value={formatSpend(spendFor(stats, "INR"), "INR")}
        />
        <StatCard
          label="Lifetime Spend (USD)"
          value={formatSpend(spendFor(stats, "USD"), "USD")}
        />
      </div>

      <div className=" bg-[#272727] p-6">
        <p className="mb-4 text-white">Installs</p>
        <LineTrendChart data={installTrend} xKey="label" series={INSTALL_SOURCE_SERIES} />
      </div>

      <div className="flex flex-col gap-5">
        <div className=" bg-[#272727] p-6">
          {savedEffects.length === 0 ? (
            <>
              <p className="mb-4 text-white text-xl">Saved Effects (0)</p>
              <div className="text-center text-sm text-white/40">No saved effects yet.</div>
            </>
          ) : (
            <EffectRankSlider
              title={`Saved Effects (${savedEffects.length})`}
              effects={savedEffects}
              renderValue={(effect) => (
                <span className="text-sm font-normal text-white/60">
                  Saved {formatDate(effect.savedAt)}
                </span>
              )}
            />
          )}
        </div>

        <div className=" bg-[#272727] p-6">
          {copiedEffects.length === 0 ? (
            <>
              <p className="mb-4 text-white text-xl">Copied Effects (0)</p>
              <div className="text-center text-sm text-white/40">No copied effects yet.</div>
            </>
          ) : (
            <EffectRankSlider
              title={`Copied Effects (${copiedEffects.length})`}
              effects={copiedEffects}
              renderValue={(effect) => (
                <span className="text-sm font-normal text-white/60">
                  Last copied {formatDate(effect.lastCopiedAt)}
                </span>
              )}
            />
          )}
        </div>

        {!installsMatchCopies && (
          <div className=" bg-[#272727] p-6">
            {installedEffects.length === 0 ? (
              <>
                <p className="mb-4 text-white text-xl">Installed Effects (0)</p>
                <div className="text-center text-sm text-white/40">No installed effects yet.</div>
              </>
            ) : (
              <EffectRankSlider
                title={`Installed Effects (${installedEffects.length})`}
                effects={installedEffects}
                renderValue={(effect) => (
                  <span className="text-sm font-normal text-white/60">
                    Last installed {formatDate(effect.lastInstalledAt)}
                  </span>
                )}
              />
            )}
          </div>
        )}

        {purchasedTemplates.length > 0 && (
          <div>
            <p className="mb-4 text-white text-xl">Purchased Templates ({purchasedTemplates.length})</p>
            <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
              {purchasedTemplates.map((template) => (
                <TemplateCard key={template.slug} template={template} />
              ))}
            </div>
          </div>
        )}
      </div>

      {invoices.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium text-white">
            Billing History ({invoices.length})
          </h2>

          <div className="overflow-x-auto  bg-[#272727]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Payment ID</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Receipt</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-white/5 last:border-0">
                    <td className="px-6 py-4 text-white">{formatDateTime(invoice.created_at)}</td>

                    <td className="px-6 py-4 text-white/80">{invoice.plan_label || "Vault Pro"}</td>

                    <td className="px-6 py-4 text-white">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-white/50">
                      {invoice.razorpay_payment_id ? `${invoice.razorpay_payment_id.slice(0, 16)}…` : "-"}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>

                    <td className="px-6 py-4">
                      {invoice.invoice_url ? (
                        <a
                          href={invoice.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#ff5f00] hover:text-[#ff7a29]"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-white/25">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {templatePurchases.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium text-white">
            Template Purchases ({templatePurchases.length})
          </h2>

          <div className="overflow-x-auto  bg-[#272727]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Template</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Payment ID</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Receipt</th>
                </tr>
              </thead>

              <tbody>
                {templatePurchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-white/5 last:border-0">
                    <td className="px-6 py-4 text-white">{formatDateTime(purchase.createdAt)}</td>

                    <td className="px-6 py-4 text-white/80">{purchase.templateTitle}</td>

                    <td className="px-6 py-4 text-white">
                      {formatTemplateAmount(purchase.amount, purchase.currency)}
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-white/50">
                      {purchase.paymentId ? `${purchase.paymentId.slice(0, 16)}…` : "-"}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={purchase.status} />
                    </td>

                    <td className="px-6 py-4">
                      {purchase.invoiceUrl ? (
                        <a
                          href={purchase.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#ff5f00] hover:text-[#ff7a29]"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-white/25">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
