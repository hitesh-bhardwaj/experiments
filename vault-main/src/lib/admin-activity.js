import "server-only";

// UTC-based to match copy_usage_effects.usage_date's own convention (see
// todayUTC() in api/dashboard/usage/route.js) - trend charts stay in step
// with the same day boundary the daily copy limit resets on.
export function utcDateString(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(dateString) {
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Builds an ordered [oldest..newest] list of { date, label, value: 0 }
// buckets covering the last `days` days (inclusive of today), so trend
// charts show a flat zero for quiet days instead of a gap.
export function buildDailyBuckets(days = 30) {
  const buckets = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = utcDateString(i);
    buckets.push({ date, label: formatDayLabel(date), value: 0 });
  }

  return buckets;
}

// Fills each bucket's `value` from the matching rows. `getValue` defaults to
// a plain count (+1 per row); pass e.g. (row) => row.amount / 100 to sum
// instead of count (revenue). Rows whose date has no matching bucket are
// ignored - the caller's query should already be scoped to the bucket range.
export function fillDailyBuckets(buckets, rows, getDate, getValue = () => 1) {
  const byDate = new Map(buckets.map((bucket) => [bucket.date, bucket]));

  for (const row of rows) {
    const bucket = byDate.get(getDate(row));
    if (bucket) bucket.value += getValue(row);
  }

  return buckets;
}

// Same shape as fillDailyBuckets, for a multi-line trend instead of one
// value per bucket - each bucket becomes e.g. { date, label, web: 2, cli: 1,
// mcp: 0 } instead of { date, label, value }. `getSeriesKey` picks which of
// `seriesKeys` a row belongs to; a row whose key isn't in `seriesKeys` (or
// whose date has no matching bucket) is silently dropped, same as
// fillDailyBuckets ignoring out-of-range rows.
export function fillDailyBucketsBySeries(buckets, rows, getDate, getSeriesKey, seriesKeys) {
  for (const bucket of buckets) {
    for (const key of seriesKeys) {
      bucket[key] = 0;
    }
  }

  const byDate = new Map(buckets.map((bucket) => [bucket.date, bucket]));

  for (const row of rows) {
    const bucket = byDate.get(getDate(row));
    if (!bucket) continue;

    const key = getSeriesKey(row);
    if (seriesKeys.includes(key)) {
      bucket[key] += 1;
    }
  }

  return buckets;
}

// Shared "Today / 7d / 30d / 90d / All time" preset used by every admin
// endpoint that exposes the same date-range picker - one definition so the
// boundary can't drift between the users list, its export, and its stats.
export const DATE_RANGE_DAYS = { today: 0, "7d": 6, "30d": 29, "90d": 89 };

// UTC start-of-day boundary for a range preset, or null for "all"/unknown
// (no lower bound - the caller simply omits the filter in that case).
export function resolveRangeStart(range) {
  if (!range || !(range in DATE_RANGE_DAYS)) return null;

  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - DATE_RANGE_DAYS[range]);
  return date;
}

function parseUTCDateParam(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// One bounds resolver shared by every admin endpoint exposing the "Today /
// 7d / 30d / 90d / All time / Custom range" picker - explicit `from`/`to`
// (plain YYYY-MM-DD strings, as sent by an <input type="date">) take
// precedence over the `range` preset whenever present, since the client
// only ever sends one or the other. Returns bounds in both forms callers
// need: ISO timestamps (start inclusive, end EXCLUSIVE - for timestamptz
// columns) and plain date strings (both ends inclusive - for a DATE column
// like install_unlocks.usage_date, where "the whole day" is the unit).
export function resolveDateBounds({ range, from, to } = {}) {
  const customFrom = parseUTCDateParam(from);
  const customTo = parseUTCDateParam(to);

  const start = customFrom || resolveRangeStart(range);

  let endExclusive = null;
  if (customTo) {
    endExclusive = new Date(customTo);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  }

  return {
    startISO: start ? start.toISOString() : null,
    endISO: endExclusive ? endExclusive.toISOString() : null,
    startDateString: start ? start.toISOString().slice(0, 10) : null,
    endDateString: customTo ? customTo.toISOString().slice(0, 10) : null,
  };
}

// Trend-chart bucket builder for the same shared date-range picker: unlike
// the fixed "last 30 days" a chart used to always show, the selected
// window's length now varies (a day, a quarter, a custom multi-month
// span, or unbounded "all time"). An open lower bound ("all time", or a
// custom range with no "from") defaults its chart window to the most
// recent `maxDays` ending at the window's end; an open upper bound
// defaults to today. The whole span is then clamped to `maxDays` buckets
// (keeping the most recent days) so a wide/unbounded range still renders a
// readable chart - callers use the real (unclamped) start/end bounds
// separately for their actual aggregate numbers, which stay fully accurate
// regardless of chart density.
export function buildDailyBucketsForRange({ startDateString, endDateString, maxDays = 90 } = {}) {
  const end = endDateString ? new Date(`${endDateString}T00:00:00Z`) : new Date(`${utcDateString(0)}T00:00:00Z`);

  let start;
  if (startDateString) {
    start = new Date(`${startDateString}T00:00:00Z`);
  } else {
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (maxDays - 1));
  }

  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const days = Math.min(Math.max(totalDays, 1), maxDays);

  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - i);
    const dateString = date.toISOString().slice(0, 10);
    buckets.push({ date: dateString, label: formatDayLabel(dateString), value: 0 });
  }

  return buckets;
}
