"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DateRangeCalendarPicker } from "@/components/admin/DateRangeCalendarPicker";
import { useAdminRole } from "@/lib/useAdminRole";
import { TemplatePurchasesPanel } from "@/components/admin/TemplatePurchasesPanel";

// Payment detail across every user - restricted to super admins (see
// api/admin/invoices/route.js), unlike the rest of /dashboard/admin which
// any admin can see. requireAdmin() in admin/layout.js already keeps
// regular non-admins out; this page adds the stricter super-admin-only gate
// on top, same pattern as the Revenue Overview strip on User Management.

const EVENTS_PER_PAGE = 15;

// Same date-range picker as dashboard/admin/activity - both tables below
// (Subscription Invoices via api/admin/invoices, Template Purchases via
// TemplatePurchasesPanel) get scoped to this one shared range instead of
// each defaulting to its own "all time" window.
const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatAmount(amount, currency = "INR") {
  if (typeof amount !== "number") return "-";

  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

function getBillingLabel(value) {
  const labels = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };
  return labels[value] || "-";
}

// Looks up each currency's own total from stats.revenueByCurrency instead
// of summing the array - invoices mixes INR and USD, so a single blended
// tile would silently add unlike units (same reasoning as the Activity
// Overview page's revenueFor()). Currencies with zero real revenue still
// render a ₹0/$0 tile rather than disappearing.
function revenueFor(stats, currency) {
  return stats?.revenueByCurrency?.find((row) => row.currency === currency)?.amount || 0;
}

// No Clerk identity ever falls back to "Anonymous" here (unlike the
// install-activity log) - every invoice has a clerk_user_id by construction
// (recordInvoice() requires one), so the only failure mode is a user whose
// Clerk account was later deleted, which falls back to the raw id.
// Shared between the invoices table and the template-purchases table below -
// both API routes return the same userName/userEmail/userImageUrl/userId
// shape (see api/admin/invoices and api/admin/template-purchases).
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

export default function AdminInvoicingPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: roleLoading } = useAdminRole();

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [prevRangeKey, setPrevRangeKey] = useState("");

  // Reset to page 1 whenever the range changes - derived purely from a
  // value already available during render, so adjust it here instead of in
  // an effect.
  const rangeKey = `${range}:${customFrom}:${customTo}`;
  if (prevRangeKey !== rangeKey) {
    setPrevRangeKey(rangeKey);
    setCurrentPage(1);
  }

  useEffect(() => {
    // Billing detail across every user is a step up from what a regular
    // admin can already see in User Management - send non-super-admins back
    // rather than showing an empty/forbidden page.
    if (!roleLoading && !isSuperAdmin) {
      router.replace("/dashboard/admin");
    }
  }, [roleLoading, isSuperAdmin, router]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (range === "custom") {
        if (customFrom) params.set("from", customFrom);
        if (customTo) params.set("to", customTo);
      } else {
        params.set("range", range);
      }
      params.set("limit", String(EVENTS_PER_PAGE));
      params.set("offset", String((currentPage - 1) * EVENTS_PER_PAGE));

      const res = await fetch(`/api/admin/invoices?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load invoices");
      setInvoices(json.invoices || []);
      setTotal(json.total || 0);
      setStats(json.stats || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo, currentPage]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    // Fetches from a network API in response to filter/page changes - this
    // is a genuine external-system sync, not derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInvoices();
  }, [isSuperAdmin, fetchInvoices]);

  if (roleLoading || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/40">Loading…</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / EVENTS_PER_PAGE));

  const isCustomRange = range === "custom";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoicing</h1>
          <p className="mt-1 text-sm text-white/50">Every real payment recorded across all users.</p>
        </div>
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

      <h2 className="text-lg font-medium text-white/90">Subscription Invoices</h2>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Total Invoices" value={stats ? stats.totalInvoices : "…"} detail="Real payments only" />
        <StatCard
          label="Revenue (INR)"
          value={stats ? formatAmount(revenueFor(stats, "INR"), "INR") : "…"}
          detail="Real payments only"
        />
        <StatCard
          label="Revenue (USD)"
          value={stats ? formatAmount(revenueFor(stats, "USD"), "USD") : "…"}
          detail="Real payments only"
        />
      </div>

      {error && (
        <div className=" border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className=" border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Billing</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/45 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Payment ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4  bg-white/8 animate-pulse" style={{ width: j === 0 ? "140px" : "70px" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-white/40">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="transition hover:bg-white/2">
                    <td className="px-4 py-3">
                      <UserCell record={invoice} />
                    </td>
                    <td className="px-4 py-3 text-white/80">{invoice.planLabel || "Vault Pro"}</td>
                    <td className="px-4 py-3 text-white/60">{getBillingLabel(invoice.billingInterval)}</td>
                    <td className="px-4 py-3 text-right font-medium text-white whitespace-nowrap">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/50" title={invoice.paymentId}>
                      {invoice.paymentId ? `${invoice.paymentId.slice(0, 16)}…` : "-"}
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap text-xs">
                      {formatDate(invoice.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.invoiceUrl ? (
                        <a
                          href={invoice.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#ff5f00] hover:text-[#ff7a29]"
                        >
                          View
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

      {!loading && invoices.length > 0 && (
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

      <h2 className="text-lg font-medium text-white/90 pt-4">Template Purchases</h2>

      <TemplatePurchasesPanel range={range} customFrom={customFrom} customTo={customTo} />
    </div>
  );
}
