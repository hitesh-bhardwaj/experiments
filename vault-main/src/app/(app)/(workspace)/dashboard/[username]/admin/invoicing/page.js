"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { useAdminAudience } from "@/components/admin/AdminAudience";
import { ALL_DATES, CARD, CARD_PAD, DATE_PRESETS, DateRangeFilter, FILTER_WIDTH, Pager } from "@/components/Dashboard/DashboardUI";
import { Bar, SkeletonCard } from "@/components/Dashboard/DashboardSkeletons";
import { StatCard, StatCardSkeleton } from "@/components/Dashboard/TrendStat";
import { useDashboardData } from "@/components/Dashboard/useDashboardData";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { SlidingSegment } from "@/components/ui/SlidingSegment";
import { FilterMenu } from "@/app/(app)/(workspace)/effects/FilterMenu";
import { useAdminRole } from "@/lib/useAdminRole";
import { TEMPLATES } from "@/lib/mock-templates";
import { getDashboardPreview, sampleAdminInvoicing } from "@/lib/dev/dashboardPreview";

// Every payment across every user - super admins only, here and (the real gate) in
// api/admin/invoices and api/admin/template-purchases.

const PER_PAGE = 15;
const LEDGERS = [
  { id: "subscriptions", label: "Subscriptions" },
  { id: "templates", label: "Templates" },
];
const TEMPLATE_FILTERS = { all: "All templates", ...Object.fromEntries(TEMPLATES.map((t) => [t.slug, t.title])) };
const INTERVALS = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

const formatDate = (value) => (value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—");

// invoices.amount is in the smallest unit (paise / cents); template_purchases.amount in
// whole units (see api/admin/template-purchases)
function money(amount, currency, minorUnits = false) {
  if (typeof amount !== "number") return "—";
  const value = minorUnits ? amount / 100 : amount;
  const code = currency || "USD";
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

// Razorpay's hosted receipt when there is one, else the payment in the merchant dashboard
const receiptHref = (row) => row.invoiceUrl || (row.paymentId ? `https://dashboard.razorpay.com/app/payments/${row.paymentId}` : null);

// The page's date filter as the admin APIs' range / from / to
function rangeParams(dates) {
  const params = new URLSearchParams();
  if (dates.preset === "custom") {
    if (dates.from) params.set("from", dates.from);
    if (dates.to) params.set("to", dates.to);
  } else if (dates.preset !== "all") {
    params.set("range", dates.preset);
  }
  return params;
}

function UserCell({ row }) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar name={row.userName} email={row.userEmail} imageUrl={row.userImageUrl} className="size-8" />
      <span className="flex min-w-0 flex-col">
        <span className="type-body truncate">{row.userName || "—"}</span>
        <span className="type-small truncate text-black/60">{row.userEmail || row.userId}</span>
      </span>
    </div>
  );
}

// The ledger's rows while they load: avatar and name, what, amount, payment ID, date, receipt
function LedgerRowsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.7)] last:border-b-0 max-lg:py-3">
          <Bar className="size-8 shrink-0 rounded-full" />
          <div className="flex w-[22%] flex-col gap-1">
            <Bar type="type-body" className="w-[80%]" />
            <Bar type="type-small" className="w-full" />
          </div>
          <Bar type="type-body" className="w-[18%]" />
          <Bar type="type-body" className="ml-auto w-[10%]" />
          <Bar type="type-small" className="w-[14%]" />
          <Bar type="type-small" className="w-[10%]" />
          <Bar type="type-small" className="w-8" />
        </div>
      ))}
    </div>
  );
}

