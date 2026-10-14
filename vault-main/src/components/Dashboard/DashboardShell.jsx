"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAdminRole } from "@/lib/useAdminRole";
import Button, { BUTTON_SIZE } from "@/homepage/components/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";

const BASE_TABS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Saved Effects", href: "/dashboard/saved" },
  { label: "My Templates", href: "/dashboard/templates" },
  { label: "Usage", href: "/dashboard/usage" },
  { label: "Invoicing", href: "/dashboard/invoicing" },
  { label: "Settings", href: "/dashboard/settings" },
];

// Admin-only, gated by dashboard/admin/layout.js's requireAdmin() check
// regardless of this tab list - hiding them here is a nav nicety, not the
// actual access control.
const ADMIN_TABS = [
  { label: "User Management", href: "/dashboard/admin" },
  { label: "Activity", href: "/dashboard/admin/activity" },
];

// Payment detail across every user is a step up from what a regular admin
// can already see - restricted to super admins both here and (the real
// gate) in api/admin/invoices/route.js's assertSuperAdmin() check.
const SUPER_ADMIN_TABS = [{ label: "Invoicing", href: "/dashboard/admin/invoicing" }];

// Invoicing is a customer-account concept (personal billing) - an admin has
// none, so surfacing it would just show empty/irrelevant state instead of
// being hidden outright. Usage isn't hidden: admins can still copy/install
// effects (just without a daily limit), and the main dashboard's Copied/
// Installed Effects tiles link here for every account, admins included.
const ADMIN_HIDDEN_TABS = new Set(["/dashboard/invoicing"]);

// Tabs already restyled for the light content sheet below the hero. The rest still use
// dark styles, so they stay on the dark background until they're restyled too.
const LIGHT_SHEET_ROUTES = new Set(["/dashboard"]);

export function DashboardShell({ children, totalEffects = 0, effects = [] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isSuperAdmin } = useAdminRole();

  const visibleBaseTabs = isAdmin
    ? BASE_TABS.filter((tab) => !ADMIN_HIDDEN_TABS.has(tab.href))
    : BASE_TABS;
  const tabs = isAdmin
    ? [...visibleBaseTabs, ...ADMIN_TABS, ...(isSuperAdmin ? SUPER_ADMIN_TABS : [])]
    : visibleBaseTabs;

  // Longest-matching href wins, so a nested route (e.g. /dashboard/admin/activity)
  // lights up only its own tab instead of also lighting up an ancestor tab
  // whose href is a strict prefix of it (e.g. /dashboard/admin, User Management).
  const activeTabHref = tabs
    .filter((tab) =>
      tab.href === "/dashboard" ? pathname === tab.href : pathname.startsWith(tab.href)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const lightSheet = LIGHT_SHEET_ROUTES.has(pathname);

  return (
    <div className="min-h-screen text-foreground">
      {/* Mobile/tablet only (mobileOnly) - desktop has the workspace sidebar, the back
          button and the tabs below. */}
      <VaultHeader mobileOnly showSearch totalEffects={totalEffects} effects={effects} />

      <section id="dashboard" className={`mx-auto w-full section-x flex flex-col gap-[3vw] pt-32 max-lg:gap-10 max-lg:pt-32 max-md:gap-8 max-md:pt-28 ${lightSheet ? "pb-[3vw] max-lg:pb-10 max-md:pb-8" : "pb-[3vw]"}`}>
        {/* hero: back + breadcrumb, then the heading with Browse Effects beside it */}
        <header className="flex flex-col gap-[1.6vw] max-lg:gap-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="grid size-(--vault-ctl-h) shrink-0 cursor-pointer place-items-center text-foreground/70 ring-1 ring-inset ring-foreground/20 transition-colors duration-300 hover:bg-primary hover:text-background hover:ring-primary"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            <Breadcrumb />
          </div>

          <div className="flex items-end justify-between gap-[3vw] max-lg:flex-col max-lg:items-start max-lg:gap-6">
            <div className="flex flex-col gap-[1vw] max-lg:gap-3">
              <h1 className="type-display">
                Your <span className="gradient-text-animate">dashboard.</span>
              </h1>
              <p className="type-body-lg text-foreground/70">Your plan, saved effects, usage and billing, in one place.</p>
            </div>
            <Button href="/effects" text="Browse Effects" />
          </div>
        </header>

        {/* tabs: standard button size, orange when current */}
        <nav aria-label="Dashboard" className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => {
            const active = tab.href === activeTabHref;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center px-3.5 ${BUTTON_SIZE} transition-[background-color,color,box-shadow] duration-500 ${
                  active ? "bg-primary text-background" : "bg-foreground/5 text-foreground/80 ring-1 ring-inset ring-foreground/15 hover:text-foreground hover:ring-primary/60"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

      </section>

      {/* the content: a full-width light sheet (white cards on it) for restyled tabs */}
      <div id="dashboard-content" className={lightSheet ? "bg-light text-ink" : ""}>
        <div className={`mx-auto w-full section-x ${lightSheet ? "py-[4vw] max-lg:py-12 max-md:py-10" : "pb-[7%]"}`}>{children}</div>
      </div>
    </div>
  );
}
