import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import pg from "pg";

// Requires a real, disposable Postgres - a JS mock can't reproduce a genuine
// row-lock race (mocks resolve sequentially in the event loop). Not run as
// part of `npm test`; run explicitly via `npm run test:concurrency` with:
//   docker run --rm -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16
//   FOUNDING_SLOTS_TEST_DATABASE_URL=postgres://postgres:test@localhost:5433/postgres npm run test:concurrency
const DATABASE_URL = process.env.FOUNDING_SLOTS_TEST_DATABASE_URL;

describe.skipIf(!DATABASE_URL)("founding slot concurrency (real Postgres)", () => {
  let pool;

  beforeAll(async () => {
    if (/supabase\.co|amazonaws|production/i.test(DATABASE_URL)) {
      throw new Error("Refusing to run against what looks like a production URL.");
    }

    // A pool this size still produces genuine lock contention on the
    // counter row - excess concurrent claim() calls queue for a free
    // connection rather than needing one physical connection each, so this
    // stays well under any reasonable server max_connections default.
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 20 });

    await pool.query(
      readFileSync(
        path.resolve(__dirname, "../../test/fixtures/founding-slots-schema.sql"),
        "utf8"
      )
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query("truncate founding_slot_reservations");
    await pool.query("update founding_slot_counter set claimed = 0 where id = 1");
  });

  async function claim(clerkUserId, idempotencyKey) {
    const { rows } = await pool.query(
      "select * from claim_founding_slot($1, $2, $3, $4)",
      [clerkUserId, idempotencyKey, "USD", 900]
    );
    return rows[0] ?? null;
  }

  it("150 concurrent requests (with duplicate keys + simulated failures) yield exactly 100 confirmed slots, none lost", async () => {
    // 140 distinct users/keys, plus 10 of those users double-submitting with
    // the SAME key concurrently (true double-click race) = 150 calls.
    const attempts = [];
    for (let i = 0; i < 140; i++) attempts.push({ user: `user-${i}`, key: `key-${i}` });
    for (let i = 0; i < 10; i++) attempts.push({ user: `user-${i}`, key: `key-${i}` });

    const results = await Promise.all(attempts.map((a) => claim(a.user, a.key)));

    const claimed = results.filter(Boolean);
    const distinctIds = new Set(claimed.map((r) => r.id));
    expect(distinctIds.size).toBeLessThanOrEqual(100);

    // Each duplicate-key pair resolved to the SAME reservation id.
    for (let i = 0; i < 10; i++) {
      const pairIds = results
        .map((r, idx) => (attempts[idx].key === `key-${i}` ? r?.id : undefined))
        .filter(Boolean);
      expect(new Set(pairIds).size).toBe(1);
    }

    // Simulate 15 Razorpay failures on 15 successful claims -> release.
    const toFail = claimed.slice(0, 15);
    await Promise.all(
      toFail.map((r) =>
        pool.query("select * from release_founding_slot($1, $2)", [r.id, "razorpay_create_failed"])
      )
    );

    // 15 fresh concurrent claimants should be able to reclaim those slots.
    const backfill = await Promise.all(
      Array.from({ length: 15 }, (_, i) => claim(`backfill-user-${i}`, `backfill-key-${i}`))
    );
    expect(backfill.filter(Boolean).length).toBe(15);

    // Confirm every reservation still 'reserved' (mirrors webhook activation).
    const { rows: stillReserved } = await pool.query(
      "select id from founding_slot_reservations where status = 'reserved'"
    );
    await Promise.all(
      stillReserved.map((r) =>
        pool.query("select * from confirm_founding_slot($1, $2)", [r.id, `rzp_sub_${r.id}`])
      )
    );

    const { rows: confirmedRows } = await pool.query(
      "select count(*)::int as n from founding_slot_reservations where status = 'confirmed'"
    );
    const { rows: counterRows } = await pool.query(
      "select claimed from founding_slot_counter where id = 1"
    );

    expect(confirmedRows[0].n).toBe(100); // exactly 100 real confirmed founding subs
    expect(counterRows[0].claimed).toBe(100); // counter matches reality, never exceeded cap
  });

  it("same person racing across two idempotency keys never gets two live reservations", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => claim("same-user", `tab-${i}`))
    );
    const distinctIds = new Set(results.filter(Boolean).map((r) => r.id));
    expect(distinctIds.size).toBe(1); // only one winner, others echoed it back
  });
});