export default function AdminInvoicingPage() {
  const { path, isSuperAdmin } = useDashboard();
  const role = useAdminRole();
  const router = useRouter();

  const [dates, setDates] = useState(ALL_DATES);
  const [ledger, setLedger] = useState("subscriptions");
  const [template, setTemplate] = useState("all");
  const [page, setPage] = useState(0);
  // Customers / Internal / All: chosen in the tab row (DashboardShell); a change starts
  // the ledger from its first page
  const [audience] = useAdminAudience();
  const [pageAudience, setPageAudience] = useState(audience);
  if (pageAudience !== audience) {
    setPageAudience(audience);
    setPage(0);
  }
  // Both tables' current page: { invoices, templates }; null until the first load
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  // A page / filter change after the first load: only the table shows it's loading
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // The stat cards for the window: cached (skeleton on a window's first load only)
  const statsQuery = rangeParams(dates).toString();
  const { data: stats } = useDashboardData(isSuperAdmin ? `admin-revenue:${statsQuery}:${audience}` : null, async () => {
    if (getDashboardPreview()) return sampleAdminInvoicing().stats;
    const params = rangeParams(dates);
    params.set("audience", audience);
    const res = await fetch(`/api/admin/invoices/stats?${params}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`revenue ${res.status}`);
    return res.json();
  });

  // Not a super admin: back to Users rather than an empty page
  useEffect(() => {
    if (!role.loading && !isSuperAdmin) router.replace(path("admin/users"));
  }, [role.loading, isSuperAdmin, router, path]);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    let active = true;
    if (getDashboardPreview()) {
      requestAnimationFrame(() => active && setData(sampleAdminInvoicing()));
      return () => {
        active = false;
      };
    }
    const subs = rangeParams(dates);
    subs.set("audience", audience);
    subs.set("limit", String(PER_PAGE));
    subs.set("offset", String(ledger === "subscriptions" ? page * PER_PAGE : 0));
    const tpl = rangeParams(dates);
    tpl.set("audience", audience);
    if (template !== "all") tpl.set("template", template);
    tpl.set("limit", String(PER_PAGE));
    tpl.set("offset", String(ledger === "templates" ? page * PER_PAGE : 0));
    const get = (url) => fetch(url).then((res) => res.json().then((json) => (res.ok ? json : Promise.reject(new Error(json.error || url)))));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLedgerLoading(true);
    Promise.all([get(`/api/admin/invoices?${subs}`), get(`/api/admin/template-purchases?${tpl}`)])
      .then(([invoices, templates]) => active && setData({ invoices, templates }))
      .catch((error) => {
        console.error(error);
        if (active) setFailed(true);
      })
      .finally(() => active && setLedgerLoading(false));
    return () => {
      active = false;
    };
  }, [isSuperAdmin, dates, ledger, template, page, audience]);

  // Any filter change starts again from the first page
  const filter = (set) => (value) => {
    set(value);
    setPage(0);
  };

  if (failed) {
    return (
      <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
        <p className="type-h3">We couldn’t load the payments.</p>
        <p className="type-body text-black/60">Check your connection and reload the page.</p>
      </div>
    );
  }

  // The window and whose payments, left; the date filter, right
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="type-label text-black/60">
        {dates.preset === "custom" ? "Custom range" : DATE_PRESETS[dates.preset]} · {audience === "all" ? "every account" : audience === "internal" ? "internal accounts" : "customers"}
      </p>
      <DateRangeFilter label="Paid" value={dates} onChange={filter(setDates)} />
    </div>
  );
  const ROW = "flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-wrap max-lg:gap-3";
  const EACH = "flex-1 max-lg:w-[calc((100%-0.75rem)/2)] max-lg:flex-none max-md:w-full";

  // First load: the cards and the ledger in their own shapes
  if (!isSuperAdmin || !data || !stats) {
    return (
      <div aria-busy="true" aria-label="Loading payments" className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
        {header}
        <div className={ROW}>
          {[0, 1, 2, 3].map((i) => (
            <StatCardSkeleton key={i} className={EACH} />
          ))}
        </div>
        <SkeletonCard className="gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
          <div className="flex justify-between gap-3">
            <Bar type="type-h3" className="w-24" />
            <div className="flex gap-[calc(var(--cvw)*0.7)]">
              <Bar className="h-9.5 w-[calc(var(--cvw)*13)] max-lg:w-48" />
              <Bar className="h-9.5 w-60" />
            </div>
          </div>
          <LedgerRowsSkeleton />
        </SkeletonCard>
      </div>
    );
  }

  const k = stats.kpis;
  const count = (n) => new Intl.NumberFormat("en").format(n || 0);
  // Cards show whole amounts; the ledger keeps the cents
  const whole = (amount, currency) => new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount || 0);
  const split = (stat) => `${whole(stat.subscriptions, stat.currency)} subscriptions · ${whole(stat.templates, stat.currency)} templates`;

  const rows = ledger === "subscriptions" ? data.invoices.invoices || [] : data.templates.purchases || [];
  const total = ledger === "subscriptions" ? data.invoices.total || 0 : data.templates.total || 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {header}

      {/* revenue in each currency (never added together), then the counts - each with its
          change against the previous period and its line */}
      <div className={ROW}>
        <StatCard className={EACH} label="USD revenue" value={whole(k.usd.value, "USD")} note={split(k.usd)} stat={k.usd} comparison={k.comparison} />
        <StatCard className={EACH} label="INR revenue" value={whole(k.inr.value, "INR")} note={split(k.inr)} stat={k.inr} comparison={k.comparison} />
        <StatCard className={EACH} label="Subscriptions" value={count(k.subscriptions.value)} note="Paid invoices" stat={k.subscriptions} comparison={k.comparison} />
        <StatCard className={EACH} label="Template sales" value={count(k.templateSales.value)} note="Paid, not credits" stat={k.templateSales} comparison={k.comparison} />
      </div>

      {/* the ledger: subscriptions or template purchases */}
      <section aria-labelledby="ledger-h" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.2)] max-lg:gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ledger-h" className="type-h3">
            Ledger
          </h2>
          <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
            {ledger === "templates" && (
              <FilterMenu
                tone="light"
                variant="label"
                alignRight
                label="Template"
                widthClassName={FILTER_WIDTH}
                panelClassName="left-auto! right-0"
                options={Object.keys(TEMPLATE_FILTERS)}
                categoryFilter={template}
                activeFilter={template === "all" ? null : template}
                getLabel={(id) => TEMPLATE_FILTERS[id]}
                onSelect={filter(setTemplate)}
              />
            )}
            <SlidingSegment label="Payments" items={LEDGERS} value={ledger} onChange={filter(setLedger)} itemClassName="w-28" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[calc(var(--cvw)*60)] border-collapse text-left max-lg:min-w-215">
            <thead>
              <tr className="type-label border-b border-black/10 text-black/60">
                <th className="py-3 pr-4 font-normal">User</th>
                <th className="py-3 pr-4 font-normal">{ledger === "subscriptions" ? "Plan" : "Template"}</th>
                <th className="py-3 pr-4 text-right font-normal">Amount</th>
                <th className="py-3 pr-4 font-normal">Payment ID</th>
                <th className="py-3 pr-4 font-normal">Date</th>
                <th className="py-3 text-right font-normal">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {ledgerLoading ? (
                <tr>
                  <td colSpan={6}>
                    <LedgerRowsSkeleton />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="type-body py-10 text-center text-black/60">
                    No payments in this window.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const href = receiptHref(row);
                  return (
                    <tr key={row.id} className="border-b border-black/10 last:border-b-0">
                      <td className="py-[calc(var(--cvw)*0.7)] pr-4 max-lg:py-3">
                        <UserCell row={row} />
                      </td>
                      <td className="py-3 pr-4">
                        <span className="flex flex-col">
                          <span className="type-body">{ledger === "subscriptions" ? row.planLabel || "Vault Pro" : row.templateTitle}</span>
                          {ledger === "subscriptions" && <span className="type-small text-black/60">{INTERVALS[row.billingInterval] || "—"}</span>}
                        </span>
                      </td>
                      <td className="type-body whitespace-nowrap py-3 pr-4 text-right font-aeonik">{row.redeemedWithCredit ? "1 credit" : money(row.amount, row.currency, ledger === "subscriptions")}</td>
                      <td className="type-small py-3 pr-4 text-black/60">
                        <span className="font-mono" title={row.paymentId}>
                          {row.paymentId || "—"}
                        </span>
                      </td>
                      <td className="type-small whitespace-nowrap py-3 pr-4 text-black/60">{formatDate(row.createdAt)}</td>
                      <td className="py-3 text-right">
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="type-small text-ink underline underline-offset-3 transition-colors duration-300 hover:text-primary">
                            View
                          </a>
                        ) : (
                          <span className="type-small text-black/20">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pager page={Math.min(page, pages - 1)} pages={pages} total={total} noun={total === 1 ? "payment" : "payments"} onPage={setPage} />
      </section>
    </div>
  );
}
