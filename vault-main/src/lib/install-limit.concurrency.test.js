import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import pg from "pg";

// Requires a real, disposable Postgres - a JS mock can't reproduce a genuine
// row-lock/advisory-lock race (mocks resolve sequentially in the event loop).
// Not run as part of `npm test`; run explicitly via `npm run test:concurrency` with:
//   docker run --rm -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16
//   INSTALL_LIMIT_TEST_DATABASE_URL=postgres://postgres:test@localhost:5433/postgres npm run test:concurrency
const DATABASE_URL = process.env.INSTALL_LIMIT_TEST_DATABASE_URL;

describe.skipIf(!DATABASE_URL)("install-limit concurrency (real Postgres)", () => {
  let pool;

  beforeAll(async () => {
    if (/supabase\.co|amazonaws|production/i.test(DATABASE_URL)) {
      throw new Error("Refusing to run against what looks like a production URL.");
    }

    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

    await pool.query(
      readFileSync(
        path.resolve(__dirname, "../../test/fixtures/install-limit-schema.sql"),
        "utf8"
      )
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query("truncate install_unlocks");
  });

  async function claim(identityKey, effectSlug, limit, source = "cli") {
    const { rows } = await pool.query(
      "select * from claim_install_slot($1, current_date, $2, $3, $4)",
      [identityKey, effectSlug, source, limit]
    );
    return rows[0] ?? null;
  }

  it("30 concurrent claims for 30 distinct new effects, limit 3, yields exactly 3 winners", async () => {
    const attempts = Array.from({ length: 30 }, (_, i) => `race-effect-${i}`);
    const results = await Promise.all(attempts.map((slug) => claim("user:racer", slug, 3)));

    const allowed = results.filter((r) => r.allowed && !r.already_unlocked);
    const denied = results.filter((r) => !r.allowed);
    expect(allowed).toHaveLength(3);
    expect(denied).toHaveLength(27);

    const { rows } = await pool.query(
      "select count(*)::int as n from install_unlocks where identity_key = 'user:racer'"
    );
    expect(rows[0].n).toBe(3); // the ledger matches reality, never exceeded cap
  });

  it("10 concurrent duplicate claims on an already-unlocked effect never create extra rows", async () => {
    await claim("user:dup", "dup-effect", 3);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => claim("user:dup", "dup-effect", 3))
    );
    expect(results.every((r) => r.already_unlocked)).toBe(true);

    const { rows } = await pool.query(
      "select count(*)::int as n from install_unlocks where identity_key = 'user:dup'"
    );
    expect(rows[0].n).toBe(1);
  });

  it("different identities on the same day never share a bucket", async () => {
    const a = await claim("user:a", "shared-effect", 1);
    const b = await claim("device:b", "shared-effect", 1);

    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true); // independent bucket, not blocked by user:a's claim
  });

  it("admin (limit null) is never denied regardless of volume", async () => {
    const attempts = Array.from({ length: 20 }, (_, i) => `admin-effect-${i}`);
    const results = await Promise.all(attempts.map((slug) => claim("user:admin", slug, null)));

    expect(results.every((r) => r.allowed)).toBe(true);
    expect(results.every((r) => r.remaining === null)).toBe(true);
  });
});
