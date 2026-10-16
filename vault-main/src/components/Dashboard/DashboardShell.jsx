"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { useAdminRole } from "@/lib/useAdminRole";
import { getDashboardPreview } from "@/lib/dev/dashboardPreview";
import { displayFirstName } from "@/lib/display-name";
import { hasDeletedAccount } from "@/lib/account-deleted";
import { BUTTON_SIZE } from "@/homepage/components/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";
import { DarkSegment } from "@/components/ui/DarkSegment";
import { AdminAudienceToggle, useAdminAudience } from "@/components/admin/AdminAudience";
import { ADMIN_HIDDEN_TABS, ADMIN_TABS, USER_TABS, activeTab, dashboardPath, isAdminPath } from "./dashboardRoutes";
import { DashboardProvider, HERO_ASIDE_ID } from "./DashboardContext";

// Each tab's header: the heading (its last words orange) and the line under it.
// Overview's heading is the greeting, built in the shell.
const HEROES = {
  saved: ["Saved", "Effects.", "Your shortlist, ready when you are."],
  templates: ["My", "Templates.", "Purchased or redeemed. Download them any time."],
  usage: ["", "Usage.", "Your daily installs and every effect you’ve taken."],
  invoicing: ["", "Invoicing.", "Your plan, payments and receipts in one place."],
  settings: ["", "Settings.", "Your profile, sign-in and privacy."],
  activity: ["", "Activity.", "Site-wide usage, delivery, and who’s driving it."],
  users: ["", "Users.", "Everyone with a Vault account, and what they’re doing with it."],
  "admin-invoicing": ["", "Invoicing.", "Every payment across subscriptions and templates."],
  emails: ["Email", "Log.", "Every email Vault has sent, and whether it was delivered."],
};

