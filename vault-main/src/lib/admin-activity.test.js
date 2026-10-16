import { describe, it, expect } from "vitest";
import { compareStat, comparisonWindows, seriesBuckets } from "./admin-activity.js";

const DAY = 86400000;
const NOW = Date.UTC(2026, 9, 16, 12);

describe("comparisonWindows", () => {
  it("compares a bounded window with the same length just before it", () => {
    const start = new Date(NOW - 30 * DAY).toISOString();
    const w = comparisonWindows({ startISO: start, endISO: null, range: "30d", now: NOW });
    expect(w.current).toEqual([NOW - 30 * DAY, NOW]);
    expect(w.previous).toEqual([NOW - 60 * DAY, NOW - 30 * DAY]);
    expect(w.label).toBe("vs prev. 30d");
  });

  it("all time: the last 30 days against the 30 before", () => {
    const w = comparisonWindows({ startISO: null, endISO: null, range: "all", now: NOW });
    expect(w.current).toEqual([NOW - 30 * DAY, NOW]);
    expect(w.previous).toEqual([NOW - 60 * DAY, NOW - 30 * DAY]);
    expect(w.label).toBe("last 30d vs prev. 30d");
  });

  it("today compares with yesterday", () => {
    const w = comparisonWindows({ startISO: new Date(NOW - DAY / 2).toISOString(), endISO: null, range: "today", now: NOW });
    expect(w.label).toBe("vs yesterday");
  });
});

describe("seriesBuckets", () => {
  it("hourly for a day, daily up to two months, weekly beyond", () => {
    expect(seriesBuckets([], NOW - DAY, NOW)).toHaveLength(24);
    expect(seriesBuckets([], NOW - 30 * DAY, NOW)).toHaveLength(30);
    expect(seriesBuckets([], NOW - 140 * DAY, NOW)).toHaveLength(20);
  });

  it("adds each item's value to its bucket and ignores items outside", () => {
    const series = seriesBuckets([{ at: NOW - 1.5 * DAY, value: 2 }, { at: NOW - 1.2 * DAY }, { at: NOW + DAY }], NOW - 3 * DAY, NOW);
    expect(series.map((point) => point.value)).toEqual([0, 3, 0]);
  });
});

describe("compareStat", () => {
  it("totals the window, both comparison windows and the line", () => {
    const windows = comparisonWindows({ startISO: new Date(NOW - 7 * DAY).toISOString(), endISO: null, range: "7d", now: NOW });
    const items = [{ at: NOW - DAY }, { at: NOW - 2 * DAY }, { at: NOW - 8 * DAY }, { at: NOW - 30 * DAY }];
    const stat = compareStat(items, windows, { inWindow: (at) => at >= NOW - 7 * DAY, seriesStartMs: NOW - 7 * DAY });
    expect(stat).toMatchObject({ value: 2, current: 2, previous: 1 });
    expect(stat.series.reduce((sum, point) => sum + point.value, 0)).toBe(2);
  });
});
