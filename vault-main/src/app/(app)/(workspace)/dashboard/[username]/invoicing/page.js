"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { CARD, CARD_PAD, DetailRows } from "@/components/Dashboard/DashboardUI";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/homepage/components/Button";
import { PLANS, formatPrice, getMonthlyEquivalent } from "@/lib/plans";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";
import { getDashboardPreview, sampleInvoices } from "@/lib/dev/dashboardPreview";

const INTERVAL_LABEL = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

const formatDate = (value) => (value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—");

// invoices.amount is in the smallest unit (paise / cents); template_purchases.amount in
// whole units (see api/admin/template-purchases)
function money(amount, currency = "USD", minorUnits = false) {
  if (typeof amount !== "number") return "—";
  const value = minorUnits ? amount / 100 : amount;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

// The next plan up, with what it adds - Pro for free accounts, Pro+ for Pro
function nextPlan(plan, tier) {
  if (plan !== "pro") {
    const pro = PLANS.pro;
    return {
      label: "Pro · Yearly",
      lead: "Go",
      accent: "Pro.",
      ticks: ["Every effect, free and Pro", `${pro.installsPerDay} effects a day across web, CLI and MCP`, `${pro.credits.yearly.amount} template credits a year`],
      price: `${formatPrice(pro.prices.yearly.USD)} a year · about ${formatPrice(getMonthlyEquivalent("pro", "yearly"))}/mo`,
      cta: "Upgrade to Pro",
    };
  }
  if (tier === "pro_plus") return null;
  const plus = PLANS.pro_plus;
  return {
    label: "Pro+ · Yearly",
    lead: "Go",
    accent: "further.",
    ticks: [`${plus.installsPerDay} effects a day across web, CLI and MCP`, `${plus.credits.yearly.amount} template credits a year, full catalogue`, "Everything in Pro"],
    price: `${formatPrice(plus.prices.yearly.USD)} a year · about ${formatPrice(getMonthlyEquivalent("pro_plus", "yearly"))}/mo`,
    cta: "Upgrade to Pro+",
  };
}

export default function InvoicingPage() {
  const { path, isAdmin } = useDashboard();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  // Personal billing: an admin account has none, so it goes back to the overview
  useEffect(() => {
    if (isAdmin) router.replace(path());
  }, [isAdmin, router, path]);

  useEffect(() => {
    let active = true;
    const preview = getDashboardPreview();
    if (preview) {
      requestAnimationFrame(() => active && setData(sampleInvoices(preview)));
      return () => {
        active = false;
      };
    }
    fetch("/api/dashboard/invoices")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`invoices ${res.status}`))))
      .then((json) => active && setData(json))
      .catch((error) => {
        console.error(error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed) {
    return (
      <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
        <p className="type-h3">We couldn’t load your billing.</p>
        <p className="type-body text-black/60">Check your connection and reload the page.</p>
      </div>
    );
  }

  // Loading: each card as one block
  if (!data) {
    return (
      <div aria-busy="true" aria-label="Loading your billing" className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
        <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
          <Skeleton className="h-[calc(var(--cvw)*22)] w-[63%] max-lg:h-80 max-lg:w-full" />
          <Skeleton className="h-[calc(var(--cvw)*22)] flex-1 max-lg:h-72" />
        </div>
        <Skeleton className="h-[calc(var(--cvw)*14)] w-full max-lg:h-56" />
      </div>
    );
  }

  const isPro = data.plan === "pro";
  const subscription = data.subscription;
  const interval = INTERVAL_LABEL[subscription?.billing_interval];
  const planName = isPro ? (data.tier === "pro_plus" ? "Pro+" : "Pro") : "Free";
  const upsell = nextPlan(data.plan, data.tier);

  // Subscription and template payments together, newest first
  const receipts = [
    ...data.invoices.map((invoice) => ({
      id: invoice.id,
      date: invoice.created_at,
      description: `${invoice.plan_label || "Vault Pro"}${INTERVAL_LABEL[invoice.billing_interval] ? ` · ${INTERVAL_LABEL[invoice.billing_interval]}` : ""}`,
      amount: money(invoice.amount, invoice.currency, true),
      status: invoice.status,
      url: invoice.invoice_url,
    })),
    ...data.templatePurchases.map((purchase) => ({
      id: purchase.id,
      date: purchase.createdAt,
      description: `Template · ${purchase.templateTitle}`,
      amount: money(purchase.amount, purchase.currency),
      status: purchase.status,
      url: purchase.invoiceUrl,
    })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const lastPayment = data.invoices?.[0];

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {/* current plan, and the next plan up */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
        <section aria-labelledby="current-plan-h" className={`flex flex-col justify-between gap-[calc(var(--cvw)*1.6)] bg-ink text-foreground ${CARD_PAD} max-lg:w-full max-lg:gap-6 ${upsell ? "w-[63%]" : "w-full"}`}>
          <div className="flex flex-col gap-2">
            <p className="type-label text-foreground/80">Current plan</p>
            <h2 id="current-plan-h" className="type-h2">
              {planName}
              {isPro && interval && <span className="text-primary"> · {interval}</span>}
            </h2>
          </div>

          {isPro && (
            <DetailRows
              tone="dark"
              rows={[
                ["Status", <span key="s" className="capitalize">{subscription?.status || "active"}</span>],
                [subscription?.status === "cancelled" ? "Access until" : "Renews on", formatDate(subscription?.current_period_end)],
                ["Billing cycle", interval ? `${interval}, renews automatically` : "—"],
                ["Last payment", lastPayment ? `${money(lastPayment.amount, lastPayment.currency, true)} on ${formatDate(lastPayment.created_at)}` : "—"],
                ["Payment", subscription?.razorpay_subscription_id ? "Managed by Razorpay" : "Access granted by the Vault team"],
              ]}
            />
          )}
          {!isPro && <p className="type-body text-foreground/80">Free accounts get the free effects and 3 a day. Upgrade for every effect and template credits.</p>}

          {/* free accounts upgrade from the Pro card beside this one */}
          {isPro && subscription?.razorpay_short_url && <Button text="Manage subscription" href={subscription.razorpay_short_url} target_blank />}
        </section>

        {upsell && (
          <section aria-labelledby="upsell-h" className={`${CARD} ${CARD_PAD} flex-1 gap-(--cvw) max-lg:gap-4`}>
            <p className="type-label text-black/60">{upsell.label}</p>
            <h2 id="upsell-h" className="type-h2">
              {upsell.lead} <span className="gradient-text-animate">{upsell.accent}</span>
            </h2>
            <ul className="flex flex-col gap-2">
              {upsell.ticks.map((tick) => (
                <li key={tick} className="type-body flex items-start gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {tick}
                </li>
              ))}
            </ul>
            <p className="type-small text-black/60">{upsell.price}</p>
            <div className="mt-auto">
              <Button text={upsell.cta} href="/pricing#plans" onClick={markScrollToPricingCards} className="w-fit" />
            </div>
          </section>
        )}
      </div>

      {/* every payment */}
      <section aria-labelledby="receipts-h" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.2)] max-lg:gap-4`}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="receipts-h" className="type-h3">
            Receipts
          </h2>
          <p className="type-small text-black/60">Subscription and template payments</p>
        </div>
        {receipts.length === 0 ? (
          <p className="type-body text-black/60">No payments yet. Your receipts show up here once a payment goes through.</p>
        ) : (
          <div className="flex flex-col">
            <div className="type-label flex items-center gap-4 border-b border-black/10 pb-3 text-black/60 max-md:hidden">
              <span className="w-[18%]">Date</span>
              <span className="flex-1">Description</span>
              <span className="w-[14%] text-right">Amount</span>
              <span className="w-[12%]">Status</span>
              <span className="w-16 text-right">Receipt</span>
            </div>
            {receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.8)] last:border-b-0 max-lg:py-3 max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-1">
                <span className="type-small w-[18%] text-black/60 max-md:order-2 max-md:w-auto">{formatDate(receipt.date)}</span>
                <span className="type-body min-w-0 flex-1 max-md:order-1 max-md:w-full max-md:flex-none">{receipt.description}</span>
                <span className="type-body w-[14%] text-right font-aeonik max-md:order-3 max-md:w-auto">{receipt.amount}</span>
                <span className="type-small inline-flex w-[12%] items-center gap-1.5 capitalize max-md:order-4 max-md:w-auto">
                  <span aria-hidden="true" className={`size-1.5 rounded-full ${receipt.status === "paid" ? "bg-primary" : "bg-black/20"}`} />
                  {receipt.status || "unknown"}
                </span>
                <span className="w-16 text-right max-md:order-5 max-md:ml-auto max-md:w-auto">
                  {receipt.url ? (
                    <a href={receipt.url} target="_blank" rel="noopener noreferrer" className="type-small text-ink underline underline-offset-3 transition-colors duration-300 hover:text-primary">
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