function greeting(hour) {
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

const VIEWS = [
  { id: "user", label: "User" },
  { id: "admin", label: "Admin" },
];

// The tabs: standard button size, orange when current
const TAB = `inline-flex shrink-0 items-center px-3.5 ${BUTTON_SIZE} transition-[background-color,color,box-shadow] duration-500 backdrop-blur-lg ring-1 ring-inset ring-foreground/10 hover:ring-primary/60 max-md:px-4 max-md:py-2.5 max-md:text-sm`;
const TAB_ON = "bg-primary text-background";
const TAB_OFF = "bg-foreground/5 text-foreground/80 ring-1 ring-inset ring-foreground/15 hover:text-foreground hover:ring-primary/60";

// The Customers / Internal / All switch, shared by every admin page (remembered in this browser)
function AdminAudienceSwitch() {
  const [audience, setAudience] = useAdminAudience();
  return <AdminAudienceToggle value={audience} onChange={setAudience} />;
}

/**
 * The dashboard frame for /dashboard/{username}/…: the site's vault header, back +
 * breadcrumb, the tab's header (heading, line, and a slot on the right the tab fills with
 * DashboardHeroAside), the tab row, then the tab on a light sheet (restyled tabs) or on the
 * dark page (the rest, until they're restyled).
 *
 * Admins get a View as User / Admin slider at the end of the tab row; Admin swaps the tabs
 * for Activity, Users and (super admins) Invoicing under /dashboard/{username}/admin.
 */
export function DashboardShell({ username, effects = [], catalog = [], children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const role = useAdminRole();

  // The development preview (no session) stands in for a super admin with "admin".
  const [preview, setPreview] = useState(null);
  const [hour, setHour] = useState(null);
  useEffect(() => {
    // Read after mount: the cookie and the clock differ between server and browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(getDashboardPreview());
    setHour(new Date().getHours());
  }, []);
  // A dashboard page shown again without a session - the Back button after signing out
  // or deleting the account (the browser can restore the page from its cache without
  // asking the server): leave at once - to the effects after a deletion, else sign in.
  useEffect(() => {
    const leaveIfSignedOut = () => {
      if (getDashboardPreview() || !clerkLoaded || isSignedIn) return;
      window.location.replace(hasDeletedAccount(document.cookie) ? "/effects" : `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`);
    };
    leaveIfSignedOut();
    // Restored from the back / forward cache: ask the server again (it redirects)
    const onPageShow = (event) => event.persisted && window.location.reload();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [clerkLoaded, isSignedIn]);

  const isAdmin = role.isAdmin || preview === "admin";
  const isSuperAdmin = role.isSuperAdmin || preview === "admin";

  const adminView = isAdminPath(username, pathname);
  // The slider moves as soon as it's clicked, not when the next page arrives
  const [viewClick, setViewClick] = useState(null);
  const view = viewClick?.from === pathname ? viewClick.view : adminView ? "admin" : "user";
  const switchView = (next) => {
    if (next === view) return;
    setViewClick({ view: next, from: pathname });
    router.push(dashboardPath(username, next === "admin" ? "admin/activity" : ""));
  };
  const tabs = adminView
    ? ADMIN_TABS.filter((tab) => !tab.hidden && (!tab.superAdmin || isSuperAdmin))
    : USER_TABS.filter((tab) => !(isAdmin && ADMIN_HIDDEN_TABS.has(tab.key)));
  const current = activeTab(adminView ? ADMIN_TABS : USER_TABS, username, pathname);

  // The account's first name, else the first word of its email (lib/display-name)
  const firstName = displayFirstName(user) || "there";
  const [lead, accent, line] =
    !current || current.key === "overview"
      ? [`${hour === null ? "Welcome back" : greeting(hour)},`, `${firstName}.`, "Your vault is open. Here’s everything at a glance."]
      : HEROES[current.key];

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: dashboardPath(username) },
    ...(adminView ? [{ label: "Admin", href: dashboardPath(username, "admin") }] : []),
    ...(current && current.key !== "overview" ? [{ label: current.label, href: dashboardPath(username, current.sub) }] : []),
  ];

  return (
    <DashboardProvider username={username} catalog={catalog} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin}>
      {/* At least a screen tall, so a short tab's light sheet still reaches the bottom of
          the screen; otherwise as tall as the tab's content */}
      <div className="flex min-h-svh flex-col text-foreground">
        <VaultHeader showSearch totalEffects={effects.length} effects={effects} />

        <section id="dashboard" className="section-x flex w-full flex-col gap-[calc(var(--cvw)*3)] pt-32 pb-[calc(var(--cvw)*3)] max-lg:gap-10 max-lg:pb-10 max-md:gap-8 max-md:pt-28 max-md:pb-8">
          {/* back + breadcrumb */}
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="grid size-(--vault-ctl-h) shrink-0 cursor-pointer place-items-center text-foreground/80 ring-1 ring-inset ring-foreground/20 backdrop-blur-lg duration-300 hover:bg-primary hover:text-background hover:ring-primary"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            <Breadcrumb items={crumbs} />
          </div>

          {/* the tab's header: heading and line on the left, the tab's own figure on the right */}
          <header className="flex items-end justify-between gap-[calc(var(--cvw)*3)] max-lg:flex-col max-lg:items-start max-lg:gap-6">
            <div className="flex min-w-0 flex-col gap-(--cvw) max-lg:gap-3">
              <h1 className="type-display">
                {lead && `${lead} `}
                <span className="gradient-text-animate">{accent}</span>
              </h1>
              <p className="type-body-lg text-foreground/80">{line}</p>
            </div>
            <div id={HERO_ASIDE_ID} className="flex shrink-0 items-end empty:hidden" />
          </header>

          {/* tabs, then (admins) the User / Admin switch at the end of the row */}
          <nav aria-label="Dashboard" className="flex flex-wrap items-center gap-1.5">
            {tabs.map((tab) => {
              const active = tab.key === current?.key;
              return (
                <Link key={tab.key} href={dashboardPath(username, tab.sub)} aria-current={active ? "page" : undefined} className={`${TAB} ${active ? TAB_ON : TAB_OFF}`}>
                  {tab.label}
                </Link>
              );
            })}

            {isAdmin && (
              <div className="ml-auto flex flex-wrap items-center gap-3 max-md:ml-0 max-md:w-full">
                {/* admin pages: whose numbers - customers, our internal accounts, or all (not
                    the email log, which isn't split by account) */}
                {adminView && current?.key !== "emails" && <AdminAudienceSwitch />}
                <span className="type-label text-foreground/80">View as</span>
                <DarkSegment buttonSize label="Dashboard view" items={VIEWS} value={view} onChange={switchView} itemClassName="w-[calc(var(--cvw)*6)] max-lg:w-20" />
              </div>
            )}
          </nav>
        </section>

        {/* the tab: a full-width light sheet (white cards on it), at least half a screen tall
            and otherwise as tall as its content - no hover or
            movement sounds there, like every light section */}
        <div id="dashboard-content" data-sound-flow={current?.light ? "off" : undefined} data-sound-hover={current?.light ? "off" : undefined} className={`min-h-[50vh] flex-1 ${current?.light ? "bg-light text-ink" : ""}`}>
          <div className={`section-x w-full ${current?.light ? "py-[calc(var(--cvw)*3)] max-lg:py-12 max-md:py-10" : "pb-[7%]"}`}>{children}</div>
        </div>
      </div>
    </DashboardProvider>
  );
}
