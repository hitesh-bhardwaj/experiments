"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { User } from "lucide-react";
import { ADMIN_HIDDEN_TABS, ADMIN_TABS, USER_TABS, dashboardPath, isAdminPath } from "@/components/Dashboard/dashboardRoutes";
import { DarkSegment } from "@/components/ui/DarkSegment";
import { displayName } from "@/lib/display-name";
import { useAdminRole } from "@/lib/useAdminRole";
import { dashboardUsername } from "@/lib/user-slug";

const VIEWS = [
  { id: "user", label: "User" },
  { id: "admin", label: "Admin" },
];

// One row: the label, an optional figure on the right, the hover fill rising from the top
function MenuLink({ href, label, figure, onClick }) {
  return (
    <li>
      <Link prefetch={false} href={href} onClick={onClick} className="group relative isolate flex items-center justify-between px-4 py-3 transition">
        <span aria-hidden="true" className="absolute inset-0 -z-10 origin-top scale-y-0 bg-dark-card transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none" />
        <span>{label}</span>
        {figure !== undefined && <span className="text-foreground/80">{figure}</span>}
      </Link>
    </li>
  );
}

/**
 * The account menu in the vault header: who's signed in, every dashboard page (the
 * dashboard's own tab list, so the two never differ) and Sign out. Admins get a User /
 * Admin switch on top that swaps the links between their own dashboard and the admin one.
 */
export default function ProfileDropdown({ savedCount = 0, usage = null, plan = "free" }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const role = useAdminRole();

  // The session's role straight away, the server's (which knows the bootstrap admin) once in
  const metaRole = user?.publicMetadata?.role;
  const isAdmin = role.isAdmin || metaRole === "admin" || metaRole === "super_admin";
  const isSuperAdmin = role.isSuperAdmin || metaRole === "super_admin";

  const isPro = plan === "pro" || user?.publicMetadata?.plan === "pro" || user?.publicMetadata?.proAccess === true || isAdmin || usage?.isAdmin === true;

  const usageLabel = !usage ? "…" : usage.isAdmin ? "Unlimited" : `${usage.count ?? 0}/${usage.limit ?? 0}`;

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const username = user ? dashboardUsername(user) : "";

  // Which links an admin sees: the admin ones while on an admin page, else their own.
  // The switch changes it without leaving the page.
  const [viewPick, setViewPick] = useState(null);
  const view = isAdmin ? viewPick || (username && isAdminPath(username, pathname) ? "admin" : "user") : "user";

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!user) return null;

  const close = () => setOpen(false);
  // Figures beside a link: saved count, today's usage
  const FIGURES = { saved: savedCount, usage: usageLabel };
  const links =
    view === "admin"
      ? ADMIN_TABS.filter((tab) => !tab.hidden && (!tab.superAdmin || isSuperAdmin))
      : USER_TABS.filter((tab) => !(isAdmin && ADMIN_HIDDEN_TABS.has(tab.key)));
  const name = displayName(user);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="group relative flex size-(--vault-ctl-h) shrink-0 items-center justify-center p-0.5 rounded-full cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div className="relative overflow-hidden rounded-full p-px">
          <div
            className="absolute -inset-full animate-[spin_4s_linear_infinite] motion-reduce:animate-none"
            style={{
              background: isPro
                ? "conic-gradient(from 0deg, var(--primary), var(--primary-hover), var(--primary))"
                : "conic-gradient(from 0deg, var(--grey), var(--light-grey), var(--grey))",
            }}
          />
          <div className="relative z-10 bg-background rounded-full p-1">
            {user.hasImage ? (
              <Image
                src={user.imageUrl}
                alt={name || "User"}
                width={40}
                height={40}
                className="size-[calc(var(--vault-ctl-h)-14px)] object-cover rounded-full block"
              />
            ) : (
              <div className="size-[calc(var(--vault-ctl-h)-14px)] flex items-center justify-center rounded-full bg-dark-card text-white/80 transition-colors group-hover:text-white group-hover:bg-dark-card">
                <User className="size-4 text-white/70 group-hover:text-white transition-colors" />
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Always mounted: it fades and drops in */}
      <div
        aria-hidden={!open}
        className={`type-label absolute right-0 top-14 z-50 w-72 border border-white/10 bg-background backdrop-blur-lg transition-[opacity,translate,visibility] duration-[390ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 border-b border-white/10 p-5">
          {name && <p className="type-body text-foreground">{name}</p>}
          <p className="type-small truncate text-foreground/80">{user.primaryEmailAddress?.emailAddress}</p>
        </div>

        {isAdmin && (
          <div className="border-b border-white/10 px-5 py-3">
            <DarkSegment label="Menu links" items={VIEWS} value={view} onChange={setViewPick} itemClassName="w-30" />
          </div>
        )}

        <ul className="p-2">
          {links.map((tab) => (
            <MenuLink key={tab.key} href={dashboardPath(username, tab.sub)} label={tab.key === "overview" ? "Dashboard" : tab.label} figure={FIGURES[tab.key]} onClick={close} />
          ))}
        </ul>

        <div className="border-t border-white/10 p-2">
          <button
            // Stay on this page (reloaded, so account-dependent content - unlocked code,
            // saved hearts, plan buttons - shows the signed-out view). The dashboard needs
            // a session, so signing out there goes to the effects listing instead.
            onClick={() =>
              signOut(() => {
                const onDashboard = window.location.pathname.startsWith("/dashboard");
                if (onDashboard) window.location.href = "/effects";
                else window.location.reload();
              })
            }
            className="group relative isolate w-full cursor-pointer px-4 py-3 text-left text-primary transition"
          >
            <span aria-hidden="true" className="absolute inset-0 -z-10 origin-top scale-y-0 bg-dark-card transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
