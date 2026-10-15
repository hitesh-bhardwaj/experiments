// Development-only dashboard preview. Clerk can't sign in on localhost (production keys),
// so the dashboard can't be seen while working on it. In `next dev` only, a
// `vault-dev-preview` cookie lets /dashboard pages through the proxy without a session
// (src/proxy.js) and swaps their API data for the samples below. Production builds never
// take this path: every check is behind NODE_ENV === "development".
//
//   document.cookie = "vault-dev-preview=pro"   // or "free", or "admin" (a Pro super admin,
//                                               // for the admin view's shell); clear it to turn it off

export const DASHBOARD_PREVIEW_COOKIE = "vault-dev-preview";

// The preview has no session, so its dashboard lives at /dashboard/preview.
export const DEV_PREVIEW_USERNAME = "preview";

// "pro" | "free" | "admin" when the preview is on, else null
export function getDashboardPreview() {
  if (process.env.NODE_ENV !== "development" || typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${DASHBOARD_PREVIEW_COOKIE}=`))
    ?.split("=")[1];
  return value === "free" || value === "admin" ? value : value ? "pro" : null;
}

// Server side (admin layout): whether the preview is the admin one
export function isDevAdminPreview(cookieStore) {
  return process.env.NODE_ENV === "development" && cookieStore.get(DASHBOARD_PREVIEW_COOKIE)?.value === "admin";
}

// Same shape as GET /api/dashboard
export function sampleDashboard(plan = "pro") {
  const pro = plan !== "free";
  return {
    plan: pro ? "pro" : "free",
    tier: pro ? "pro" : null,
    joinedAt: "2026-03-14T10:00:00.000Z",
    planValidUntil: pro ? "2027-03-14T10:00:00.000Z" : null,
    billingInterval: pro ? "yearly" : null,
    subscriptionStatus: pro ? "active" : null,
    manageSubscriptionUrl: pro ? "https://example.com/manage" : null,
    dailyInstallLimit: pro ? 5 : 3,
    templateCredits: pro ? 2 : 0,
    totalEffects: 150,
    totalFreeEffects: 53,
    totalEffectsAccess: pro ? 150 : 53,
    savedCount: 12,
    copiedCount: 34,
    cliCount: 15,
    mcpCount: 6,
    todayCount: 2,
    creditsPerYear: pro ? 3 : 0,
    recentActivity: [
      ["helix-slider", "web", 47],
      ["rotation-slider", "cli", 130],
      ["stack-spread", "mcp", 60 * 26],
      ["circular-slider", "web", 60 * 50],
      ["liquid-glass-cursor", "cli", 60 * 75],
      ["text-convergence", "web", 60 * 98],
    ].map(([name, source, minutesAgo]) => ({ name, title: name, source, at: new Date(Date.now() - minutesAgo * 60000).toISOString() })),
    recentlySaved: ["stack-spread", "helix-slider", "rotation-slider", "circular-slider"].map((name, i) => ({
      name,
      title: name,
      tier: "free",
      savedAt: new Date(Date.now() - (i * 26 + 5) * 3600000).toISOString(),
    })),
  };
}

// Same shape as GET /api/dashboard/usage: 40 unlocks over the last 30 days
export function sampleUsage(plan = "pro", catalog = []) {
  const sources = ["web", "web", "cli", "mcp", "web", "cli"];
  const events = Array.from({ length: 40 }, (_, i) => {
    const effect = catalog[(i * 7) % Math.max(1, catalog.length)] || { name: "helix-slider", title: "Helix Slider" };
    return {
      name: effect.name,
      title: effect.title || effect.name,
      source: sources[i % sources.length],
      at: new Date(Date.now() - (i * 17 + 1) * 3600000).toISOString(),
    };
  });
  const limit = plan === "free" ? 3 : plan === "admin" ? null : 5;
  return { plan: plan === "free" ? "free" : "pro", tier: plan === "free" ? null : "pro", isAdmin: plan === "admin", limit, count: 2, remaining: limit ? limit - 2 : null, events };
}

// Same shape as GET /api/dashboard/invoices
export function sampleInvoices(plan = "pro") {
  if (plan === "free") return { plan: "free", tier: null, subscription: null, invoices: [], templatePurchases: [] };
  return {
    plan: "pro",
    tier: "pro",
    subscription: { plan: "pro", status: "active", billing_interval: "yearly", current_period_end: "2027-03-14T10:00:00.000Z", razorpay_subscription_id: "sub_sample", razorpay_short_url: "https://example.com/manage" },
    invoices: [{ id: "i1", amount: 7900, currency: "USD", status: "paid", billing_interval: "yearly", plan_label: "Vault Pro Annual", invoice_url: "https://example.com/receipt", created_at: "2026-03-14T10:00:00.000Z" }],
    templatePurchases: [
      { id: "t1", templateTitle: "Elena Voss", amount: 39, currency: "USD", status: "paid", invoiceUrl: "https://example.com/receipt", createdAt: "2026-09-20T10:00:00.000Z" },
      { id: "t2", templateTitle: "Kyntra", amount: 49, currency: "USD", status: "paid", invoiceUrl: null, createdAt: "2026-10-13T10:00:00.000Z" },
    ],
  };
}

// A stand-in Clerk user for the settings tab (no session in the preview); saving does nothing
export function samplePreviewUser() {
  const noop = async () => {};
  return {
    id: "preview",
    firstName: "Preview",
    lastName: "User",
    fullName: "Preview User",
    hasImage: false,
    imageUrl: "",
    passwordEnabled: true,
    primaryEmailAddress: { emailAddress: "you@example.com" },
    externalAccounts: [{ id: "google", provider: "google", emailAddress: "you@gmail.com" }],
    update: noop,
    reload: noop,
    setProfileImage: noop,
  };
}

// The admin Activity tab's three responses (GET /api/admin/activity/overview, /installs,
// /copy-activity), made up from the catalogue
export function sampleAdminActivity(catalog = []) {
  const effect = (i) => catalog[i % Math.max(1, catalog.length)] || { name: "helix-slider", title: "Helix Slider", tier: "free" };
  const people = [
    ["Harsh Goyal", "harsh@example.com"],
    ["Vidushi Rao", "vidushi@example.com"],
    ["Omkar Patil", "omkar@example.com"],
    ["Joris de Vries", "joris@example.nl"],
    ["Blake Holman", "blake@example.com"],
  ];
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (29 - i));
    const wave = (k) => Math.max(0, Math.round(k * (0.6 + 0.4 * Math.sin(i * 0.7 + k))));
    return { date: date.toISOString().slice(0, 10), web: wave(4), cli: wave(3), mcp: wave(1) };
  });
  const total = (key) => days.reduce((sum, d) => sum + d[key], 0);
  const top = (offset) => Array.from({ length: 8 }, (_, i) => ({ ...effect(i * 5 + offset), slug: effect(i * 5 + offset).name, count: 16 - i * 2 }));
  return {
    overview: {
      stats: { totalUsers: 125, proUsers: 6, totalCopies: total("web"), totalSaved: 62, totalViews: 366, revenueByCurrency: [{ currency: "USD", amount: 137 }, { currency: "INR", amount: 2358 }] },
      planDistribution: [{ name: "Pro", value: 18 }, { name: "Free", value: 237 }],
      topCopiedEffects: top(0),
      topInstalledEffects: top(2),
      topSavedEffects: top(4),
      templateStats: [
        { slug: "elena-voss", title: "Elena Voss", category: "Portfolio", views: 214, sales: 4 },
        { slug: "oris-dental", title: "Oris Dental", category: "Healthcare", views: 163, sales: 0 },
        { slug: "lumera", title: "Lumera", category: "Real Estate", views: 121, sales: 0 },
        { slug: "kyntra", title: "Kyntra", category: "Smart Home", views: 63, sales: 0 },
      ],
    },
    installs: {
      stats: { installsToday: 6 },
      sourceBreakdown: { web: total("web"), cli: total("cli"), mcp: total("mcp") },
      sourceTrend: days,
      topUsers: people.map(([name, email], i) => ({ clerkUserId: `u${i}`, name, email, count: 11 - i * 2 })),
      topInstallers: people.map(([name, email], i) => ({ clerkUserId: `u${i}`, name, email, count: 14 - i * 2 })),
    },
    feed: {
      total: 40,
      events: Array.from({ length: 10 }, (_, i) => ({
        id: i,
        occurredAt: new Date(Date.now() - i * 2.3 * 3600000).toISOString(),
        userName: i % 4 === 3 ? null : people[i % people.length][0],
        userEmail: i % 4 === 3 ? null : people[i % people.length][1],
        identityKey: i % 4 === 3 ? "device:abc" : `user:u${i}`,
        effectSlug: effect(i * 3).name,
        effectTitle: effect(i * 3).title,
        source: ["web", "cli", "mcp"][i % 3],
      })),
    },
  };
}

// The admin Invoicing tab's two responses (GET /api/admin/invoices, /template-purchases)
export function sampleAdminInvoicing() {
  const person = (i) => [["Omkar Patil", "omkar@example.com"], ["Nadia Rao", "nadia@example.com"], ["Joris de Vries", "joris@example.nl"], ["Blake Holman", "blake@example.com"]][i % 4];
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
  return {
    invoices: {
      total: 3,
      stats: { totalInvoices: 3, revenueByCurrency: [{ currency: "INR", amount: 235800 }, { currency: "USD", amount: 2000 }] },
      invoices: [
        { id: "i1", userName: person(0)[0], userEmail: person(0)[1], planLabel: "Vault Pro Monthly", billingInterval: "monthly", amount: 117900, currency: "INR", paymentId: "pay_TlacvHtPm8kfsg", createdAt: day(5), invoiceUrl: "https://example.com" },
        { id: "i2", userName: person(1)[0], userEmail: person(1)[1], planLabel: "Vault Pro Annual", billingInterval: "yearly", amount: 2000, currency: "USD", paymentId: "pay_TntqVYLqa7QgVE", createdAt: day(1), invoiceUrl: null },
        { id: "i3", userName: person(0)[0], userEmail: person(0)[1], planLabel: "Vault Pro Monthly", billingInterval: "monthly", amount: 117900, currency: "INR", paymentId: "pay_TaMT26I2NSipTS", createdAt: day(35), invoiceUrl: "https://example.com" },
      ],
    },
    templates: {
      total: 3,
      stats: { totalPurchases: 3, revenueByCurrency: [{ currency: "USD", amount: 117 }] },
      purchases: [3, 6, 9].map((n, i) => ({ id: `t${i}`, userName: person(i + 1)[0], userEmail: person(i + 1)[1], templateTitle: "Elena Voss", amount: 39, currency: "USD", paymentId: `pay_sample${i}`, createdAt: day(n), invoiceUrl: null })),
    },
  };
}

// GET /api/admin/activity/[userSlug] for one made-up user
export function sampleAdminUser(catalog = []) {
  const effect = (i) => catalog[i % Math.max(1, catalog.length)] || { name: "helix-slider", title: "Helix Slider" };
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const list = (offset, key) => Array.from({ length: 5 }, (_, i) => ({ ...effect(i * 4 + offset), slug: effect(i * 4 + offset).name, [key]: day(i * 3 + 1) }));
  const installTrend = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (29 - i));
    return { date: date.toISOString().slice(0, 10), web: i % 5 === 0 ? 1 : 0, cli: i % 7 === 0 ? 1 : 0, mcp: i % 11 === 0 ? 1 : 0 };
  });
  return {
    profile: { id: "user_sample", name: "Harsh Goyal", email: "harsh@example.com", imageUrl: null, isAdmin: false, lastSignInAt: day(0) },
    session: { browserName: "Chrome", deviceType: "Desktop", city: "Delhi", country: "IN" },
    subscription: { plan: "pro" },
    stats: { savedCount: 12, installedCount: 21, copiedCount: 34, lifetimeSpendByCurrency: [{ currency: "INR", amount: 2358 }, { currency: "USD", amount: 39 }] },
    installTrend,
    savedEffects: list(0, "savedAt"),
    copiedEffects: list(1, "lastCopiedAt"),
    installedEffects: list(2, "lastInstalledAt"),
    templatePurchases: [{ id: "t1", createdAt: day(9), templateTitle: "Elena Voss", amount: 39, currency: "USD", paymentId: "pay_sample1", status: "paid", invoiceUrl: null }],
    purchasedTemplates: [],
    invoices: [{ id: "i1", created_at: day(5), plan_label: "Vault Pro Monthly", amount: 117900, currency: "INR", razorpay_payment_id: "pay_sample2", status: "paid", invoice_url: "https://example.com" }],
  };
}

// GET /api/admin/users and /users/stats, made up
export function sampleAdminUsers() {
  const names = [["Harsh Goyal", "harsh@example.com", "super_admin"], ["Omkar Patil", "omkar@example.com"], ["Nadia Rao", "nadia@example.com"], ["Joris de Vries", "joris@example.nl"], ["Blake Holman", "blake@example.com"], ["Mira Kaur", "mira@example.com"]];
  return {
    stats: { newUsers: 255, newProUsers: 18, copies: 465, saves: 134 },
    total: names.length,
    users: names.map(([name, email, role], i) => ({
      id: `user_${i}`,
      name,
      email,
      role: role || "user",
      imageUrl: null,
      joinedAt: new Date(Date.now() - (i * 9 + 2) * 86400000).toISOString(),
      plan: i % 3 === 1 ? "pro" : "free",
      tier: i % 3 === 1 ? "pro" : null,
      planValidUntil: i % 3 === 1 ? "2027-03-14T10:00:00.000Z" : null,
      razorpayCustomerId: i % 3 === 1 ? "cust_samplecustomer" : null,
      copiesCount: 12 - i,
      cliCount: 6 - (i % 4),
      mcpCount: i % 3,
      savesCount: 9 - i,
    })),
  };
}
