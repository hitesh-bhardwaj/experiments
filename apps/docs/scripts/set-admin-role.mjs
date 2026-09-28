#!/usr/bin/env node
// One-off CLI to grant/revoke the admin/super_admin role via Clerk's backend
// API - the same publicMetadata.role mechanism api/admin/users/update-role
// uses, for when there's no signed-in super admin yet to do it from the UI.
//
// Usage: node --env-file=.env.local scripts/set-admin-role.mjs <email> <super_admin|admin|none>

import { createClerkClient } from "@clerk/backend";

const [, , email, roleArg] = process.argv;
const VALID = new Set(["super_admin", "admin", "none"]);

if (!email || !VALID.has(roleArg)) {
  console.error("Usage: node --env-file=.env.local scripts/set-admin-role.mjs <email> <super_admin|admin|none>");
  process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY is not set - run with --env-file=.env.local");
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const { data: users } = await clerk.users.getUserList({ emailAddress: [email] });

if (users.length === 0) {
  console.error(`No Clerk user found for ${email} - they need to sign up first.`);
  process.exit(1);
}

const user = users[0];
const role = roleArg === "none" ? null : roleArg;

await clerk.users.updateUserMetadata(user.id, {
  publicMetadata: { role },
});

console.log(`${email} (${user.id}) -> role: ${role ?? "none"}`);
