import "server-only";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";

export const ROLES = { SUPER_ADMIN: "super_admin", ADMIN: "admin" };

// No hardcoded fallback: if ADMIN_EMAIL is unset, email-based admin access
// is simply unavailable - only an explicit publicMetadata.role still works.
// Fails closed instead of granting a literal hardcoded account admin access
// whenever the env var happens to be missing.
//
// The ADMIN_EMAIL fallback only applies when metadata hasn't already set an
// explicit role, so a super admin can later demote that account by giving it
// a metadata role of its own (including revoking it outright).
export function getRole(user) {
  if (!user) return null;

  const metaRole = user.publicMetadata?.role;
  if (metaRole === ROLES.SUPER_ADMIN) return ROLES.SUPER_ADMIN;
  if (metaRole === ROLES.ADMIN) return ROLES.ADMIN;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.emailAddresses?.[0]?.emailAddress === adminEmail) {
    return ROLES.SUPER_ADMIN;
  }

  return null;
}

export function isAdminUser(user) {
  return getRole(user) !== null;
}

export function isSuperAdminUser(user) {
  return getRole(user) === ROLES.SUPER_ADMIN;
}

// For server components that already have a Clerk `user` via currentUser().
export async function requireAdmin() {
  const user = await currentUser();
  return isAdminUser(user);
}

export async function requireSuperAdmin() {
  const user = await currentUser();
  return isSuperAdminUser(user);
}

// For API routes using auth() + clerkClient().
export async function assertAdmin() {
  const { userId } = await auth();
  if (!userId) return false;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  return isAdminUser(user);
}

// Gates role management, plan changes, and billing/revenue - anything a
// regular admin must not be able to do.
export async function assertSuperAdmin() {
  const { userId } = await auth();
  if (!userId) return false;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  return isSuperAdminUser(user);
}
