// One-off: removes Razorpay test-mode data from the production database, so the
// admin numbers hold real payments only. Safe to delete this file once run.
//
//   node --env-file=.env.local scripts/cleanup-test-data.mjs           # dry run: lists what it would do
//   node --env-file=.env.local scripts/cleanup-test-data.mjs --apply   # backs up, then does it
//
// Needs Razorpay TEST keys in the env (RAZORPAY_KEY_ID=rzp_test_...): a payment or
// subscription is "test" when the test API can see it. What it does:
//   1. invoices        - deletes rows with is_test = true
//   2. template_purchases - deletes test-mode purchases, and credit redemptions
//   3. template_credits   - deletes the ledger rows of users whose credit grants
//                           all came from test payments (aborts if any live grant exists)
//   4. subscriptions   - accounts on a test-mode subscription: cancels it in test
//                        mode and puts the account back on Free (Supabase + Clerk)
//   5. subscriptions   - admin-granted Pro whose period has ended: status -> "expired"
// Backup of every row it touches: scripts/test-data-backup-<timestamp>.json (gitignore it or delete it after).

import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { createClerkClient } from "@clerk/backend";

const APPLY = process.argv.includes("--apply");
if (!(process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_")) {
  console.error("Run with Razorpay TEST keys - they're how test payments are recognised.");
  process.exit(1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const auth = "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
const rzp = (path, method = "GET") => fetch(`https://api.razorpay.com/v1/${path}`, { method, headers: { Authorization: auth } });
const seen = new Map();
const visibleInTestMode = async (kind, id) => {
  if (!id) return false;
  if (!seen.has(id)) seen.set(id, (await rzp(`${kind}/${id}`)).status === 200);
  return seen.get(id);
};
const all = async (table, build = (q) => q) => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(sb.from(table).select("*")).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
};

// 1. test invoices
const testInvoices = await all("invoices", (q) => q.eq("is_test", true));

// 2. test purchases + credit redemptions (credits only ever came from test payments)
const testPurchases = [];
for (const row of await all("template_purchases")) {
  if (row.is_test || row.source === "credit" || (await visibleInTestMode("payments", row.razorpay_payment_id))) testPurchases.push(row);
}

// 3. the credit ledger
const credits = await all("template_credits");
for (const row of credits) {
  if (row.razorpay_payment_id && !(await visibleInTestMode("payments", row.razorpay_payment_id))) {
    console.error(`Live credit grant ${row.id} (${row.razorpay_payment_id}) - stopping, nothing changed.`);
    process.exit(1);
  }
}

// 4. accounts on a test-mode subscription
const testSubscriptions = [];
for (const row of await all("subscriptions", (q) => q.not("razorpay_subscription_id", "is", null))) {
  if (await visibleInTestMode("subscriptions", row.razorpay_subscription_id)) testSubscriptions.push(row);
}

// 5. ended admin grants still marked active
const now = Date.now();
const endedGrants = (await all("subscriptions", (q) => q.eq("plan", "pro").eq("status", "active"))).filter(
  (row) => !row.razorpay_subscription_id && row.current_period_end && new Date(row.current_period_end).getTime() <= now
);

console.log({
  testInvoices: testInvoices.length,
  testPurchases: testPurchases.length,
  creditLedgerRows: credits.length,
  testSubscriptions: testSubscriptions.map((r) => [r.clerk_user_id, r.plan, r.razorpay_subscription_id]),
  endedGrants: endedGrants.map((r) => [r.clerk_user_id, r.current_period_end]),
});
if (!APPLY) {
  console.log("Dry run - nothing changed. Add --apply to back up and clean.");
  process.exit(0);
}

const backupPath = `scripts/test-data-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(
  backupPath,
  JSON.stringify({ invoices: testInvoices, template_purchases: testPurchases, template_credits: credits, subscriptions: [...testSubscriptions, ...endedGrants] }, null, 2)
);
console.log("Backup:", backupPath);

const remove = async (table, rows) => {
  if (!rows.length) return 0;
  const { data, error } = await sb.from(table).delete().in("id", rows.map((r) => r.id)).select("id");
  if (error) throw error;
  return data.length;
};
console.log("invoices deleted:", await remove("invoices", testInvoices));
console.log("template_purchases deleted:", await remove("template_purchases", testPurchases));
console.log("template_credits deleted:", await remove("template_credits", credits));

for (const row of testSubscriptions) {
  await rzp(`subscriptions/${row.razorpay_subscription_id}/cancel`, "POST");
  const { error } = await sb
    .from("subscriptions")
    .update({
      plan: "free",
      tier: null,
      status: "inactive",
      billing_interval: null,
      current_period_end: null,
      razorpay_subscription_id: null,
      razorpay_plan_id: null,
      razorpay_short_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", row.clerk_user_id);
  if (error) throw error;
  const user = await clerk.users.getUser(row.clerk_user_id).catch(() => null);
  if (user && user.publicMetadata?.razorpaySubscriptionId === row.razorpay_subscription_id) {
    await clerk.users.updateUser(row.clerk_user_id, {
      publicMetadata: { ...user.publicMetadata, plan: "free", proAccess: false, tier: null, billingInterval: null, subscriptionStatus: "inactive", razorpaySubscriptionId: null, razorpayPlanId: null, currentPeriodEnd: null },
    });
  }
  console.log("test subscription cleared:", row.clerk_user_id);
}

if (endedGrants.length) {
  const { error } = await sb
    .from("subscriptions")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .in("clerk_user_id", endedGrants.map((r) => r.clerk_user_id));
  if (error) throw error;
  console.log("ended grants marked expired:", endedGrants.length);
}
console.log("Done.");
