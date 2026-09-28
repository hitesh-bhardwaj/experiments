"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { StatCard } from "@/components/admin/StatCard";
import { LineTrendChart } from "@/components/admin/charts/LineTrendChart";
import { DonutChart } from "@/components/admin/charts/DonutChart";
import { buildUserActivitySlug } from "@/lib/user-slug";

// Merges the former standalone /dashboard/admin/installs (aggregate charts)
// and /dashboard/admin/copy-activity (raw per-event log) pages into one
// section of the single Activity page. Both read the same install_events
// ledger - a copy on the website, a `hyperiux add`, and an MCP
// hyperiux_get_effect call are all just different sources for the same
// underlying "this effect is being (or about to be) installed" event, so
// viewing them as two separate admin pages was drawing a distinction the
// data itself doesn't have.

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 10;
const SOURCES = ["all", "web", "cli", "mcp"];

function ChartPanel({ title, children }) {
  return (
    <div className=" bg-[#272727] p-6">
      <p className="mb-4 text-white">{title}</p>
      {children}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="flex h-full flex-col justify-between  p-6 bg-[#272727]">
      <div className="mb-3 h-4 w-20 animate-pulse  bg-white/10" />
      <div className="h-7 w-16 animate-pulse  bg-white/15" />
    </div>
  );
}

function ChartPanelSkeleton({ height = 260 }) {
  return (
    <div className=" bg-[#272727] p-6">
      <div className="mb-4 h-4 w-32 animate-pulse  bg-white/10" />
      <div className="animate-pulse  bg-white/5" style={{ height }} />
    </div>
  );
}

