// Every plan name, price and table row for the exploded-tiers pricing page.
// These are the live plans (Free + Pro, billed monthly or yearly through
// Razorpay). The concept's Pro+ / quarterly / template-credit tiers are not
// here because the backend doesn't sell them yet.

export const PRICING = {
  USD: { symbol: "$", locale: "en-US", monthly: 20, yearly: 179 },
  INR: { symbol: "₹", locale: "en-IN", monthly: 999, yearly: 8999 },
};

export const YEARLY_PERK = "3 months free";
export const INDIA_TAX_NOTE = "+18% GST";

export const PLANS = {
  free: {
    name: "Free",
    tagline: "For trying real effects in real projects",
    features: [
      "50+ production-ready effects",
      "Copy-paste + CLI install",
      "Commercial-friendly usage",
      "Code you own",
    ],
    cta: { text: "Browse free effects", href: "/effects/free" },
  },
  pro: {
    name: "Pro",
    tagline: "For developers, founders and agencies shipping premium work",
    features: [
      "All 150+ effects",
      "New effects added regularly",
      "Priority access to upcoming packs",
      "Hyperiux CLI install + auth",
      "Dependency, performance & reduced-motion notes per effect",
      "Code you own, commercial-friendly",
    ],
  },
};

export const ASSURANCES = [
  "Cancel anytime",
  "Everything you copy stays in your repo",
  "INR pricing for India",
  "Secure self-serve checkout",
];

// true = tick, false = dash, string = text
export const COMPARE_ROWS = [
  { feature: "Effects included", free: "50+ effects", pro: "Full library, all categories" },
  { feature: "New effects", free: false, pro: "Added monthly" },
  { feature: "Scroll & text effects", free: true, pro: true },
  { feature: "Cursor effects", free: false, pro: true },
  { feature: "WebGL scenes", free: false, pro: true },
  { feature: "Advanced page transitions", free: false, pro: true },
  { feature: "CLI install", free: true, pro: true },
  { feature: "Source code ownership", free: true, pro: true },
  { feature: "Commercial use", free: "Free core, where marked", pro: "Full commercial use" },
  { feature: "Updates & fixes", free: "Community cadence", pro: "Priority" },
  { feature: "Support", free: "GitHub / community", pro: "Email support" },
  { feature: "Team / agency use", free: "Individual use", pro: "Per seat · agency licensing available" },
];

export const PROMISES = [
  {
    title: "Ownership",
    text: "Every effect you install lands in your repository as source. No runtime dependency on Hyperiux. Cancel, and your code stays exactly where it is.",
  },
  {
    title: "Commercial use",
    text: "Free effects are commercial-friendly where marked in the license. Pro is built for production: client sites, SaaS products and internal tools alike.",
  },
  {
    title: "Teams & agencies",
    text: "Pro is licensed per seat. Working across client projects?",
    link: { text: "Talk to us about agency licensing", href: "mailto:hello@hyperiux.com" },
  },
];

export const pricingFor = (isIndia) => PRICING[isIndia ? "INR" : "USD"];

export function formatMoney(value, pricing) {
  const digits = pricing.symbol === "$" && value % 1 ? 2 : 0;
  return value.toLocaleString(pricing.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Per-month figure shown large on the Pro card: the monthly price, or the
// yearly price spread over twelve months.
export const perMonth = (pricing, yearly) => (yearly ? pricing.yearly / 12 : pricing.monthly);

export const yearlySavingPercent = (pricing) =>
  Math.round((1 - pricing.yearly / (pricing.monthly * 12)) * 100);

// Template credits: one credit unlocks one complete template as source code.
// NEEDS PRODUCT CONFIRMATION: credits aren't sold or tracked by the backend
// yet, so these counts come from the concept (Pro quarterly/yearly mapped
// onto monthly/yearly) and the Credits section is a demo wallet only.
export const CREDITS = { monthly: 1, yearly: 3 };

export const DEMO_TEMPLATES = [
  "Studio portfolio",
  "SaaS launch",
  "Agency showcase",
  "Product story",
  "Event microsite",
  "Personal site",
];
