"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { DashboardHeroAside, useDashboard } from "@/components/Dashboard/DashboardContext";
import { CARD, CARD_PAD, Pager, SourceChip } from "@/components/Dashboard/DashboardUI";
import { SOURCE_BARS, UsageBars } from "@/components/Dashboard/UsageBars";
import { DarkSegment } from "@/components/ui/DarkSegment";
import { SlidingSegment } from "@/components/ui/SlidingSegment";
import { Skeleton } from "@/components/ui/Skeleton";
import { getDashboardPreview, sampleAdminActivity } from "@/lib/dev/dashboardPreview";
import { buildUserActivitySlug } from "@/lib/user-slug";

// The time window for the whole page
const WINDOWS = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];
const FEED_SOURCES = [
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "cli", label: "CLI" },
  { id: "mcp", label: "MCP" },
];
const FX_TABS = [
  { id: "copied", label: "Copied", key: "topCopiedEffects" },
  { id: "installed", label: "Installed", key: "topInstalledEffects" },
  { id: "saved", label: "Saved", key: "topSavedEffects" },
];
const USER_TABS = [
  { id: "installs", label: "Installs", key: "topInstallers" },
  { id: "copies", label: "Copies", key: "topUsers" },
];
const FEED_PER_PAGE = 10;

const number = (n) => new Intl.NumberFormat("en").format(n || 0);
const money = (amount, currency) => new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
const formatWhen = (value) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const initials = (name, email) => (name || email || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

// A headline number: label at the top, the figure in the middle, its note at the foot
function Kpi({ label, value, detail }) {
  return (
    <div className={`${CARD} ${CARD_PAD} min-w-0 flex-1 justify-between gap-[calc(var(--cvw)*1)] max-lg:w-[calc((100%-1.5rem)/3)] max-lg:flex-none max-lg:gap-3 max-md:w-[calc((100%-0.75rem)/2)]`}>
      <p className="type-label text-black/60">{label}</p>
      <p className="type-h2">{value}</p>
      {detail && <p className="type-small text-black/60">{detail}</p>}
    </div>
  );
}

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

function Avatar({ name, email }) {
  return <span className="type-small grid size-8 shrink-0 place-items-center rounded-full bg-ink text-foreground">{initials(name, email)}</span>;
}

/**
 * Admin Activity: site-wide usage over a time window - headline numbers, installs and
 * copies by day and by source, plans, top effects and users, template views and sales,
 * and the live feed of installs and copies.
 */
export default function AdminActivityPage() {
  const { path, isSuperAdmin, catalog } = useDashboard();
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [fxTab, setFxTab] = useState("copied");
  const [userTab, setUserTab] = useState("installs");

  // The overview and the installs numbers for the window
  useEffect(() => {
    let active = true;
    const preview = getDashboardPreview();
    if (preview) {
      const sample = sampleAdminActivity(catalog);
      requestAnimationFrame(() => active && setData({ overview: sample.overview, installs: sample.installs }));
      return () => {
        active = false;
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    const get = (url) => fetch(url).then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${url} ${res.status}`))));
    Promise.all([get(`/api/admin/activity/overview?range=${range}`), get(`/api/admin/installs?range=${range}`)])
      .then(([overview, installs]) => active && setData({ overview, installs }))
      .catch((error) => {
        console.error(error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [range, catalog]);

  // The feed: its own search, source and page
  const [feed, setFeed] = useState(null);
  const [feedQuery, setFeedQuery] = useState("");
  const [feedSource, setFeedSource] = useState("all");
  const [feedPage, setFeedPage] = useState(0);
  useEffect(() => {
    let active = true;
    if (getDashboardPreview()) {
      requestAnimationFrame(() => active && setFeed(sampleAdminActivity(catalog).feed));
      return () => {
        active = false;
      };
    }
    const params = new URLSearchParams({ range, limit: String(FEED_PER_PAGE), offset: String(feedPage * FEED_PER_PAGE) });
    if (feedQuery.trim()) params.set("effect", feedQuery.trim());
    if (feedSource !== "all") params.set("source", feedSource);
    // A short pause while typing, so each keystroke isn't a request
    const timer = setTimeout(() => {
      fetch(`/api/admin/copy-activity?${params}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`feed ${res.status}`))))
        .then((json) => active && setFeed(json))
        .catch(() => active && setFeed({ events: [], total: 0 }));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [range, feedQuery, feedSource, feedPage, catalog]);

  const chooseRange = (next) => {
    setRange(next);
    setFeedPage(0);
  };

  const header = (
    <DashboardHeroAside>
      <DarkSegment buttonSize label="Time window" items={WINDOWS} value={range} onChange={chooseRange} itemClassName="w-[calc(var(--cvw)*6.5)] max-lg:w-20" />
    </DashboardHeroAside>
  );

  if (failed) {
    return (
      <>
        {header}
        <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
          <p className="type-h3">We couldn’t load the activity.</p>
          <p className="type-body text-black/60">Check your connection and reload the page.</p>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <div aria-busy="true" aria-label="Loading activity" className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
        {header}
        <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
          {Array.from({ length: isSuperAdmin ? 6 : 5 }, (_, i) => (
            <Skeleton key={i} className="h-[calc(var(--cvw)*9)] flex-1 max-lg:h-32" />
          ))}
        </div>
        <Skeleton className="h-[calc(var(--cvw)*20)] w-full max-lg:h-72" />
        <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[calc(var(--cvw)*14)] flex-1 max-lg:h-48" />
          ))}
        </div>
        <Skeleton className="h-[calc(var(--cvw)*28)] w-full max-lg:h-96" />
      </div>
    );
  }

  const { overview, installs } = data;
  const bySource = installs.sourceBreakdown || {};
  const delivered = (bySource.web || 0) + (bySource.cli || 0) + (bySource.mcp || 0);
  const pro = overview.planDistribution?.find((p) => p.name === "Pro")?.value || 0;
  const free = overview.planDistribution?.find((p) => p.name === "Free")?.value || 0;
  const days = (installs.sourceTrend || []).map(({ date, web, cli, mcp }) => ({ date, web, cli, mcp }));

  const fxRows = (overview[FX_TABS.find((t) => t.id === fxTab).key] || []).map((fx) => ({
    id: fx.slug,
    name: fx.title,
    count: fx.count,
  }));
  const userRows = (installs[USER_TABS.find((t) => t.id === userTab).key] || []).map((u) => ({
    id: u.clerkUserId,
    name: u.name || u.email || "Unnamed",
    count: u.count,
    href: path(`admin/activity/${buildUserActivitySlug({ name: u.name, email: u.email })}`),
    lead: <Avatar name={u.name} email={u.email} />,
  }));

  const feedPages = Math.max(1, Math.ceil((feed?.total || 0) / FEED_PER_PAGE));

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {header}

      {/* headline numbers for the window */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-wrap max-lg:gap-3">
        <Kpi label="Signups" value={number(overview.stats.totalUsers)} detail="New accounts" />
        <Kpi label="Copies" value={number(bySource.web)} detail="From the website" />
        <Kpi label="CLI + MCP installs" value={number((bySource.cli || 0) + (bySource.mcp || 0))} detail={`${number(bySource.cli)} CLI · ${number(bySource.mcp)} MCP`} />
        <Kpi label="Saves" value={number(overview.stats.totalSaved)} detail="Effects saved" />
        <Kpi label="Template views" value={number(overview.stats.totalViews)} detail="Template pages opened" />
        {isSuperAdmin && (
          <Kpi
            label="Revenue"
            value={(overview.stats.revenueByCurrency || []).find((r) => r.currency === "USD") ? money(overview.stats.revenueByCurrency.find((r) => r.currency === "USD").amount, "USD") : "$0"}
            detail={(overview.stats.revenueByCurrency || [])
              .filter((r) => r.currency !== "USD")
              .map((r) => `+ ${money(r.amount, r.currency)}`)
              .join(" ") || "Subscriptions, paid"}
          />
        )}
      </div>

      {/* installs and copies, by day and source */}
      <section aria-labelledby="by-day-h" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.6)] max-lg:gap-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="by-day-h" className="type-h3">
              Installs &amp; copies by day
            </h2>
            <p className="type-small text-black/60">Unique effects a day across every account. Hover a bar for its numbers.</p>
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
            <p className="type-small text-black/60">Where effects were delivered</p>
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
            {pro + free ? ((pro / (pro + free)) * 100).toFixed(1) : "0.0"}% <span className="type-small text-black/60">paid</span>
          </p>
          <div className="flex flex-col gap-2">
            <span className="flex h-1.5 w-full gap-px">
              <span className="block h-full bg-black/10" style={{ flexGrow: free || 1 }} />
              <span className="block h-full bg-primary" style={{ flexGrow: pro }} />
            </span>
            <span className="type-small flex justify-between text-black/60">
              <span>Free {number(free)}</span>
              <span>Pro &amp; Pro+ {number(pro)}</span>
            </span>
          </div>
        </section>

        <section aria-label="Today" className={`flex flex-1 flex-col justify-between gap-[calc(var(--cvw)*1.2)] bg-ink text-foreground ${CARD_PAD} max-lg:gap-4`}>
          <p className="type-label text-foreground/80">Today</p>
          <p className="type-h1 text-primary">{number(installs.stats?.installsToday)}</p>
          <p className="type-small text-foreground/80">Installs and copies so far today (UTC), across every account.</p>
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
          <RankList rows={fxRows} unit={fxTab} />
        </section>
        <section aria-labelledby="top-users-h" className={`${CARD} ${CARD_PAD} flex-1 gap-[calc(var(--cvw)*1)] max-lg:gap-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="top-users-h" className="type-h3">
              Top users
            </h2>
            <SlidingSegment label="Rank users by" items={USER_TABS} value={userTab} onChange={setUserTab} itemClassName="w-20" />
          </div>
          <RankList rows={userRows} unit={userTab} />
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
              Recent installs &amp; copies
            </h2>
            <p className="type-small text-black/60">{feed ? `${number(feed.total)} events across web, CLI and MCP in this window` : " "}</p>
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
          </div>
        </div>

        {!feed ? (
          <Skeleton className="h-[calc(var(--cvw)*24)] w-full max-lg:h-80" />
        ) : feed.events.length === 0 ? (
          <p className="type-body text-black/60">No installs or copies match.</p>
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
            <Pager page={feedPage} pages={feedPages} total={feed.total} noun="events" onPage={setFeedPage} />
          </>
        )}
      </section>
    </div>
  );
}
