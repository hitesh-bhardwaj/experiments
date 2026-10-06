"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { TEMPLATES } from "@/lib/mock-templates";

// Shared by dashboard/admin/invoicing (unscoped - "every template purchase,
// ever") and dashboard/admin/activity (scoped to that page's date-range
// picker via `range`/`customFrom`/`customTo`, so this table stays in step
// with the leaderboards/charts around it instead of always silently
// showing "all time" regardless of what's selected elsewhere on the page).
// Extracted from what was previously invoicing-page-only JSX so both places
// get the same table, pagination, and "View Bill" link for free.

const PURCHASES_PER_PAGE = 15;
const TEMPLATE_FILTERS = [
  { id: "all", label: "All templates" },
  ...TEMPLATES.map((t) => ({ id: t.slug, label: t.title })),
];

// create-order/route.js creates a real Razorpay Invoice (not a bare Order)
// for every template purchase, specifically so purchase.invoiceUrl is a
// genuine hosted receipt (rzp.io/... -> invoices.razorpay.com/...) - same
// kind of link subscription invoices already have. Purchases made before
// that change have no invoice_url on file, so this falls back to the
// merchant dashboard's payment record instead of a dead link.
function billHref(purchase) {
  return purchase.invoiceUrl || `https://dashboard.razorpay.com/app/payments/${purchase.paymentId}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

// template_purchases.amount is already whole currency units (see
// api/admin/template-purchases/route.js), unlike invoices.amount elsewhere
// in this app - this must not divide by 100.
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

function UserCell({ record }) {
  return (
    <div className="flex items-center gap-3">
      {record.userImageUrl ? (
        <Image
          src={record.userImageUrl}
          alt={record.userName || ""}
          width={28}
          height={28}
          className="h-7 w-7  object-cover ring-1 ring-white/10"
        />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center  bg-white/10 text-xs font-medium">
          {(record.userName?.[0] || record.userEmail?.[0] || "?").toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium text-white max-w-48">{record.userName || "-"}</p>
        <p className="truncate text-xs text-white/45 max-w-48">{record.userEmail || record.userId}</p>
      </div>
    </div>
  );
}

export function TemplatePurchasesPanel({ range, customFrom, customTo }) {
  const [purchases, setPurchases] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [prevTemplateFilter, setPrevTemplateFilter] = useState(templateFilter);

  // Reset to page 1 whenever the filter changes - derived purely from a
  // value already available during render, so adjust it here instead of in
  // an effect.
  if (prevTemplateFilter !== templateFilter) {
    setPrevTemplateFilter(templateFilter);
    setCurrentPage(1);
  }

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (templateFilter !== "all") params.set("template", templateFilter);
      if (range === "custom") {
        if (customFrom) params.set("from", customFrom);
        if (customTo) params.set("to", customTo);
      } else if (range) {
        params.set("range", range);
      }
      params.set("limit", String(PURCHASES_PER_PAGE));
      params.set("offset", String((currentPage - 1) * PURCHASES_PER_PAGE));

      const res = await fetch(`/api/admin/template-purchases?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load template purchases");
      setPurchases(json.purchases || []);
      setTotal(json.total || 0);
      setStats(json.stats || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [templateFilter, currentPage, range, customFrom, customTo]);

  useEffect(() => {
    // Genuine external-system sync (filter/page/range changed) - not
    // derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPurchases();
  }, [fetchPurchases]);

  const totalPages = Math.max(1, Math.ceil(total / PURCHASES_PER_PAGE));

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <StatCard label="Total Purchases" value={stats ? stats.totalPurchases : "…"} />
        <StatCard
          label="Total Revenue"
          value={
            stats
              ? stats.revenueByCurrency.map((r) => formatTemplateAmount(r.amount, r.currency)).join(" + ") ||
                formatTemplateAmount(0, "USD")
              : "…"
          }
          detail={
            stats && stats.revenueByCurrency.length > 1
              ? "Shown per currency, not summed - mixing USD and INR into one total would be wrong"
              : undefined
          }
        />
      </div>

      <div className="flex gap-3 flex-wrap">
        <CustomSelect
          value={templateFilter}
          onChange={setTemplateFilter}
          options={TEMPLATE_FILTERS.map((f) => ({ value: f.id, label: f.label }))}
        />
      </div>

      {error && (
        <div className=" border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className=" border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Template</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/45 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Payment ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4  bg-white/8 animate-pulse" style={{ width: j === 0 ? "140px" : "70px" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-white/40">
                    No template purchases found.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase.id} className="transition hover:bg-white/2">
                    <td className="px-4 py-3">
                      <UserCell record={purchase} />
                    </td>
                    <td className="px-4 py-3 text-white/80">{purchase.templateTitle}</td>
                    <td className="px-4 py-3 text-right font-medium text-white whitespace-nowrap">
                      {formatTemplateAmount(purchase.amount, purchase.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/50" title={purchase.paymentId}>
                      {purchase.paymentId ? `${purchase.paymentId.slice(0, 16)}…` : "-"}
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap text-xs">
                      {formatDate(purchase.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {purchase.invoiceUrl || purchase.paymentId ? (
                        <a
                          href={billHref(purchase)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#ff5f00] transition hover:text-[#ff7a29]"
                        >
                          View Bill
                        </a>
                      ) : (
                        <span className="text-xs text-white/25">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && purchases.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-white/45">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center  border border-white/10 bg-white/5 text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center  border border-white/10 bg-white/5 text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
