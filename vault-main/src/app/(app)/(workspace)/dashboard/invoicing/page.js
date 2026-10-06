"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Download } from "lucide-react";

function formatDate(value) {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

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

function getBillingLabel(value) {
  const labels = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };

  return labels[value] || "Not available";
}

// A4 in points (jsPDF's "pt" unit) - used for right-aligning against the
// page's right margin.
const PAGE_WIDTH = 595.28;

async function downloadInvoiceReceipt(invoice) {
  // Dynamic import: jsPDF only runs client-side and isn't needed until
  // someone actually clicks Download, so keep it out of the page's initial
  // bundle.
  const { jsPDF } = await import("jspdf");

  const amount = formatAmount(invoice.amount, invoice.currency);
  const date = formatDate(invoice.created_at);
  const planLabel = invoice.plan_label || "Vault Pro";
  const billingInterval = getBillingLabel(invoice.billing_interval);
  const paymentId = invoice.razorpay_payment_id || "-";
  const status = invoice.status || "paid";

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const rightX = PAGE_WIDTH - marginX;
  let y = 64;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text("Hyperiux Vault", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text("Payment Receipt", marginX, y + 18);

  doc.setFontSize(10);
  doc.text(`Date: ${date}`, rightX, y, { align: "right" });

  y += 40;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, rightX, y);
  y += 28;

  if (invoice.is_test) {
    doc.setFillColor(255, 95, 0);
    doc.roundedRect(marginX, y - 14, 168, 20, 10, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("TEST INVOICE - NOT REAL", marginX + 84, y, { align: "center" });
    y += 32;
  }

  const rows = [
    ["Plan", planLabel],
    ["Billing interval", billingInterval],
    ["Payment ID", paymentId],
    ["Status", status.charAt(0).toUpperCase() + status.slice(1)],
  ];

  doc.setFontSize(11);
  rows.forEach(([label, value]) => {
    doc.setTextColor(120, 120, 120);
    doc.text(label, marginX, y);
    doc.setTextColor(20, 20, 20);
    doc.text(String(value), rightX, y, { align: "right" });
    y += 10;
    doc.setDrawColor(235, 235, 235);
    doc.line(marginX, y, rightX, y);
    y += 20;
  });

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("Total", marginX, y);
  doc.text(amount, rightX, y, { align: "right" });

  y += 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This receipt was generated from your Hyperiux Vault account.",
    marginX,
    y
  );

  doc.save(`hyperiux-invoice-${paymentId !== "-" ? paymentId : invoice.id}.pdf`);
}

function StatCard({ label, value, detail }) {
  return (
    <div className="flex h-full flex-col justify-between  p-6 bg-[#272727]">
      <p className="text-white mb-3">{label}</p>

      <p className="text-2xl font-medium font-laygrotesk leading-none">{value}</p>

      {detail && <div className="text-[#838383] mt-4">{detail}</div>}
    </div>
  );
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

export default function InvoicingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const isAdmin = user?.publicMetadata?.role === "admin";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  async function loadInvoices() {
    try {
      const res = await fetch("/api/dashboard/invoices");

      if (!res.ok) {
        throw new Error("Failed to load invoices");
      }

      const json = await res.json();

      setData(json);
      setLoadError(false);
    } catch (error) {
      console.error(error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Invoicing is a customer-billing concept - admins don't have a paid
    // subscription of their own to review, so send them back rather than
    // showing an empty page.
    if (isLoaded && isAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isAdmin, router]);

  useEffect(() => {
    if (!isLoaded || isAdmin) return;

    const frame = requestAnimationFrame(() => {
      loadInvoices();
    });

    return () => cancelAnimationFrame(frame);
  }, [isLoaded, isAdmin]);

  if (!isLoaded || isAdmin || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400">Loading invoicing...</p>
      </div>
    );
  }

  // Falls back to Clerk's client-side plan metadata (same field VaultHeader
  // already reads) when the API call failed, so the page - and crucially
  // the test-invoice button - still renders instead of hanging on a spinner.
  const plan = data?.plan || user?.publicMetadata?.plan || "free";
  const subscription = data?.subscription || null;
  const invoices = data?.invoices || [];
  const templatePurchases = data?.templatePurchases || [];
  const isPro = plan === "pro";
  const hasRealSubscription = Boolean(subscription?.razorpay_subscription_id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-display text-white">Invoicing</h1>

        <p className="text-white mt-2">
          Your plan validity, billing details, and previous invoices.
        </p>
      </div>

      {loadError && (
        <div className=" border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-amber-300">
          Couldn&apos;t load your billing history right now. You can still
          generate a test invoice below.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5">
        <StatCard
          label="Plan"
          value={<span className="capitalize">{plan}</span>}
          detail={
            isPro
              ? `Billed ${getBillingLabel(subscription?.billing_interval).toLowerCase()}`
              : "Upgrade to unlock Pro billing"
          }
        />

        <StatCard
          label="Valid Until"
          value={
            isPro
              ? subscription?.current_period_end
                ? formatDate(subscription.current_period_end)
                : "Active"
              : "-"
          }
          detail={
            isPro
              ? `Status: ${subscription?.status || "active"}`
              : null
          }
        />

        <StatCard
          label="Payment & Card"
          value={hasRealSubscription ? "Managed via Razorpay" : "No active billing"}
          detail={
            hasRealSubscription && subscription?.razorpay_short_url ? (
              <a
                href={subscription.razorpay_short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ff5f00] hover:text-[#ff7a29]"
              >
                Update card / manage subscription
              </a>
            ) : isPro ? (
              "This Pro access was granted directly - no card on file."
            ) : (
              <a href="/pricing" className="text-[#ff5f00] hover:text-[#ff7a29]">
                View plans
              </a>
            )
          }
        />
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">Previous Bills</h2>
        </div>

        {invoices.length === 0 ? (
          <div className=" p-12 bg-[#272727] text-center">
            <h3 className="text-2xl text-white mb-2">No invoices yet</h3>

            <p className="text-zinc-400">
              {isPro
                ? "Your bills will show up here as soon as a payment goes through."
                : "Upgrade to Pro to start seeing invoices here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto  bg-[#272727]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Receipt</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-white/5 last:border-0">
                    <td className="px-6 py-4 text-white">{formatDate(invoice.created_at)}</td>

                    <td className="px-6 py-4 text-white/80">
                      {invoice.plan_label || "Vault Pro"}
                    </td>

                    <td className="px-6 py-4 text-white">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {invoice.invoice_url && (
                          <a
                            href={invoice.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#ff5f00] hover:text-[#ff7a29]"
                          >
                            View
                          </a>
                        )}

                        {/* <button
                          type="button"
                          onClick={() => downloadInvoiceReceipt(invoice)}
                          className="inline-flex items-center gap-1.5 text-white/70 transition hover:text-white cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button> */} 
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">Template Purchases</h2>
        </div>

        {templatePurchases.length === 0 ? (
          <div className=" p-12 bg-[#272727] text-center">
            <h3 className="text-2xl text-white mb-2">No template purchases yet</h3>

            <p className="text-zinc-400">
              Templates you buy standalone will show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto  bg-[#272727]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Template</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Receipt</th>
                </tr>
              </thead>

              <tbody>
                {templatePurchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-white/5 last:border-0">
                    <td className="px-6 py-4 text-white">{formatDate(purchase.createdAt)}</td>

                    <td className="px-6 py-4 text-white/80">{purchase.templateTitle}</td>

                    <td className="px-6 py-4 text-white">
                      {formatTemplateAmount(purchase.amount, purchase.currency)}
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
        )}
      </div>
    </div>
  );
}
