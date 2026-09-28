# Daily Automated CSV Invite Sender

> Status: planned, not yet started. Saved 2026-08-26 for later implementation.

## Context

The admin dashboard (`apps/docs/src/app/(app)/(workspace)/dashboard/admin/page.js`) already has an `InviteModal` that lets an admin paste or upload emails and send them *immediately*, capped at 100/day (`DAILY_INVITE_LIMIT` in `apps/docs/src/app/api/admin/waitlist/invite/route.js`). There's no way today to hand it a large list and have it trickle out automatically over multiple days.

This adds a second, additive flow: an admin uploads a CSV once; a Vercel Cron job fires daily at **05:30 UTC (11:00 IST, no DST)** and sends the next 70 rows, sharing the *same* 100/day cap the manual flow already enforces. The queue is durable server-side state in Supabase, survives redeploys, self-terminates when exhausted (no looping), and a fresh upload always fully replaces whatever is still queued.

The existing `InviteModal` and manual `/api/admin/waitlist/invite` route are untouched behaviorally - the only change there is a pure refactor so both send paths share one implementation of "invite + email + log" and "how many sent today," so the cap can never drift between the two.

**Note for implementation**: `apps/docs/AGENTS.md` flags that this repo's Next.js version has breaking changes vs. training data - check `node_modules/next/dist/docs/` for current route-handler/`formData()` conventions before writing the new routes.

## Free-tier check (confirmed 2026-08-26)

