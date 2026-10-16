// One-off: removes install rows that belong to no current account, so the admin
// pages show no "Anonymous · ip/device" or "Anonymous · user" entries. Safe to
// delete this file once run.
//
//   node --env-file=.env.local scripts/cleanup-anonymous-installs.mjs           # dry run: counts only
//   node --env-file=.env.local scripts/cleanup-anonymous-installs.mjs --apply   # backs up, then deletes
//
// Removes, from install_events and install_unlocks:
//   - rows with no clerk_user_id (signed-out installs: "Anonymous · ip" / "· device")
//   - rows whose clerk_user_id is no longer a Clerk account ("Anonymous · user")
// Leaves the CLI telemetry tables (cli_effect_installs, cli_telemetry_events) alone.
// Backup: scripts/install-cleanup-backup-<timestamp>.json (gitignored).
//
// Until the sign-in fixes in NO_ANONYMOUS_INSTALLS.md ship, new anonymous
// rows keep arriving - run it again after they do.

import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { createClerkClient } from "@clerk/backend";

const APPLY = process.argv.includes("--apply");
const TABLES = ["install_events", "install_unlocks"];

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const accounts = new Set();
for (let offset = 0; ; offset += 500) {
  const { data } = await clerk.users.getUserList({ limit: 500, offset });
  data.forEach((user) => accounts.add(user.id));
  if (data.length < 500) break;
}

async function allRows(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select("*").range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const doomed = {};
for (const table of TABLES) {
  doomed[table] = (await allRows(table)).filter((row) => !row.clerk_user_id || !accounts.has(row.clerk_user_id));
  const noUser = doomed[table].filter((row) => !row.clerk_user_id).length;
  console.log(`${table}: ${doomed[table].length} to remove (${noUser} signed out, ${doomed[table].length - noUser} deleted accounts)`);
}

if (!APPLY) {
  console.log("Dry run - nothing changed. Add --apply to back up and delete.");
  process.exit(0);
}

const backupPath = `scripts/install-cleanup-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backupPath, JSON.stringify(doomed));
console.log("Backup:", backupPath);

for (const table of TABLES) {
  const ids = doomed[table].map((row) => row.id);
  let removed = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await sb.from(table).delete().in("id", ids.slice(i, i + 200)).select("id");
    if (error) throw error;
    removed += data.length;
  }
  console.log(`${table}: removed ${removed}`);
}
console.log("Done.");
