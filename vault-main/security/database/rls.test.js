import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { VAULT_ROOT, walk } from "../helpers/route-harness.js";

// Database security. The app talks to Supabase only with the service-role
// key (lib/supabase.js), which bypasses RLS, so RLS is defence in depth:
// it is what stands between the database and anyone holding the project's
// anon key (it is not shipped to browsers today, but it is not a secret
// either - Supabase treats it as public). Report: M8.
//
// Static part runs everywhere. The live part only runs with
//   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_ANON_KEY
// set (point it at staging, not production), and only *reads*.

const SRC = path.join(VAULT_ROOT, "src");
const SQL_DIR = path.join(VAULT_ROOT, "sql");

const tablesInCode = [
  ...new Set(
    walk(SRC, { include: (f) => /\.(m?jsx?|tsx?)$/.test(f) && !/\.test\./.test(f) })
      .flatMap((f) => [...fs.readFileSync(f, "utf-8").matchAll(/\.from\(["']([a-z_]+)["']\)/g)].map((m) => m[1]))
  ),
].sort();
const rpcsInCode = [
  ...new Set(
    walk(SRC, { include: (f) => /\.(m?jsx?|tsx?)$/.test(f) && !/\.test\./.test(f) })
      .flatMap((f) => [...fs.readFileSync(f, "utf-8").matchAll(/\.rpc\(["']([a-z_]+)["']/g)].map((m) => m[1]))
  ),
].sort();

const sqlText = fs.existsSync(SQL_DIR)
  ? fs
      .readdirSync(SQL_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => fs.readFileSync(path.join(SQL_DIR, f), "utf-8"))
      .join("\n")
      .toLowerCase()
  : "";

// Tables that hold billing, credentials, PII or one-time codes.
const SENSITIVE = ["subscriptions", "invoices", "sent_emails", "template_purchases", "template_credits", "install_events", "cli_telemetry_events"];

describe("database access from the app", () => {
  it("found the tables and RPCs the app uses", () => {
    expect(tablesInCode).toEqual(expect.arrayContaining(["subscriptions", "invoices", "sent_emails"]));
    expect(rpcsInCode.length).toBeGreaterThan(0);
  });

  it("there is exactly one Supabase client, it is server-only, and nothing creates an anon client", () => {
    const creators = walk(SRC, { include: (f) => /\.(m?jsx?|tsx?)$/.test(f) && !/\.test\./.test(f) }).filter((f) =>
      /createClient\s*\(/.test(fs.readFileSync(f, "utf-8")) && /@supabase\/supabase-js/.test(fs.readFileSync(f, "utf-8"))
    );
    expect(creators.map((f) => path.relative(VAULT_ROOT, f))).toEqual(["src/lib/supabase.js"]);
  });

  it("routes never select('*') from a sensitive table", () => {
    const offenders = [];
    for (const file of walk(path.join(SRC, "app/api"), { include: (f) => /route\.js$/.test(f) })) {
      const text = fs.readFileSync(file, "utf-8");
      for (const table of SENSITIVE) {
        // `select("*", { head: true })` is a row count that returns no rows - fine.
        const re = new RegExp(`from\\(["']${table}["']\\)\\s*\\.select\\(\\s*["']\\*["']\\s*(,\\s*\\{[^}]*\\})?`, "g");
        for (const [match] of text.matchAll(re)) {
          if (!/head:\s*true/.test(match)) offenders.push(`${path.relative(VAULT_ROOT, file)} -> ${table}`);
        }
      }
    }
    // Known today: admin/emails ?id= returns select("*") from sent_emails
    // (see H1 in admin-idor.test.js). Listed explicitly so any *new*
    // offender fails this test.
    expect(offenders.filter((o) => o !== "src/app/api/admin/emails/route.js -> sent_emails")).toEqual([]);
  });
});

describe("[M8] RLS is declared in version control", () => {
  // Only template_credits has `enable row level security` in sql/; the
  // rest of the schema (subscriptions, invoices, sent_emails, ...) and the
  // founding/install RPCs exist only in the Supabase dashboard. Nobody can
  // review, diff or restore their access rules.
  it.fails("[M8] every table the app uses has `enable row level security` in sql/", () => {
    const missing = tablesInCode.filter((t) => !new RegExp(`alter table (if exists )?(public\\.)?${t} enable row level security`).test(sqlText));
    expect(missing).toEqual([]);
  });

  it.fails("[M8] every RPC the app calls has its EXECUTE revoked from anon/authenticated in sql/", () => {
    const missing = rpcsInCode.filter((fn) => !new RegExp(`revoke [^;]*on function ${fn}\\b[^;]*from[^;]*anon`).test(sqlText));
    expect(missing).toEqual([]);
  });

  it("template_credits (the one table that is in sql/) has RLS and a locked-down RPC (control)", () => {
    expect(sqlText).toMatch(/alter table template_credits enable row level security/);
    expect(sqlText).toMatch(/revoke all on function redeem_template_credit\(text, text\) from public, anon, authenticated/);
  });
});

const LIVE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

describe.skipIf(!LIVE)("live RLS probe with the anon key (read-only)", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const anon = LIVE
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    : null;

  for (const table of tablesInCode) {
    it(`anon can't read rows from ${table}`, async () => {
      const { data, error } = await anon.from(table).select("*").limit(1);
      // Either a permission error or RLS filtering everything out.
      expect(error || (Array.isArray(data) && data.length === 0), `${table} returned ${JSON.stringify(data)?.slice(0, 120)}`).toBeTruthy();
    });
  }

  for (const fn of rpcsInCode) {
    it(`anon can't execute ${fn}()`, async () => {
      // Deliberately wrong arguments: a permission error proves the grant is
      // revoked; a "function does not exist / argument" error means the
      // grant is open and the probe stopped only because of the args.
      const { error } = await anon.rpc(fn, { __security_probe: true });
      expect(error?.code === "42501" || /permission denied/i.test(error?.message || ""), `${fn}: ${error?.code} ${error?.message}`).toBe(true);
    });
  }
});
