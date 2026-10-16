"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Search } from "lucide-react";
import { CopyButtonContent } from "@/components/ui/CodeBlock";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { ALL_DATES, CARD, CARD_PAD, CardLink, DATE_PRESETS, DateRangeFilter, Pager, SourceChip, inDateRange, resolveDateRange } from "@/components/Dashboard/DashboardUI";
import { RingMeter } from "@/components/Dashboard/RingMeter";
import { SOURCE_BARS, UsageBars } from "@/components/Dashboard/UsageBars";
import { SlidingSegment } from "@/components/ui/SlidingSegment";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/homepage/components/Button";
import { resolveCover } from "@/app/(app)/(workspace)/effects/EffectCard";
import { useEffectCardActions } from "@/app/(app)/(workspace)/effects/useEffectCardActions";
import { getEffectHref } from "@/lib/categories";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";
import { getDashboardPreview, sampleUsage } from "@/lib/dev/dashboardPreview";

const SOURCES = [
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "cli", label: "CLI" },
  { id: "mcp", label: "MCP" },
];
const PER_PAGE = 8;
// The chart's days with no range picked, and the most it draws for a long custom range
const DEFAULT_DAYS = 30;
const MAX_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

const localDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shortDate = (day) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${day}T00:00:00`));
const formatWhen = (value) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

// The daily limit resets at midnight UTC (install_unlocks counts UTC days)
function untilReset(now) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const minutes = Math.ceil((next - now) / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// Copies `npx hyperiux add …` through the effect cards' copy: it claims the install
// against the daily limit first, like every other copy on the site. The icon and label
// flip to a tick and "Copied" with the code blocks' animation.
function CopyCommand({ effect, copyInstall }) {
  const [copied, setCopied] = useState(false);
  const name = effect.title || effect.name;
  return (
    <button
      type="button"
      aria-label={copied ? `Copied the install command for ${name}` : `Copy the install command for ${name}`}
      onClick={async () => {
        if (await copyInstall(effect)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }
      }}
      className={`type-small inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 px-3 ring-1 ring-inset transition-[color,box-shadow] duration-300 ${copied ? "text-primary ring-primary" : "text-black/60 ring-black/10 hover:text-ink hover:ring-primary"}`}
    >
      <CopyButtonContent copied={copied} labelClassName="max-md:hidden" />
    </button>
  );
}

export default function UsagePage() {
  const { user } = useUser();
  const { effectBySlug, catalog, isAdmin } = useDashboard();
  const { copyInstall, overlays } = useEffectCardActions({ userPlan: user?.publicMetadata?.plan || "free" });

  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [dates, setDates] = useState(ALL_DATES);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    const preview = getDashboardPreview();
    if (preview) {
      requestAnimationFrame(() => active && setData(sampleUsage(preview, catalog)));
      return () => {
        active = false;
      };
    }
    fetch("/api/dashboard/usage")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`usage ${res.status}`))))
      .then((json) => active && setData(json))
      .catch((error) => {
        console.error(error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [catalog]);

  // Date.now() must not run during render: it differs between server and browser.
  const [now, setNow] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // The picked range, as YYYY-MM-DD local days ("" = all time)
  const { from, to } = resolveDateRange(dates);

  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.events || []).filter(
      (event) =>
        (source === "all" || event.source === source) &&
        inDateRange(event.at, from, to) &&
        (!q || `${effectBySlug(event.name)?.title || event.title} ${event.name}`.toLowerCase().includes(q)),
    );
  }, [data, source, from, to, query, effectBySlug]);

  // The chart: one bar per local day over the picked range (the last 30 days for all
  // time), from the same events as the table, split by source
  const days = useMemo(() => {
    if (!data?.events || !now) return null;
    const endDay = to ? new Date(`${to}T00:00:00`) : new Date(now);
    const startDay = from ? new Date(`${from}T00:00:00`) : new Date(endDay.getTime() - (DEFAULT_DAYS - 1) * DAY_MS);
    const count = Math.min(MAX_DAYS, Math.max(1, Math.round((endDay - startDay) / DAY_MS) + 1));
    const list = Array.from({ length: count }, (_, i) => ({
      date: localDay(new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate() - (count - 1 - i))),
      web: 0,
      cli: 0,
      mcp: 0,
    }));
    const index = new Map(list.map((day, i) => [day.date, i]));
    for (const event of data.events) {
      const i = index.get(localDay(new Date(event.at)));
      if (i !== undefined && list[i][event.source] !== undefined) list[i][event.source] += 1;
    }
    return list;
  }, [data, now, from, to]);

  const chartTitle =
    dates.preset === "all"
      ? "Last 30 days"
      : dates.preset === "custom"
        ? days?.length
          ? `${shortDate(days[0].date)} – ${shortDate(days[days.length - 1].date)}`
          : "Custom range"
        : DATE_PRESETS[dates.preset];

  const pages = Math.max(1, Math.ceil(events.length / PER_PAGE));
  const current = Math.min(page, pages - 1);
  const shown = events.slice(current * PER_PAGE, (current + 1) * PER_PAGE);
  // Any filter change starts again from the first page
  const filter = (set) => (value) => {
    set(value);
    setPage(0);
  };

  if (failed) {
    return (
      <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
        <p className="type-h3">We couldn’t load your usage.</p>
        <p className="type-body text-black/60">Check your connection and reload the page.</p>
      </div>
    );
  }

  // Loading: each card as one block
  if (!data) {
    return (
      <div aria-busy="true" aria-label="Loading your usage" className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
        <div className="flex justify-end">
          <Skeleton className="h-9.5 w-48" />
        </div>
        <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
          {!isAdmin && <Skeleton className="h-[calc(var(--cvw)*17)] flex-1 max-lg:h-60" />}
          <Skeleton className="h-[calc(var(--cvw)*17)] flex-1 max-lg:h-60" />
        </div>
        <Skeleton className="h-[calc(var(--cvw)*30)] w-full max-lg:h-96" />
      </div>
    );
  }

  // Admins (and any account without a limit) have no Today meter
  const unlimited = isAdmin || data.isAdmin || !data.limit;

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {overlays}

      {/* the range for the chart and the table */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-label text-black/60">Every effect you’ve copied or installed, by day and by source.</p>
        <DateRangeFilter label="Showing" value={dates} onChange={filter(setDates)} />
      </div>

      {/* today against the daily limit (not for unlimited accounts) and the chart, equal widths */}
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-col max-lg:gap-3">
        {!unlimited && (
          <section aria-label="Today" className={`flex w-1/2 items-center gap-[calc(var(--cvw)*2)] bg-ink text-foreground ${CARD_PAD} max-lg:w-full max-md:flex-col max-md:items-start max-md:gap-6`}>
            <RingMeter value={data.count} max={data.limit} className="size-[calc(var(--cvw)*8)] shrink-0 max-lg:size-32" />
            <div className="flex flex-col gap-[calc(var(--cvw)*0.6)] max-lg:gap-2">
              <p className="type-label text-foreground/80">Today</p>
              <p className="type-h1">
                <span className="text-primary">{data.count}</span>
                <span className="type-h3 text-foreground/80"> / {data.limit}</span>
              </p>
              <p className="type-body text-foreground/80">
                Effects today across web, CLI and MCP.{now ? ` Resets in ${untilReset(now)}.` : ""}
              </p>
              {data.tier !== "pro_plus" && (
                <CardLink tone="dark" href="/pricing#plans" onClick={markScrollToPricingCards}>
                  {data.plan === "pro" ? "Need more? Pro+ gives you 10 a day" : "Upgrade to Pro for 5 a day"}
                </CardLink>
              )}
            </div>
          </section>
        )}

        <section aria-labelledby="chart-h" className={`${CARD} ${CARD_PAD} min-w-0 flex-1 gap-[calc(var(--cvw)*1.6)] max-lg:gap-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="chart-h" className="type-h3">
                {chartTitle}
              </h2>
              <p className="type-small text-black/60">Effects a day. Hover a bar for its numbers.</p>
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
          {days && <UsageBars days={days} limit={unlimited ? null : data.limit} todayKey={now ? localDay(new Date(now)) : null} />}
        </section>
      </div>

      {/* every effect taken, newest first */}
      <section aria-labelledby="history-h" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.2)] max-lg:gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="history-h" className="type-h3">
            Installed &amp; Copied
          </h2>
          <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
            <label className="type-small flex h-9.5 items-center gap-2 bg-light px-3 text-black/60 ring-1 ring-inset ring-black/10 focus-within:ring-primary">
              <Search className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Search effects</span>
              <input value={query} onChange={(e) => filter(setQuery)(e.target.value)} placeholder="Search effects" className="w-[calc(var(--cvw)*12)] bg-transparent text-ink outline-none placeholder:text-black/40 max-lg:w-40" />
            </label>
            <SlidingSegment label="Source" items={SOURCES} value={source} onChange={filter(setSource)} itemClassName="w-14" />
          </div>
        </div>

        {data.events.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="type-body text-black/60">Nothing yet. Effects you copy on the website or install with the CLI or MCP show up here.</p>
            <Button href="/effects" text="Browse Effects" />
          </div>
        ) : events.length === 0 ? (
          <p className="type-body text-black/60">No effects match these filters.</p>
        ) : (
          <>
            <div className="flex flex-col">
              <div className="type-label flex items-center gap-4 border-b border-black/10 pb-3 text-black/60 max-md:hidden">
                <span className="flex-1">Effect</span>
                <span className="w-16">Source</span>
                <span className="w-[22%]">When</span>
                <span className="w-32" aria-hidden="true" />
              </div>
              {shown.map((event) => {
                const effect = effectBySlug(event.name) || { name: event.name, title: event.title };
                const cover = resolveCover(effect);
                return (
                  <div key={`${event.name}-${event.at}`} className="flex items-center gap-4 border-b border-black/10 py-[calc(var(--cvw)*0.7)] last:border-b-0 max-lg:py-3">
                    <Link href={getEffectHref(effect)} className="group flex min-w-0 flex-1 items-center gap-3">
                      <span className="relative block aspect-[16/10] w-12 shrink-0 overflow-hidden bg-dark-card">
                        {cover && <Image src={cover} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="type-body truncate transition-colors duration-300 group-hover:text-primary">{effect.title || event.title}</span>
                        <span className="type-small hidden text-black/60 max-md:block">{formatWhen(event.at)}</span>
                      </span>
                    </Link>
                    <span className="w-16 max-md:w-auto">
                      <SourceChip source={event.source} />
                    </span>
                    <span className="type-small w-[22%] text-black/60 max-md:hidden">{formatWhen(event.at)}</span>
                    <span className="flex w-32 justify-end max-md:w-auto">
                      <CopyCommand effect={effect} copyInstall={copyInstall} />
                    </span>
                  </div>
                );
              })}
            </div>
            <Pager page={current} pages={pages} total={events.length} noun={events.length === 1 ? "event" : "events"} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
