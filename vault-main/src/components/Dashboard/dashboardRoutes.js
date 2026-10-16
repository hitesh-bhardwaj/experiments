// Every dashboard URL carries the account's username (lib/user-slug): /dashboard/{username}/{tab}.
// The user view's tabs sit at the root, the admin view's under /admin.

export const dashboardPath = (username, sub = "") => `/dashboard/${username}${sub ? `/${sub}` : ""}`;

// `sub` is the path below /dashboard/{username}; `light` tabs render on the light sheet.
export const USER_TABS = [
  { key: "overview", label: "Overview", sub: "", light: true },
  { key: "saved", label: "Saved Effects", sub: "saved", light: true },
  { key: "templates", label: "My Templates", sub: "templates", light: true },
  { key: "usage", label: "Usage", sub: "usage", light: true },
  { key: "invoicing", label: "Invoicing", sub: "invoicing", light: true },
  { key: "settings", label: "Settings", sub: "settings", light: true },
];

// Invoicing is personal billing - an admin account has none, so the user view hides it.
export const ADMIN_HIDDEN_TABS = new Set(["invoicing"]);

// Admins and super admins. Invoicing (every user's payments) is super admin only, here
// and - the real gate - in the admin invoices API.
export const ADMIN_TABS = [
  { key: "activity", label: "Activity", sub: "admin/activity", light: true },
  { key: "users", label: "Users", sub: "admin/users", light: true },
  { key: "admin-invoicing", label: "Invoicing", sub: "admin/invoicing", superAdmin: true, light: true },
];

// The tab a path belongs to: the longest `sub` that prefixes it, so
// admin/activity/{user} still lights up Activity.
export function activeTab(tabs, username, pathname) {
  return tabs
    .filter((tab) => {
      const href = dashboardPath(username, tab.sub);
      return tab.sub ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
    })
    .sort((a, b) => b.sub.length - a.sub.length)[0];
}

export const isAdminPath = (username, pathname) => pathname.startsWith(dashboardPath(username, "admin"));
