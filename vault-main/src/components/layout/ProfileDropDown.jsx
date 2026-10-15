"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { User } from "lucide-react";
import { dashboardPath } from "@/components/Dashboard/dashboardRoutes";
import { dashboardUsername } from "@/lib/user-slug";

export default function ProfileDropdown({
  savedCount = 0,
  usage = null,
  plan = "free",
}) {
  const { user } = useUser();
  const { signOut } = useClerk();

  const isAdmin =
    user?.publicMetadata?.role === "admin" ||
    user?.publicMetadata?.role === "super_admin";
  const isSuperAdmin = user?.publicMetadata?.role === "super_admin";

  const isPro =
    plan === "pro" ||
    user?.publicMetadata?.plan === "pro" ||
    user?.publicMetadata?.proAccess === true ||
    isAdmin ||
    usage?.isAdmin === true;

  const usageLabel = !usage
    ? "…"
    : usage.isAdmin
      ? "Unlimited"
      : `${usage.count ?? 0}/${usage.limit ?? 0}`;

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  if (!user) return null;

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      <button
        onClick={() => setOpen(!open)}
        className="group relative flex size-(--vault-ctl-h) shrink-0 items-center justify-center p-0.5 rounded-full cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div className="relative overflow-hidden rounded-full p-px">
          <div
            className="absolute -inset-[100%] animate-[spin_4s_linear_infinite] motion-reduce:animate-none"
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
                alt={user.fullName || "User"}
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

      {open && (
        <div className="absolute right-0 top-14 w-72 bg-background border border-white/10 shadow-float backdrop-blur-lg z-50">
          <div className="p-5 border-b border-white/10">
            <p className="text-white font-medium">
              {user.fullName}
            </p>

            <p className="text-white/50 text-sm truncate">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>

          <div className="p-2">
            <Link
              prefetch={false}
              href={dashboardPath(dashboardUsername(user))}
              className="group relative isolate block px-4 py-3 transition"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top scale-y-0 bg-background transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
              />
              Dashboard
            </Link>

            <Link
              prefetch={false}
              href={dashboardPath(dashboardUsername(user), "saved")}
              className="group relative isolate flex items-center justify-between px-4 py-3 transition"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top scale-y-0 bg-background transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
              />
              <span>Saved Effects</span>

              <span className="text-white/50">
                {savedCount}
              </span>
            </Link>

            {!isAdmin && (
              <Link
                prefetch={false}
                href={dashboardPath(dashboardUsername(user), "usage")}
                className="group relative isolate flex items-center justify-between px-4 py-3 transition"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 origin-top scale-y-0 bg-background transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
                />
                <span>Usage</span>

                <span className="text-white/50">
                  {usageLabel}
                </span>
              </Link>
            )}

            {isSuperAdmin && (
              <>
                <div className="my-2 border-t border-white/10 w-[110%] translate-x-[-5%]" />

                <Link
                  prefetch={false}
                  href={dashboardPath(dashboardUsername(user), "admin/activity")}
                  className="group relative isolate block px-4 py-3 transition"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 origin-top scale-y-0 bg-background transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
                  />
                  Activity
                </Link>

                <Link
                  prefetch={false}
                  href={dashboardPath(dashboardUsername(user), "admin/users")}
                  className="group relative isolate block px-4 py-3 transition"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 origin-top scale-y-0 bg-background transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
                  />
                  User Management
                </Link>

                <Link
                  prefetch={false}
                  href={dashboardPath(dashboardUsername(user), "admin/invoicing")}
                  className="group relative isolate block px-4 py-3 transition"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 origin-top scale-y-0 bg-background transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
                  />
                  Invoicing
                </Link>
              </>
            )}

            <Link
              prefetch={false}
              href={dashboardPath(dashboardUsername(user), "settings")}
              className="group relative isolate block px-4 py-3 transition"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top scale-y-0 bg-background transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
              />
              Settings
            </Link>

            <div className="my-2 border-t border-white/10 w-[110%] translate-x-[-5%]" />

            <button
              // Stay on this page (reloaded, so account-dependent content - unlocked code,
              // saved hearts, plan buttons - shows the signed-out view). The dashboard needs
              // a session, so signing out there goes to the effects listing instead.
              onClick={() => signOut(() => {
                const onDashboard = window.location.pathname.startsWith("/dashboard");
                if (onDashboard) window.location.href = "/effects";
                else window.location.reload();
              })}
              className="group relative isolate w-full text-left px-4 py-3 transition text-red-400"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top scale-y-0 bg-background transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
              />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}