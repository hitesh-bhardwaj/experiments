"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

// Wraps GET /api/admin/me - the client can't derive its own role because the
// ADMIN_EMAIL bootstrap fallback in lib/admin.js's getRole() is server-only.
export function useAdminRole() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      // This branch shares the effect with the async /api/admin/me fetch
      // below (cancellation flag + cleanup), and reacts to Clerk's
      // client-only auth state resolving - it isn't render-derivable.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch("/api/admin/me")
      .then((res) => (res.ok ? res.json() : { role: null }))
      .then((json) => {
        if (!cancelled) setRole(json.role || null);
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

  return {
    role,
    isAdmin: role === "admin" || role === "super_admin",
    isSuperAdmin: role === "super_admin",
    loading,
  };
}