- **Vercel Hobby**: not a constraint. As of Jan 2026, Hobby allows up to 100 cron jobs/project (we need 1); Hobby crons run once/day (exactly our cadence). Caveat: Hobby doesn't guarantee the exact minute - delivery can land anywhere within the scheduled UTC hour, so "11:00 AM IST" could drift up to ~30 min. Exact-minute delivery needs Pro.
- **Resend free tier** (100/day, 3,000/month) is the real ceiling - almost certainly why `DAILY_INVITE_LIMIT = 100` already exists in the code. The plan shares that same 100/day cap between manual + auto-batch, so the daily limit is never exceeded. Watch the *monthly* total: sustaining close to 100/day for 30 days approaches the 3,000/month ceiling: extra sends that month would then fail until reset/upgrade.
- **Supabase**: negligible extra load either way.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Batch storage shape | Two tables: `invite_batches` (one row per upload) + `invite_batch_rows` (one row per invitee) | Enables atomic "claim next N pending rows" and per-row sent/failed visibility in the UI. |
| CSV parsing | Hand-rolled minimal RFC4180 parser, no new dependency | Format is just 2 columns (`email`, optional `name`); not worth adding `papaparse` for this. |
| Re-upload mid-batch | Old active batch → `status='replaced'` (kept for audit, not deleted); new batch inserted `active`, cursor 0 | Matches the append-don't-delete convention already used for `sent_emails`/`install_events`. |
| Per-row failure handling | Cursor always advances past attempted rows; a row is claimed once, sent once, marked `sent`/`failed`, never auto-retried | Matches existing manual-route behavior (failed manual invites aren't auto-retried either) and prevents one permanently-bad address from wedging the queue forever. |
| Cap sharing | Cron sends `min(70, DAILY_INVITE_LIMIT - sentToday, rowsRemaining)` using the same `getInvitesSentToday()` the manual route uses | Explicit requirement - must never become two separate counters. |
| Concurrency safety | A Postgres function takes `pg_advisory_xact_lock`, re-checks today's `sent_emails` count inside that locked transaction, and atomically advances the cursor | Mirrors the existing `claim_founding_slot`-style pattern in this repo (`apps/docs/src/lib/founding-slots.js`, `apps/docs/test/fixtures/install-limit-schema.sql`); protects against Vercel's documented "cron delivery is best-effort, occasionally duplicate" behavior. |

## 1. Database schema (run by hand in Supabase SQL editor - no migration tooling exists in this repo)

```sql
create table if not exists invite_batches (
  id bigint generated always as identity primary key,
  filename text not null,
  uploaded_by text not null,               -- Clerk user id
  uploaded_at timestamptz not null default now(),
  total_rows integer not null,
  cursor integer not null default 0,       -- 0-based index of the next row to claim
  status text not null default 'active'
    check (status in ('active', 'completed', 'replaced', 'canceled')),
  completed_at timestamptz,
  replaced_at timestamptz,
  canceled_at timestamptz
);

create unique index if not exists invite_batches_one_active_idx
  on invite_batches ((status)) where status = 'active';

create table if not exists invite_batch_rows (
  id bigint generated always as identity primary key,
  batch_id bigint not null references invite_batches (id) on delete cascade,
  row_index integer not null,              -- defines send order
  email text not null,
  name text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error text,
  unique (batch_id, row_index)
);

create index if not exists invite_batch_rows_pending_idx
  on invite_batch_rows (batch_id, row_index) where status = 'pending';

create or replace function replace_active_invite_batch(
  p_uploaded_by text, p_filename text, p_rows jsonb
) returns bigint language plpgsql as $$
declare
  v_batch_id bigint;
  v_total integer;
begin
  perform pg_advisory_xact_lock(hashtext('invite_batch_queue'));

  update invite_batches set status = 'replaced', replaced_at = now()
    where status = 'active';

  v_total := jsonb_array_length(p_rows);

  insert into invite_batches (filename, uploaded_by, total_rows, cursor, status)
    values (p_filename, p_uploaded_by, v_total, 0, 'active')
    returning id into v_batch_id;

  insert into invite_batch_rows (batch_id, row_index, email, name)
    select v_batch_id, ord - 1, lower(trim(elem->>'email')), nullif(trim(elem->>'name'), '')
    from jsonb_array_elements(p_rows) with ordinality as t(elem, ord);

  return v_batch_id;
end;
$$;

create or replace function claim_invite_batch_rows(
  p_batch_id bigint, p_max_rows integer, p_daily_limit integer
) returns table (id bigint, email text, name text) language plpgsql as $$
declare
  v_cursor integer; v_total integer; v_sent_today integer;
  v_take integer; v_new_cursor integer;
begin
  perform pg_advisory_xact_lock(hashtext('invite_batch_queue'));

  select cursor, total_rows into v_cursor, v_total
    from invite_batches where invite_batches.id = p_batch_id and status = 'active'
    for update;

  if not found then return; end if;

  select count(*) into v_sent_today from sent_emails
    where email_type = 'invitations' and status = 'success'
      and sent_at >= date_trunc('day', now() at time zone 'utc');

  v_take := least(p_max_rows, greatest(0, p_daily_limit - v_sent_today), v_total - v_cursor);
  if v_take <= 0 then return; end if;

  v_new_cursor := v_cursor + v_take;

  update invite_batches
    set cursor = v_new_cursor,
        status = case when v_new_cursor >= v_total then 'completed' else status end,
        completed_at = case when v_new_cursor >= v_total then now() else completed_at end
    where invite_batches.id = p_batch_id;

  return query
    select r.id, r.email, r.name from invite_batch_rows r
    where r.batch_id = p_batch_id and r.row_index >= v_cursor and r.row_index < v_new_cursor
      and r.status = 'pending'
    order by r.row_index;
end;
$$;

create or replace function cancel_active_invite_batch() returns bigint language plpgsql as $$
declare v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('invite_batch_queue'));
  update invite_batches set status = 'canceled', canceled_at = now()
    where status = 'active' returning id into v_id;
  return v_id;
end;
$$;
```

No RLS - consistent with every other table here; all access goes through the service-role client in `apps/docs/src/lib/supabase.js`.

## 2. Refactor: `apps/docs/src/app/api/admin/waitlist/invite/route.js`

**New file `apps/docs/src/lib/inviteUser.js`** - move out (verbatim logic, generalized to accept `{email, name}`):
- `DAILY_INVITE_LIMIT = 100`
- `EMAIL_RE`
- `startOfTodayUTC()`
- `getInvitesSentToday()` (same `sent_emails` query, lines 30-40 today)
- `inviteOneUser(clerk, { email, name })` - same Clerk `createInvitation` + `sendEmail` body as today's `inviteOne` (lines 59-116); `name` accepted but not yet used in the template (template stays as-is).
- `inviteManyWithConcurrency(clerk, recipients, concurrency)` - same worker-pool as today's `inviteWithConcurrency` (lines 118-135), operating on `{email, name}` objects.

**`route.js` changes**: import the above from `@/lib/inviteUser` instead of defining locally; `MAX_EMAILS_PER_REQUEST = 10` and `CONCURRENCY = 5` stay local (HTTP-shape concerns, not shared state); `POST` calls `inviteManyWithConcurrency(clerk, valid.map((email) => ({ email })), CONCURRENCY)`. No behavior change to this endpoint.

## 3. New files

**`apps/docs/src/lib/csv.js`**
- `parseCsv(text)` - minimal RFC4180 tokenizer (quoted fields, `""` escaping, `\n`/`\r\n`), returns `string[][]`.
- `parseInviteCsv(text)` - requires an `email` header (case-insensitive), optional `name`/`full name` header; per row: trim/lowercase email, validate via `EMAIL_RE` (from `@/lib/inviteUser`), dedupe case-insensitively (first wins); returns `{ rows: [{email, name}], invalidCount, duplicateCount }`.

**`apps/docs/src/app/api/admin/waitlist/auto-invite/route.js`** (assertAdmin-gated)
- `MAX_FILE_SIZE_BYTES = 2MB`, `MAX_BATCH_ROWS = 5000`.
- `GET` - status for the UI: active/most-recent batch (filename, uploadedAt, totalRows, cursor, sentCount/failedCount/pendingCount via `count:'exact'` queries on `invite_batch_rows`), `sharedCap: { limit, sentToday, remaining }` (via `getInvitesSentToday`), `nextRunAt` (next 05:30 UTC, plain `Date` math, no library needed since offset is fixed).
- `POST` - reads `req.formData()`, validates file size, `parseInviteCsv(await file.text())`, 400 on zero rows or missing `email` column or `rows.length > MAX_BATCH_ROWS`, else `supabase.rpc("replace_active_invite_batch", { p_uploaded_by: userId, p_filename: file.name, p_rows: rows })` (`userId` from `auth()`).
- `DELETE` - `supabase.rpc("cancel_active_invite_batch")`.

**`apps/docs/src/app/api/cron/auto-invite/route.js`** (CRON_SECRET-gated, not assertAdmin - Vercel's invoker has no Clerk session)
```js
const authHeader = request.headers.get("authorization");
if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically to configured cron routes when `CRON_SECRET` is set - current documented behavior.

Body: find `active` batch → `supabase.rpc("claim_invite_batch_rows", { p_batch_id, p_max_rows: 70, p_daily_limit: DAILY_INVITE_LIMIT })` → if empty, no-op 200 → else `inviteManyWithConcurrency(clerk, claimed, CONCURRENCY)` → update each `invite_batch_rows` row to `sent`/`failed` with `error`/`sent_at` (join back to `claimed` by index) → return `{ ok: true, attempted, sent, failed }`.

**`apps/docs/vercel.json`** - add:
```json
"crons": [{ "path": "/api/cron/auto-invite", "schedule": "30 5 * * *" }]
```
⚠️ Flag to confirm: Vercel Hobby plan only guarantees cron delivery *within the scheduled hour*, not the exact minute - exact-minute delivery needs Pro/Enterprise. Confirmed acceptable to run on Hobby (see "Free-tier check" above).

**`apps/docs/src/components/admin/AutoInviteBatchCard.jsx`** - new client component, rendered from `admin/page.js` as its own section (not inside `InviteModal`): file upload input (confirms via `window.confirm` if replacing a still-active batch), status display (sent/total, pending, status pill, "Next run" in `Asia/Kolkata` via `Intl.DateTimeFormat`), cancel button. Styling matches existing conventions in `admin/page.js` (borders, `ButtonV3`, badge patterns already used for role/plan pills).

## 4. Env vars

- **New**: `CRON_SECRET` - random string, added to `apps/docs/.env.local` (placeholder) and Vercel Project Settings (Production + Preview).
- Reused as-is: `RESEND_API_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.

## 5. Edge cases

- Manual invites already consumed part/all of today's cap before cron fires → `claim_invite_batch_rows` recomputes `sent_emails` count inside its own locked transaction right before claiming.
- Empty/header-only CSV → 400 before touching the DB.
- Missing `email` column → explicit 400 error naming the missing header.
- Duplicate emails in one CSV → deduped, count reported back.
- Re-upload mid-batch → old batch flips to `replaced` (history kept), new batch starts at cursor 0, serialized against any in-flight cron claim via the same advisory lock.
- Batch exhausted → `status='completed'` the instant cursor reaches total; later cron runs no-op. No looping back.
- Clerk/Resend failure mid-run → row marked `failed` with `error`; cursor already advanced, so a bad address can't wedge future days.
- Concurrent/duplicate cron invocations → serialized by `pg_advisory_xact_lock`; a second invocation sees the already-advanced cursor and fresh cap count.
- Cancel while cron is claiming → `cancel_active_invite_batch` takes the same lock, so it's serialized too.

## 6. Verification plan

1. Run the SQL in Supabase's SQL editor; confirm tables/functions exist.
2. Upload a small CSV (3-5 rows, mix of valid/invalid/duplicate) via the new UI; confirm counts and check `invite_batches`/`invite_batch_rows` directly.
3. Upload a second CSV mid-batch; confirm the first flips to `replaced` and a fresh `active` batch starts at cursor 0.
4. Trigger the cron route manually without waiting a day: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/auto-invite` locally, or `vercel crons run /api/cron/auto-invite` against a deployment with `vercel.json`'s crons live.
5. Cap-sharing check: send ~95 manual invites, then trigger cron, confirm it sends only `min(70, 100-95, remaining)`.
6. Exhaustion check: 3-row batch, trigger cron once → `completed`; trigger again → no-op.
7. Cross-check `sent_emails` rows against `invite_batch_rows.status`/`sent_at`/`error`.
8. Confirm the manual `/api/admin/waitlist/invite` endpoint still behaves identically after the refactor (same request/response shape, same cap enforcement).

## CSV format for admins uploading a list

```csv
email,name
jane.doe@example.com,Jane Doe
john.smith@example.com,John Smith
```

- `email` (required)
- `name` (optional - not yet used in the email template, but stored for future personalization)

### Critical files
- `apps/docs/src/lib/inviteUser.js` (new)
- `apps/docs/src/lib/csv.js` (new)
- `apps/docs/src/app/api/admin/waitlist/invite/route.js` (refactor only)
- `apps/docs/src/app/api/admin/waitlist/auto-invite/route.js` (new)
- `apps/docs/src/app/api/cron/auto-invite/route.js` (new)
- `apps/docs/vercel.json` (add crons)
- `apps/docs/src/components/admin/AutoInviteBatchCard.jsx` (new)
- `apps/docs/src/app/(app)/(workspace)/dashboard/admin/page.js` (render the new card)
