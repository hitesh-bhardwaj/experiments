// The one table of what each paid plan costs and includes. Safe to import on
// the client: the pricing page, upgrade modal and template modals render
// from it, and the server reads the same numbers for checkout, install
// limits and template credits - so a price or a limit only ever changes here.
// Razorpay plan IDs are server-only and live in plans.server.js.
//
// Tiers are stored in subscriptions.tier ("pro" | "pro_plus"). Every paid
// subscriber still has subscriptions.plan = "pro" - that column means "has
// a paid plan" and is what effect access, the CLI and the dashboard gate on.

export const TIERS = ["pro", "pro_plus"];
export const INTERVALS = ["quarterly", "yearly"];
export const CURRENCIES = ["USD", "INR"];

// INR prices are before GST; Razorpay charges them with GST added.
export const GST_RATE = 0.18;

export const PLANS = {
  pro: {
    id: "pro",
    name: "Pro",
    installsPerDay: 5,
    // Which templates this tier's credits can redeem
    catalogue: "selected",
    prices: {
      quarterly: { USD: 27, INR: 1347 },
      yearly: { USD: 79, INR: 4490 },
    },
    // `amount` credits on the 1st charge and every `everyCharges` after it.
    // Pro only earns credits on yearly billing: 3 a year, none on quarterly.
    credits: {
      yearly: { amount: 3, everyCharges: 1 },
    },
  },
  pro_plus: {
    id: "pro_plus",
    name: "Pro+",
    installsPerDay: 10,
    catalogue: "full",
    prices: {
      quarterly: { USD: 57, INR: 2997 },
      yearly: { USD: 179, INR: 8999 },
    },
    // Quarterly Pro+ gets 1 credit every quarter, yearly Pro+ 5 a year.
    credits: {
      quarterly: { amount: 1, everyCharges: 1 },
      yearly: { amount: 5, everyCharges: 1 },
    },
  },
};

export const CURRENCY_SYMBOLS = { USD: "$", INR: "₹" };

const MONTHS = { quarterly: 3, yearly: 12 };

export function isValidTier(tier) {
  return TIERS.includes(tier);
}

export function isValidInterval(interval) {
  return INTERVALS.includes(interval);
}

export function getPlan(tier) {
  return PLANS[tier] || null;
}

// The amount billed each period, before GST
export function getPrice(tier, interval, currency = "USD") {
  return PLANS[tier]?.prices[interval]?.[currency] ?? null;
}

// What one month works out to: $6.58 for yearly Pro. Cents for USD,
// whole rupees for INR.
export function getMonthlyEquivalent(tier, interval, currency = "USD") {
  const price = getPrice(tier, interval, currency);
  if (price == null) return null;
  const perMonth = price / MONTHS[interval];
  return currency === "INR" ? Math.round(perMonth) : Math.round(perMonth * 100) / 100;
}

// Yearly against four quarters: { amount: 29, percent: 27 } for Pro in USD
export function getYearlySaving(tier, currency = "USD") {
  const quarterly = getPrice(tier, "quarterly", currency);
  const yearly = getPrice(tier, "yearly", currency);
  if (quarterly == null || yearly == null) return null;
  const fullYear = quarterly * 4;
  return { amount: fullYear - yearly, percent: Math.round(((fullYear - yearly) / fullYear) * 100) };
}

// Template credits a plan adds over one year
export function getCreditsPerYear(tier, interval) {
  const rule = PLANS[tier]?.credits[interval];
  if (!rule) return 0;
  const chargesPerYear = 12 / MONTHS[interval];
  return Math.ceil(chargesPerYear / rule.everyCharges) * rule.amount;
}

// Credits added by the Nth successful charge (paidCount starts at 1)
export function getCreditsForCharge(tier, interval, paidCount) {
  const rule = PLANS[tier]?.credits[interval];
  if (!rule || !Number.isInteger(paidCount) || paidCount < 1) return 0;
  return (paidCount - 1) % rule.everyCharges === 0 ? rule.amount : 0;
}

// Whether a tier's credits can redeem a template from this catalogue
// ("selected" | "full")
export function canRedeemCatalogue(tier, catalogue) {
  const plan = PLANS[tier];
  if (!plan) return false;
  return plan.catalogue === "full" || catalogue !== "full";
}

export function formatPrice(amount, currency = "USD") {
  if (amount == null) return "";
  const symbol = CURRENCY_SYMBOLS[currency] || "";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  return `${symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function getPlanLabel(tier, interval) {
  const name = PLANS[tier]?.name;
  if (!name) return "Vault Pro";
  if (interval === "yearly") return `Vault ${name} Annual`;
  if (interval === "quarterly") return `Vault ${name} Quarterly`;
  if (interval === "monthly") return `Vault ${name} Monthly`;
  return `Vault ${name}`;
}
