"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { CARD, CARD_PAD, DATE_PRESETS, DateRangeFilter, Pager, PerPageMenu, SourceChip } from "@/components/Dashboard/DashboardUI";
import { StatCard, StatCardSkeleton, TWO_OF_THREE } from "@/components/Dashboard/TrendStat";
import { SOURCE_BARS, UsageBars } from "@/components/Dashboard/UsageBars";
import { useAdminAudience } from "@/components/admin/AdminAudience";
import { SlidingSegment } from "@/components/ui/SlidingSegment";
import { Bar, SkeletonCard } from "@/components/Dashboard/DashboardSkeletons";
import { useDashboardData } from "@/components/Dashboard/useDashboardData";
import { getDashboardPreview, sampleAdminActivity } from "@/lib/dev/dashboardPreview";
import { buildUserActivitySlug } from "@/lib/user-slug";
import { UserAvatar } from "@/components/admin/UserAvatar";

// The page's window: the dashboard's date filter (all time to start with)
const START_DATES = { preset: "all", from: "", to: "" };

// The window as the admin APIs' query: a preset, or a custom from / to (one day if only
// a start is picked yet)
function rangeQuery({ preset, from, to }) {
  if (preset === "custom" && from) return `from=${from}&to=${to || from}`;
  return `range=${preset === "custom" ? "30d" : preset}`;
}
const FEED_SOURCES = [
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "cli", label: "CLI" },
  { id: "mcp", label: "MCP" },
];
const FX_TABS = [
  { id: "installed", label: "Installed", key: "topInstalledEffects", unit: "installs" },
  { id: "saved", label: "Saved", key: "topSavedEffects", unit: "saves" },
];

const number = (n) => new Intl.NumberFormat("en").format(n || 0);
const money = (amount, currency) => new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
const formatWhen = (value) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

// A ranked list: position, name (with a bar for its share of the leader), count
function RankList({ rows, unit }) {
  if (!rows.length) return <p className="type-body text-black/60">Nothing in this window.</p>;
  const max = rows[0].count || 1;
  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => (
        <li key={row.id} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.6)] last:border-b-0 max-lg:py-2.5">
          <span className={`type-small w-5 shrink-0 ${i < 3 ? "text-primary" : "text-black/40"}`}>{i + 1}</span>
          {row.lead}
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            {row.href ? (
              <Link href={row.href} className="type-body truncate transition-colors duration-300 hover:text-primary">
                {row.name}
              </Link>
            ) : (
              <span className="type-body truncate">{row.name}</span>
            )}
            <span className="h-1 w-full bg-black/5">
              <span className="block h-full bg-primary" style={{ width: `${(row.count / max) * 100}%` }} />
            </span>
          </span>
          <span className="type-small shrink-0 text-right">
            {number(row.count)} <span className="text-black/60">{unit}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// The admin pages' avatar: initials in orange on the dark page colour
function Avatar({ name, email }) {
  return <UserAvatar name={name} email={email} className="size-8" />;
}

/**
 * Admin Activity: site-wide usage over a window - stat cards with their change against
 * the previous period, installs by day and by source (web / CLI / MCP), plans, top effects
 * and installers, template views and sales, and the live feed of installs.
 */
