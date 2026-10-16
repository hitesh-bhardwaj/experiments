"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { CARD, CARD_PAD, DetailRows } from "@/components/Dashboard/DashboardUI";
import { Bar, ButtonBar, SkeletonCard, useAccountHint } from "@/components/Dashboard/DashboardSkeletons";
import { refreshDashboard, useDashboardData } from "@/components/Dashboard/useDashboardData";
import { Modal } from "@/components/ui/SignInRequiredModal";
import Button from "@/homepage/components/Button";
import { PLANS, formatPrice, getMonthlyEquivalent } from "@/lib/plans";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";
import { getDashboardPreview, sampleInvoices } from "@/lib/dev/dashboardPreview";

const subscribeNever = () => () => {};

const INTERVAL_LABEL = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

const formatDate = (value) => (value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—");

// invoices.amount is in the smallest unit (paise / cents); template_purchases.amount in
// whole units (see api/admin/template-purchases)
function money(amount, currency, minorUnits = false) {
  if (typeof amount !== "number") return "—";
  const value = minorUnits ? amount / 100 : amount;
  const code = currency || "USD";
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", { style: "currency", currency: code, minimumFractionDigits: 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
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

// Loading: the dark current-plan card (its detail rows on Pro), the next-plan card beside it
// (not on Pro+), then the receipts table
function InvoicingSkeleton() {
  const { plan, tier } = useAccountHint();
  const isPro = plan === "pro";
  const upsell = tier !== "pro_plus";
  return (
    <div aria-busy="true" aria-label="Loading your billing" className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
        <SkeletonCard dark className={`justify-between gap-[calc(var(--cvw)*1.6)] max-lg:w-full max-lg:gap-6 ${upsell ? "w-[63%]" : "w-full"}`}>
          <div className="flex flex-col gap-2">
            <Bar type="type-label" className="w-28" />
            <Bar type="type-h2" className="w-[40%]" />
          </div>
          {isPro ? (
            <div className="flex flex-col">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between gap-4 border-t border-foreground/10 py-[calc(var(--cvw)*0.9)] first:border-t-0 max-lg:py-3">
                  <Bar type="type-small" className="w-24" />
                  <Bar type="type-body" className="w-[35%]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <Bar type="type-body" className="w-full" />
              <Bar type="type-body" className="w-[55%]" />
            </div>
          )}
          {isPro && <ButtonBar className="w-52" />}
        </SkeletonCard>
        {upsell && (
          <SkeletonCard className="flex-1 gap-(--cvw) max-lg:gap-4">
            <Bar type="type-label" className="w-28" />
            <Bar type="type-h2" className="w-[60%]" />
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <Bar key={i} type="type-body" className="w-[85%]" />
              ))}
            </div>
            <Bar type="type-small" className="w-[70%]" />
            <ButtonBar className="mt-auto w-40" />
          </SkeletonCard>
        )}
      </div>
      <SkeletonCard className="gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
        <div className="flex justify-between gap-3">
          <Bar type="type-h3" className="w-28" />
          <Bar type="type-small" className="w-52" />
        </div>
        <div className="flex flex-col">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.8)] last:border-b-0 max-lg:py-3">
              <Bar type="type-small" className="w-[14%]" />
              <Bar type="type-body" className="w-[30%] flex-1" />
              <Bar type="type-body" className="w-[10%]" />
              <Bar type="type-small" className="w-[8%]" />
              <Bar type="type-small" className="w-10" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export default function InvoicingPage() {
  const { path, isAdmin, username } = useDashboard();
  const router = useRouter();
  // Cached across tabs: the skeleton shows on the first load only
  const { data, failed, mutate } = useDashboardData(`invoices:${username}`, async () => {
    const preview = getDashboardPreview();
    if (preview) return sampleInvoices(preview);
    const res = await fetch("/api/dashboard/invoices", { cache: "no-store" });
    if (!res.ok) throw new Error(`invoices ${res.status}`);
    return res.json();
  });

  // Cancel subscription: asks first, then cancels at the end of the paid period
  // (api/user/cancel-subscription) - the plan stays until then
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  async function cancelSubscription() {
    setCancelling(true);
    setCancelError("");
    try {
      const preview = getDashboardPreview();
      if (!preview) {
        const res = await fetch("/api/user/cancel-subscription", { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Couldn’t cancel your subscription.");
      }
      mutate((current) => ({ ...current, cancelAtPeriodEnd: true }));
      // The overview's plan card follows too (the preview's sample data has no cancellation
      // to refetch, so it stays as set here)
      if (!preview) refreshDashboard();
      setCancelOpen(false);
    } catch (error) {
      setCancelError(error.message);
    } finally {
      setCancelling(false);
    }
  }

  // Personal billing: an admin account has none, so it goes back to the overview
  useEffect(() => {
    if (isAdmin) router.replace(path());
  }, [isAdmin, router, path]);

  if (failed) {
    return (
      <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
        <p className="type-h3">We couldn’t load your billing.</p>
        <p className="type-body text-black/60">Check your connection and reload the page.</p>
      </div>
    );
  }

  if (!data) return <InvoicingSkeleton />;

  const isPro = data.plan === "pro";
  const subscription = data.subscription;
  // Cancelled: already ended at Razorpay, or cancelled here and running to the period's end
  const cancelled = subscription?.status === "cancelled" || Boolean(data.cancelAtPeriodEnd);
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
    // A template redeemed with a credit was never paid for: "1 credit", nothing to download
    ...data.templatePurchases.map((purchase) => ({
      id: purchase.id,
      date: purchase.createdAt,
      description: `Template · ${purchase.templateTitle}`,
      amount: purchase.redeemedWithCredit ? "1 credit" : money(purchase.amount, purchase.currency),
      status: purchase.redeemedWithCredit && purchase.status === "paid" ? "redeemed" : purchase.status,
      url: purchase.redeemedWithCredit ? null : purchase.invoiceUrl,
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
                ["Status", <span key="s" className="capitalize">{cancelled ? "cancelled" : subscription?.status || "active"}</span>],
                [cancelled ? "Access until" : "Renews on", formatDate(subscription?.current_period_end)],
                ["Billing cycle", interval ? `${interval}, ${cancelled ? "doesn’t renew" : "renews automatically"}` : "—"],
                ["Last payment", lastPayment ? `${money(lastPayment.amount, lastPayment.currency, true)} on ${formatDate(lastPayment.created_at)}` : "—"],
                ["Payment", subscription?.razorpay_subscription_id ? "Managed by Razorpay" : "Access granted by the Vault team"],
              ]}
            />
          )}
          {!isPro && <p className="type-body text-foreground/80">Free accounts get the free effects and 3 a day. Upgrade for every effect and template credits.</p>}

          {/* free accounts upgrade from the Pro card beside this one */}
          {/* manage at Razorpay, and cancel (only a paid subscription that's still renewing) */}
          {isPro && (subscription?.razorpay_short_url || (subscription?.razorpay_subscription_id && !cancelled)) && (
            <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
              {subscription?.razorpay_short_url && <Button text="Manage subscription" href={subscription.razorpay_short_url} target_blank className="w-fit" />}
              {subscription?.razorpay_subscription_id && !cancelled && <Button text="Cancel subscription" variant="outline" preventDefault onClick={() => setCancelOpen(true)} className="w-fit" />}
            </div>
          )}
          {isPro && cancelled && (
            <p className="type-small text-foreground/80">
              Cancelled. You keep {planName} until {formatDate(subscription?.current_period_end)}, then your account moves to Free.
            </p>
          )}

          {mounted &&
            createPortal(
              <Modal open={cancelOpen} onClose={() => !cancelling && setCancelOpen(false)} title="Cancel your subscription?">
                {`You keep ${planName} until ${formatDate(subscription?.current_period_end)}. After that your account moves to Free and you won’t be charged again. The rest of this period isn’t refunded.`}
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-wrap items-center justify-center gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
                    <Button text={cancelling ? "Cancelling…" : "Cancel subscription"} preventDefault disabled={cancelling} onClick={cancelSubscription} />
                    <button type="button" disabled={cancelling} onClick={() => setCancelOpen(false)} className="type-label cursor-pointer text-foreground underline underline-offset-3 transition-colors duration-300 hover:text-primary disabled:opacity-60">
                      Keep it
                    </button>
                  </div>
                  {cancelError && (
                    <p role="alert" className="type-small text-primary">
                      {cancelError}
                    </p>
                  )}
                </div>
              </Modal>,
              document.body,
            )}
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
              <span className="flex-1 text-center">Description</span>
              <span className="w-[14%] text-center">Amount</span>
              <span className="w-[12%] text-center">Status</span>
              <span className="w-16 text-right">Receipt</span>
            </div>
            {receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.8)] last:border-b-0 max-lg:py-3 max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-1">
                <span className="type-small w-[18%] text-black/60 max-md:order-2 max-md:w-auto ">{formatDate(receipt.date)}</span>
                <span className="type-body min-w-0 flex-1 max-md:order-1 max-md:w-full max-md:flex-none text-center">{receipt.description}</span>
                <span className="type-body w-[14%] text-center font-aeonik max-md:order-3 max-md:w-auto">{receipt.amount}</span>
                <span className="type-small inline-flex w-[12%] items-center justify-center gap-1.5 capitalize max-md:order-4 max-md:w-auto">
                  <span aria-hidden="true" className={`size-1.5 rounded-full ${receipt.status === "paid" || receipt.status === "redeemed" ? "bg-primary" : "bg-black/20"}`} />
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