function SourceBadge({ source }) {
  const styles = {
    web: "bg-blue-500/15 text-blue-400",
    cli: "bg-purple-500/15 text-purple-300",
    mcp: "bg-emerald-500/15 text-emerald-400",
  };

  return (
    <span
      className={`inline-flex items-center  px-2.5 py-0.5 text-xs font-medium uppercase ${
        styles[source] || "bg-white/8 text-white/50"
      }`}
    >
      {source || "unknown"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Clerk profiles aren't required to set a display name, so a signed-in
// event can still have no `userName` - falling back to "-" there just hid
// the person behind an unhelpful dash when their email was on hand the
// whole time. Same fallback as displayName() in dashboard/admin/page.js.
function resolveDisplayName({ name, email }) {
  if (name) return name;
  if (email) {
    const local = email.split("@")[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return "Unnamed user";
}

// A copy event only has a Clerk identity when it came from a signed-in user
// - anonymous web visitors and unauthenticated CLI/MCP calls are tracked by
// identity_key (device:/ip:) instead, so there's no name/email to show.
function UserCell({ event }) {
  if (event.userId) {
    const name = resolveDisplayName({ name: event.userName, email: event.userEmail });
    return (
      <div className="flex items-center gap-3">
        {event.userImageUrl ? (
          <Image
            src={event.userImageUrl}
            alt={name}
            width={28}
            height={28}
            className="h-7 w-7  object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center  bg-white/10 text-xs font-medium">
            {name[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium text-white max-w-48">{name}</p>
          <p className="truncate text-xs text-white/45 max-w-48">{event.userEmail || event.userId}</p>
        </div>
      </div>
    );
  }

  return (
    <span className="font-mono text-xs text-white/40" title={event.identityKey}>
      Anonymous · {event.identityKey?.split(":")[0] || "unknown"}
    </span>
  );
}

// Shared between "Top users by copies" (web-only) and "Top installers"
// (web/CLI/MCP combined) - same card layout, different ranking + unit word.
function UserLeaderboard({ users, emptyMessage, unitSingular, unitPlural }) {
  if (users.length === 0) {
    return (
      <div className="border border-white/10 px-4 py-10 text-center text-sm text-white/40">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {users.map((user, index) => (
        <Link
          key={user.clerkUserId}
          href={`/dashboard/admin/activity/${buildUserActivitySlug(user)}`}
          className="flex items-center gap-3 border border-white/10 bg-white/3 p-4 transition hover:border-white/25 hover:bg-white/5"
        >
          {user.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={resolveDisplayName(user)}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0  object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center  bg-white/10 text-sm font-medium">
              {resolveDisplayName(user)[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{resolveDisplayName(user)}</p>
            <p className="text-xs text-white">
               {user.count} {user.count === 1 ? unitSingular : unitPlural}
            </p>
          </div>
          <div>
          #{index + 1}

          </div>
        </Link>
      ))}
    </div>
  );
}

function buildRangeQuery({ range, customFrom, customTo }) {
  const params = new URLSearchParams();
  if (range === "custom") {
    if (customFrom) params.set("from", customFrom);
    if (customTo) params.set("to", customTo);
  } else if (range !== "all") {
    params.set("range", range);
  }
  return params;
}

function AggregatePanels({ range, customFrom, customTo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    // Resets loading immediately on a range switch instead of flashing
    // stale data while the new fetch is in flight - a real external-system
    // sync, not derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const params = buildRangeQuery({ range, customFrom, customTo });

    fetch(`/api/admin/installs?${params.toString()}`)
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json.error || "Failed to load install data");
        if (active) setData(json);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range, customFrom, customTo]);

  if (error) {
    return (
      <div className=" border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (loading || !data) {
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <ChartPanelSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Total Installs" value={data.stats.totalInstalls} />
        <StatCard label="Installs Today" value={data.stats.installsToday} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Installs">
          <LineTrendChart data={data.installTrend} xKey="label" color="#ff5f00" valueLabel="installs" />
        </ChartPanel>

        <ChartPanel title="By source">
          <DonutChart data={data.sourceBreakdown} />
        </ChartPanel>

        <ChartPanel title="By plan">
          <DonutChart data={data.planBreakdown} />
        </ChartPanel>
      </div>

      <div className="space-y-4 mt-10">
        <div>
          <h2 className="text-lg font-medium text-white">Top users by copies</h2>
          <p className="mt-1 text-sm text-white/50">
            Signed-in users ranked by successful website copies in the selected window.
            Click a row for their full activity detail.
          </p>
        </div>

        <UserLeaderboard
          users={data.topUsers}
          emptyMessage="No signed-in copies in this window."
          unitSingular="copy"
          unitPlural="copies"
        />
      </div>

      <div className="space-y-4 mt-10">
        <div>
          <h2 className="text-lg font-medium text-white">Top installers</h2>
          <p className="mt-1 text-sm text-white/50">
            Signed-in users ranked by successful installs across web, CLI, and MCP in the
            selected window. Click a row for their full activity detail.
          </p>
        </div>

        <UserLeaderboard
          users={data.topInstallers}
          emptyMessage="No signed-in installs in this window."
          unitSingular="install"
          unitPlural="installs"
        />
      </div>
    </>
  );
}

function EventLog({ range, customFrom, customTo }) {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [effectSearch, setEffectSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [prevEffectSearch, setPrevEffectSearch] = useState(effectSearch);
  const [prevSourceFilter, setPrevSourceFilter] = useState(sourceFilter);
  const [prevPageSize, setPrevPageSize] = useState(pageSize);
  const [prevRange, setPrevRange] = useState(range);
  const [prevCustomFrom, setPrevCustomFrom] = useState(customFrom);
  const [prevCustomTo, setPrevCustomTo] = useState(customTo);

  // Reset to page 1 whenever a filter changes - derived purely from values
  // already available during render, so adjust it here instead of in an effect.
  if (
    prevEffectSearch !== effectSearch ||
    prevSourceFilter !== sourceFilter ||
    prevPageSize !== pageSize ||
    prevRange !== range ||
    prevCustomFrom !== customFrom ||
    prevCustomTo !== customTo
  ) {
    setPrevEffectSearch(effectSearch);
    setPrevSourceFilter(sourceFilter);
    setPrevPageSize(pageSize);
    setPrevRange(range);
    setPrevCustomFrom(customFrom);
    setPrevCustomTo(customTo);
    setCurrentPage(1);
  }

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildRangeQuery({ range, customFrom, customTo });
      if (effectSearch) params.set("effect", effectSearch);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      params.set("limit", String(pageSize));
      params.set("offset", String((currentPage - 1) * pageSize));

      const res = await fetch(`/api/admin/copy-activity?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load activity");
      setEvents(json.events || []);
      setTotal(json.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [effectSearch, sourceFilter, pageSize, range, customFrom, customTo, currentPage]);

  useEffect(() => {
    const timer = setTimeout(fetchEvents, 300);
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4 mt-10">
      <div>
        <h2 className="text-lg font-medium text-white">Recent installs &amp; copies</h2>
        <p className="mt-1 text-sm text-white/50">
          {total} events across web, CLI, and MCP in the selected window - every one is a real effect delivery.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="text"
            placeholder="Search by effect…"
            value={effectSearch}
            onChange={(e) => setEffectSearch(e.target.value)}
            className="w-full  border border-white/10 bg-white/5 py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/25"
          />
        </div>
        <CustomSelect
          value={sourceFilter}
          onChange={setSourceFilter}
          options={SOURCES.map((s) => ({
            value: s,
            label: s === "all" ? "All sources" : s.toUpperCase(),
          }))}
        />
        <div className="flex items-center gap-2 text-sm text-white/45">
          Per page
          <CustomSelect
            size="compact"
            value={String(pageSize)}
            onChange={(value) => setPageSize(Number(value))}
            options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
          />
        </div>
      </div>

      {error && (
        <div className=" border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className=" border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Effect</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/45 uppercase tracking-wider">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {loading ? (
                Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4  bg-white/8 animate-pulse" style={{ width: j === 0 ? "140px" : "80px" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-white/40">
                    No activity found.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="transition hover:bg-white/2">
                    <td className="px-4 py-3">
                      <UserCell event={event} />
                    </td>
                    <td className="px-4 py-3 text-white/80">{event.effectTitle}</td>
                    <td className="px-4 py-3">
                      <SourceBadge source={event.source} />
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap text-xs">
                      {formatDate(event.occurredAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && events.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-white/45">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center  border border-white/10 bg-white/5 text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center  border border-white/10 bg-white/5 text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function InstallActivitySection({ range, customFrom, customTo }) {
  return (
    <div className="space-y-4">
      <AggregatePanels range={range} customFrom={customFrom} customTo={customTo} />
      <EventLog range={range} customFrom={customFrom} customTo={customTo} />
    </div>
  );
}