// Loading: the stat cards (3 then 2), the by-day chart, by source / plans / today, the two
// rankings, the templates table and the feed - each in its own card's shape. `revenue`:
// the Revenue card shows (super admins).
function ActivitySkeleton({ revenue }) {
  const ROW = "flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3";
  const ranked = (rows) => (
    <div className="flex flex-col gap-[calc(var(--cvw)*0.9)] max-lg:gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bar type="type-small" className="w-5" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Bar type="type-body" className="w-[55%]" />
            <Bar className="h-1 w-[80%]" />
          </div>
          <Bar type="type-small" className="w-16" />
        </div>
      ))}
    </div>
  );
  return (
    <div aria-busy="true" aria-label="Loading activity" className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {[revenue ? [1, 1, 1] : [1, 1], [2, 1]].map((row, r) => (
        <div key={r} className={ROW}>
          {row.map((span, i) => (
            <StatCardSkeleton key={i} className={span === 2 && revenue ? TWO_OF_THREE : "flex-1"} />
          ))}
        </div>
      ))}
      <SkeletonCard className="gap-[calc(var(--cvw)*1.6)] max-lg:gap-5">
        <div className="flex justify-between gap-3">
          <div className="flex w-[50%] flex-col gap-1">
            <Bar type="type-h3" className="w-[45%]" />
            <Bar type="type-small" className="w-full" />
          </div>
          <Bar type="type-small" className="w-32" />
        </div>
        <div className="flex h-[calc(var(--cvw)*12)] items-end gap-1 max-lg:h-48">
          {[40, 65, 30, 80, 55, 20, 70, 45, 90, 35, 60, 50, 75, 25, 55, 85, 40, 65].map((h, i) => (
            <Bar key={i} className="flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      </SkeletonCard>
      <div className={ROW}>
        <SkeletonCard className="flex-1 gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
          <Bar type="type-h3" className="w-32" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Bar type="type-small" className="w-full" />
              <Bar className="h-1.5 w-full" />
            </div>
          ))}
        </SkeletonCard>
        <SkeletonCard className="flex-1 justify-between gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
          <Bar type="type-h3" className="w-20" />
          <Bar type="type-h2" className="w-[45%]" />
          <Bar className="h-1.5 w-full" />
        </SkeletonCard>
        <SkeletonCard dark className="flex-1 justify-between gap-[calc(var(--cvw)*1.2)] max-lg:gap-4">
          <Bar type="type-label" className="w-16" />
          <Bar type="type-h1" className="w-[30%]" />
          <Bar type="type-small" className="w-[80%]" />
        </SkeletonCard>
      </div>
      <div className={ROW}>
        {[0, 1].map((i) => (
          <SkeletonCard key={i} className="flex-1 gap-(--cvw) max-lg:gap-4">
            <div className="flex justify-between gap-3">
              <Bar type="type-h3" className="w-32" />
              <Bar className="h-8 w-44" />
            </div>
            {ranked(6)}
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard className="gap-(--cvw) max-lg:gap-4">
        <Bar type="type-h3" className="w-28" />
        {ranked(4)}
      </SkeletonCard>
    </div>
  );
}

export default function AdminActivityPage() {
  const { path, isSuperAdmin, catalog } = useDashboard();
  const [dates, setDates] = useState(START_DATES);
  const query = rangeQuery(dates);
  // Customers / Internal / All: chosen in the tab row (DashboardShell), shared by every admin page
  const [audience] = useAdminAudience();
  const [fxTab, setFxTab] = useState("installed");

  // The overview and the installs numbers for the window: cached per window (skeleton on a
  // window's first load only), refreshed on focus and every 30s
  const { data, failed } = useDashboardData(
    `admin-activity:${query}:${audience}`,
    async () => {
      if (getDashboardPreview()) {
        const sample = sampleAdminActivity(catalog);
        return { overview: sample.overview, installs: sample.installs };
      }
      const get = (url) => fetch(url, { cache: "no-store" }).then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${url} ${res.status}`))));
      const [overview, installs] = await Promise.all([get(`/api/admin/activity/overview?${query}&audience=${audience}`), get(`/api/admin/installs?${query}&audience=${audience}`)]);
      return { overview, installs };
    },
    { pollMs: 30000 },
  );

  // The feed: its own search, source and page
  const [feed, setFeed] = useState(null);
  const [feedQuery, setFeedQuery] = useState("");
  const [feedSource, setFeedSource] = useState("all");
  const [feedPage, setFeedPage] = useState(0);
  const [feedPerPage, setFeedPerPage] = useState(10);
  // A new window or audience starts the feed from its first page
  const [feedScope, setFeedScope] = useState(`${query}:${audience}`);
  if (feedScope !== `${query}:${audience}`) {
    setFeedScope(`${query}:${audience}`);
    setFeedPage(0);
  }
  useEffect(() => {
    let active = true;
    if (getDashboardPreview()) {
      requestAnimationFrame(() => active && setFeed(sampleAdminActivity(catalog).feed));
      return () => {
        active = false;
      };
    }
    const params = new URLSearchParams({ audience, limit: String(feedPerPage), offset: String(feedPage * feedPerPage) });
    if (feedQuery.trim()) params.set("effect", feedQuery.trim());
    if (feedSource !== "all") params.set("source", feedSource);
    // A short pause while typing, so each keystroke isn't a request
    const timer = setTimeout(() => {
      fetch(`/api/admin/copy-activity?${query}&${params}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`feed ${res.status}`))))
        .then((json) => active && setFeed(json))
        .catch(() => active && setFeed({ events: [], total: 0 }));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, audience, feedQuery, feedSource, feedPage, feedPerPage, catalog]);

  // The window, at the top right of the sheet (above the stats)
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="type-label text-black/60">
        {dates.preset === "custom" ? "Custom range" : DATE_PRESETS[dates.preset]} · {audience === "all" ? "every account" : audience === "internal" ? "internal accounts" : "customers"}
      </p>
      <DateRangeFilter label="Showing" value={dates} onChange={setDates} />
    </div>
  );

  if (failed) {
    return (
      <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
        {header}
        <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
          <p className="type-h3">We couldn’t load the activity.</p>
          <p className="type-body text-black/60">Check your connection and reload the page.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
        {header}
        <ActivitySkeleton revenue={isSuperAdmin} />
      </div>
    );
  }

  const { overview, installs } = data;
  const kpis = overview.kpis;
  // The API sends [{ name: "web", value: 12 }, ...]; read it as { web: 12, ... }
  const bySource = Object.fromEntries((installs.sourceBreakdown || []).map(({ name, value }) => [name, value]));
  const delivered = (bySource.web || 0) + (bySource.cli || 0) + (bySource.mcp || 0);
  // Accounts on each plan now (an expired plan counts as Free)
  const planCount = (name) => overview.planDistribution?.find((p) => p.name === name)?.value || 0;
  const proPlus = planCount("Pro+");
  const pro = planCount("Pro");
  const free = planCount("Free");
  const paid = pro + proPlus;
  const days = (installs.sourceTrend || []).map(({ date, web, cli, mcp }) => ({ date, web, cli, mcp }));

  const fxRows = (overview[FX_TABS.find((t) => t.id === fxTab).key] || []).map((fx) => ({
    id: fx.slug,
    name: fx.title,
    count: fx.count,
  }));
  const userRows = (installs.topInstallers || []).map((u) => ({
    id: u.clerkUserId,
    name: u.name || u.email || "Unnamed",
    count: u.count,
    href: path(`admin/activity/${buildUserActivitySlug({ name: u.name, email: u.email })}`),
    lead: <Avatar name={u.name} email={u.email} />,
  }));

  const feedPages = Math.max(1, Math.ceil((feed?.total || 0) / feedPerPage));

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {header}

      {/* the stat cards: signups, template views, revenue; then installs and saves */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
        <StatCard className="flex-1" label="Signups" value={number(kpis.signups.value)} note="New accounts" stat={kpis.signups} comparison={kpis.comparison} />
        <StatCard className="flex-1" label="Template views" value={number(kpis.templateViews.value)} note="Template pages opened" stat={kpis.templateViews} comparison={kpis.comparison} />
        {isSuperAdmin && (
          <StatCard
            className="flex-1"
            label="Revenue"
            value={money(kpis.revenue.value, kpis.revenue.currency)}
            note={
              kpis.revenue.byCurrency
                .filter((row) => row.currency !== kpis.revenue.currency)
                .map((row) => `+ ${money(row.amount, row.currency)}`)
                .join(" ") || "Subscriptions and templates"
            }
            stat={kpis.revenue}
            comparison={kpis.comparison}
          />
        )}
      </div>
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
        <StatCard
          // Two of the three columns above (one card plus a gap wider); without Revenue the
          // row above has two, so the two cards here split evenly
          className={isSuperAdmin ? TWO_OF_THREE : "flex-1"}
          label="Installs"
          value={number(kpis.installs.value)}
          note="Web, CLI and MCP · one effect, one account, one day"
          stat={kpis.installs}
          comparison={kpis.comparison}
        >
          {/* where they happened */}
          <ul className="flex gap-[calc(var(--cvw)*1.6)] max-md:gap-4">
            {SOURCE_BARS.map(({ key, label, tone }) => (
              <li key={key} className="flex flex-col gap-1.5">
                <span className="type-small flex items-center gap-1.5 text-black/60">
                  <span aria-hidden="true" className={`size-2 ${tone}`} />
                  {label}
                </span>
                <span className="type-h3">{number(kpis.installs.bySource[key])}</span>
                <span className="type-small text-black/60">{kpis.installs.value ? Math.round((kpis.installs.bySource[key] / kpis.installs.value) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </StatCard>
        <StatCard className="flex-1" label="Saves" value={number(kpis.saves.value)} note={`Effects saved${overview.stats.totalSavedTemplates ? ` · ${number(overview.stats.totalSavedTemplates)} templates too` : ""}`} stat={kpis.saves} comparison={kpis.comparison} />
      </div>

      {/* installs, by day and source */}
      <section aria-labelledby="by-day-h" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.6)] max-lg:gap-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="by-day-h" className="type-h3">
              Installs by day
            </h2>
            <p className="type-small text-black/60">Effects installed a day, split by web, CLI and MCP. Hover a bar for its numbers.</p>
          </div>
          <ul className="type-small flex gap-3 text-black/60">
            {SOURCE_BARS.map(({ key, label, tone }) => (
              <li key={key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2 ${tone}`} />
                {label}
              </li>
            ))}
          </ul>
        </div>
        {days.length ? <UsageBars days={days} /> : <p className="type-body text-black/60">Nothing in this window.</p>}
      </section>

      {/* by source, plans, today */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
        <section aria-labelledby="source-h" className={`${CARD} ${CARD_PAD} flex-1 gap-[calc(var(--cvw)*1.2)] max-lg:gap-4`}>
          <div className="flex flex-col gap-1">
            <h2 id="source-h" className="type-h3">
              By source
            </h2>
            <p className="type-small text-black/60">Where installs happened</p>
          </div>
          <ul className="flex flex-col gap-[calc(var(--cvw)*0.9)] max-lg:gap-3">
            {SOURCE_BARS.map(({ key, label, tone }) => (
              <li key={key} className="flex flex-col gap-1.5">
                <span className="type-small flex justify-between">
                  <span>{label}</span>
                  <span className="text-black/60">
                    {number(bySource[key])} · {delivered ? Math.round(((bySource[key] || 0) / delivered) * 100) : 0}%
                  </span>
                </span>
                <span className="h-1.5 w-full bg-black/5">
                  <span className={`block h-full ${tone}`} style={{ width: `${delivered ? ((bySource[key] || 0) / delivered) * 100 : 0}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="plans-h" className={`${CARD} ${CARD_PAD} flex-1 justify-between gap-[calc(var(--cvw)*1.2)] max-lg:gap-4`}>
          <div className="flex flex-col gap-1">
            <h2 id="plans-h" className="type-h3">
              Plans
            </h2>
            <p className="type-small text-black/60">Every account today</p>
          </div>
          <p className="type-h2">
            {paid + free ? ((paid / (paid + free)) * 100).toFixed(1) : "0.0"}% <span className="type-small text-black/60">paid</span>
          </p>
          <div className="flex flex-col gap-2">
            <span className="flex h-1.5 w-full gap-px">
              <span className="block h-full bg-black/10" style={{ flexGrow: free || 1 }} />
              <span className="block h-full bg-primary/50" style={{ flexGrow: pro }} />
              <span className="block h-full bg-primary" style={{ flexGrow: proPlus }} />
            </span>
            <span className="type-small flex justify-between gap-3 text-black/60">
              <span>Free {number(free)}</span>
              <span>Pro {number(pro)}</span>
              <span>Pro+ {number(proPlus)}</span>
            </span>
          </div>
        </section>

        <section aria-label="Today" className={`flex flex-1 flex-col justify-between gap-[calc(var(--cvw)*1.2)] bg-ink text-foreground ${CARD_PAD} max-lg:gap-4`}>
          <p className="type-label text-foreground/80">Today</p>
          <p className="type-h1 text-primary">{number(installs.stats?.installsToday)}</p>
          <p className="type-small text-foreground/80">Installs so far today (UTC), web, CLI and MCP together.</p>
        </section>
      </div>

      {/* top effects and top users */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
        <section aria-labelledby="top-fx-h" className={`${CARD} ${CARD_PAD} flex-1 gap-[calc(var(--cvw)*1)] max-lg:gap-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="top-fx-h" className="type-h3">
              Top effects
            </h2>
            <SlidingSegment label="Rank effects by" items={FX_TABS} value={fxTab} onChange={setFxTab} itemClassName="w-20" />
          </div>
          <RankList rows={fxRows} unit={FX_TABS.find((t) => t.id === fxTab).unit} />
        </section>
        <section aria-labelledby="top-users-h" className={`${CARD} ${CARD_PAD} flex-1 gap-[calc(var(--cvw)*1)] max-lg:gap-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="top-users-h" className="type-h3">
              Top installers
            </h2>
            <p className="type-small text-black/60">Installs in this window</p>
          </div>
          <RankList rows={userRows} unit="installs" />
        </section>
      </div>

      {/* templates: views, sales, conversion */}
      <section aria-labelledby="templates-h" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1)] max-lg:gap-4`}>
        <div className="flex flex-col gap-1">
          <h2 id="templates-h" className="type-h3">
            Templates
          </h2>
          <p className="type-small text-black/60">Views and paid sales in this window (credit redemptions aren’t sales)</p>
        </div>
        <div className="flex flex-col">
          <div className="type-label flex gap-4 border-b border-black/10 pb-3 text-black/60">
            <span className="flex-1">Template</span>
            <span className="w-[15%] text-right">Views</span>
            <span className="w-[15%] text-right">Sales</span>
            <span className="w-[15%] text-right">Conversion</span>
          </div>
          {(overview.templateStats || []).map((t) => (
            <div key={t.slug} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.7)] last:border-b-0 max-lg:py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="type-body truncate">{t.title}</span>
                <span className="type-small text-black/60">{t.category}</span>
              </span>
              <span className="type-body w-[15%] text-right">{number(t.views)}</span>
              <span className="type-body w-[15%] text-right">{number(t.sales)}</span>
              <span className="type-body w-[15%] text-right">{t.views ? `${((t.sales / t.views) * 100).toFixed(1)}%` : "—"}</span>
            </div>
          ))}
        </div>
      </section>

      {/* the live feed */}
      <section aria-labelledby="feed-h" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.2)] max-lg:gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="feed-h" className="type-h3">
              Recent installs
            </h2>
            <p className="type-small text-black/60">{feed ? `${number(feed.total)} installs across web, CLI and MCP in this window` : " "}</p>
          </div>
          <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
            <label className="type-small flex h-9.5 items-center gap-2 bg-light px-3 text-black/60 ring-1 ring-inset ring-black/10 focus-within:ring-primary">
              <Search className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Search effects</span>
              <input
                value={feedQuery}
                onChange={(e) => {
                  setFeedQuery(e.target.value);
                  setFeedPage(0);
                }}
                placeholder="Search effects"
                className="w-[calc(var(--cvw)*12)] bg-transparent text-ink outline-none placeholder:text-black/40 max-lg:w-40"
              />
            </label>
            <SlidingSegment
              label="Source"
              items={FEED_SOURCES}
              value={feedSource}
              onChange={(next) => {
                setFeedSource(next);
                setFeedPage(0);
              }}
              itemClassName="w-14"
            />
            <PerPageMenu
              value={feedPerPage}
              onChange={(next) => {
                setFeedPerPage(next);
                setFeedPage(0);
              }}
            />
          </div>
        </div>

        {!feed ? (
          // the feed's rows: avatar, name and email, effect, source, when
          <div aria-busy="true" className="flex flex-col">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.7)] last:border-b-0 max-lg:py-3">
                <Bar className="size-8 shrink-0 rounded-full" />
                <div className="flex w-[25%] flex-col gap-1">
                  <Bar type="type-body" className="w-[80%]" />
                  <Bar type="type-small" className="w-full" />
                </div>
                <Bar type="type-body" className="flex-1" />
                <Bar type="type-small" className="w-12" />
                <Bar type="type-small" className="w-[14%]" />
              </div>
            ))}
          </div>
        ) : feed.events.length === 0 ? (
          <p className="type-body text-black/60">No installs match.</p>
        ) : (
          <>
            <div className="flex flex-col">
              <div className="type-label flex gap-4 border-b border-black/10 pb-3 text-black/60 max-md:hidden">
                <span className="w-[34%]">User</span>
                <span className="flex-1">Effect</span>
                <span className="w-16">Source</span>
                <span className="w-[16%] text-right">When</span>
              </div>
              {feed.events.map((event) => (
                <div key={event.id} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.6)] last:border-b-0 max-lg:py-3 max-md:flex-wrap">
                  <span className="flex w-[34%] min-w-0 items-center gap-3 max-md:w-full">
                    {event.userName || event.userEmail ? (
                      <>
                        <Avatar name={event.userName} email={event.userEmail} />
                        <span className="flex min-w-0 flex-col">
                          <span className="type-body truncate">{event.userName || event.userEmail}</span>
                          {event.userName && <span className="type-small truncate text-black/60">{event.userEmail}</span>}
                        </span>
                      </>
                    ) : (
                      <span className="type-small text-black/60">Anonymous · {String(event.identityKey || "").split(":")[0] || "visitor"}</span>
                    )}
                  </span>
                  <span className="type-body min-w-0 flex-1 truncate">{event.effectTitle}</span>
                  <span className="w-16 max-md:w-auto">
                    <SourceChip source={event.source} />
                  </span>
                  <span className="type-small w-[16%] text-right text-black/60 max-md:w-auto">{formatWhen(event.occurredAt)}</span>
                </div>
              ))}
            </div>
            <Pager page={feedPage} pages={feedPages} total={feed.total} noun={feed.total === 1 ? "install" : "installs"} onPage={setFeedPage} />
          </>
        )}
      </section>
    </div>
  );
}
