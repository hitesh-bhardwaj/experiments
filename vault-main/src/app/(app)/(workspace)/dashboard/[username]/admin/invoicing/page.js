"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { ALL_DATES, CARD, CARD_PAD, DateRangeFilter, FILTER_WIDTH, Pager } from "@/components/Dashboard/DashboardUI";
import { SlidingSegment } from "@/components/ui/SlidingSegment";
import { Skeleton } from "@/components/ui/Skeleton";
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
function money(amount, currency = "USD", minorUnits = false) {
  if (typeof amount !== "number") return "—";
  const value = minorUnits ? amount / 100 : amount;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

// One currency's total - never summed across currencies (INR and USD are unlike units)
const revenueIn = (stats, currency) => stats?.revenueByCurrency?.find((row) => row.currency === currency)?.amount || 0;

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

function Kpi({ label, value, detail }) {
  return (
    <div className={`${CARD} ${CARD_PAD} flex-1 justify-between gap-(--cvw) max-lg:gap-3 max-md:w-[calc((100%-0.75rem)/2)] max-md:flex-none`}>
      <p className="type-label text-black/60">{label}</p>
      <p className="type-h2">{value}</p>
      <p className="type-small text-black/60">{detail}</p>
    </div>
  );
}

function UserCell({ row }) {
  return (
    <div className="flex items-center gap-3">
      {row.userImageUrl ? (
        <Image src={row.userImageUrl} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="type-small grid size-8 shrink-0 place-items-center rounded-full bg-ink text-foreground">{(row.userName?.[0] || row.userEmail?.[0] || "?").toUpperCase()}</span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="type-body truncate">{row.userName || "—"}</span>
        <span className="type-small truncate text-black/60">{row.userEmail || row.userId}</span>
      </span>
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
  // Both tables' current page, with their stats: { invoices, templates }
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

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
    subs.set("limit", String(PER_PAGE));
    subs.set("offset", String(ledger === "subscriptions" ? page * PER_PAGE : 0));
    const tpl = rangeParams(dates);
    if (template !== "all") tpl.set("template", template);
    tpl.set("limit", String(PER_PAGE));
    tpl.set("offset", String(ledger === "templates" ? page * PER_PAGE : 0));
    const get = (url) => fetch(url).then((res) => res.json().then((json) => (res.ok ? json : Promise.reject(new Error(json.error || url)))));
    Promise.all([get(`/api/admin/invoices?${subs}`), get(`/api/admin/template-purchases?${tpl}`)])
      .then(([invoices, templates]) => active && setData({ invoices, templates }))
      .catch((error) => {
        console.error(error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [isSuperAdmin, dates, ledger, template, page]);

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

  if (!isSuperAdmin || !data) {
    return (
      <div aria-busy="true" aria-label="Loading payments" className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
        <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[calc(var(--cvw)*9)] flex-1 max-lg:h-32" />
          ))}
        </div>
        <Skeleton className="h-[calc(var(--cvw)*32)] w-full max-lg:h-96" />
      </div>
    );
  }

  const subStats = data.invoices.stats;
  const tplStats = data.templates.stats;
  const otherCurrencies = (stats, minor) =>
    (stats?.revenueByCurrency || [])
      .filter((row) => row.currency !== "USD")
      .map((row) => `+ ${money(row.amount, row.currency, minor)}`)
      .join(" ");

  const rows = ledger === "subscriptions" ? data.invoices.invoices || [] : data.templates.purchases || [];
  const total = ledger === "subscriptions" ? data.invoices.total || 0 : data.templates.total || 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {/* revenue per currency (never added across currencies), and counts */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-md:flex-wrap max-lg:gap-3">
        <Kpi label="Subscription revenue" value={money(revenueIn(subStats, "USD"), "USD", true)} detail={otherCurrencies(subStats, true) || "Real payments only"} />
        <Kpi label="Subscriptions" value={new Intl.NumberFormat("en").format(subStats?.totalInvoices || 0)} detail="Paid invoices" />
        <Kpi label="Template revenue" value={money(revenueIn(tplStats, "USD"), "USD")} detail={otherCurrencies(tplStats, false) || "Paid, not credits"} />
        <Kpi label="Template sales" value={new Intl.NumberFormat("en").format(tplStats?.totalPurchases || 0)} detail="Purchases" />
      </div>

      {/* the ledger: subscriptions or template purchases */}
      <section aria-labelledby="ledger-h" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.2)] max-lg:gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ledger-h" className="type-h3">
            Ledger
          </h2>
          <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
            <SlidingSegment label="Payments" items={LEDGERS} value={ledger} onChange={filter(setLedger)} itemClassName="w-28" />
            {ledger === "templates" && (
              <FilterMenu
                tone="light"
                variant="label"
                alignRight
                widthClassName={FILTER_WIDTH}
                panelClassName="left-auto! right-0"
                options={Object.keys(TEMPLATE_FILTERS)}
                categoryFilter={template}
                activeFilter={template === "all" ? null : template}
                getLabel={(id) => TEMPLATE_FILTERS[id]}
                onSelect={filter(setTemplate)}
              />
            )}
            <DateRangeFilter label="Paid" value={dates} onChange={filter(setDates)} />
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
              {rows.length === 0 ? (
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
                      <td className="type-body whitespace-nowrap py-3 pr-4 text-right font-aeonik">{money(row.amount, row.currency, ledger === "subscriptions")}</td>
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
