"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { User } from "lucide-react";

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
        className="group relative flex items-center justify-center p-0.5 rounded-full cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[#ff5f00]"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div className="relative overflow-hidden rounded-full p-px">
          <div
            className="absolute -inset-[100%] animate-[spin_4s_linear_infinite] motion-reduce:animate-none"
            style={{
              background: isPro
                ? "conic-gradient(from 0deg, #f16b0d, #e61216, #ff5f00, #f16b0d)"
                : "conic-gradient(from 0deg, #2e2e2e, #666666, #999999, #333333, #2e2e2e)",
            }}
          />
          <div className="relative z-10 bg-[#0c0c0c] rounded-full p-1">
            {user.hasImage ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName || "User"}
                width={40}
                height={40}
                className="size-9.5 object-cover rounded-full block"
              />
            ) : (
              <div className="size-9.5 flex items-center justify-center rounded-full bg-[#161616] text-white/80 transition-colors group-hover:text-white group-hover:bg-[#1f1f1f]">
                <User className="size-4 text-white/70 group-hover:text-white transition-colors" />
              </div>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-14 w-72 bg-[#141414] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50">
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
              href="/dashboard"
              className="group relative isolate block px-4 py-3 transition"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#0e0e0e] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
              />
              Dashboard
            </Link>

            <Link
              href="/dashboard/saved"
              className="group relative isolate flex items-center justify-between px-4 py-3 transition"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#0e0e0e] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
              />
              <span>Saved Effects</span>

              <span className="text-white/50">
                {savedCount}
              </span>
            </Link>

            {!isAdmin && (
              <Link
                href="/dashboard/usage"
                className="group relative isolate flex items-center justify-between px-4 py-3 transition"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#0e0e0e] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
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
                  href="/dashboard/admin/activity"
                  className="group relative isolate block px-4 py-3 transition"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#0e0e0e] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
                  />
                  Activity
                </Link>

                <Link
                  href="/dashboard/admin"
                  className="group relative isolate block px-4 py-3 transition"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#0e0e0e] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
                  />
                  User Management
                </Link>

                <Link
                  href="/dashboard/admin/invoicing"
                  className="group relative isolate block px-4 py-3 transition"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#0e0e0e] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
                  />
                  Invoicing
                </Link>
              </>
            )}

            <Link
              href="/dashboard/settings"
              className="group relative isolate block px-4 py-3 transition"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#0e0e0e] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
              />
              Settings
            </Link>

            <div className="my-2 border-t border-white/10 w-[110%] translate-x-[-5%]" />

            <button
              onClick={() => signOut(() => {
                window.location.href = "/effects";
              })}
              className="group relative isolate w-full text-left px-4 py-3 transition text-red-400"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 origin-top scale-y-0 bg-[#0e0e0e] transition-transform duration-300 ease-out group-hover:scale-y-100 motion-reduce:transition-none"
              />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}