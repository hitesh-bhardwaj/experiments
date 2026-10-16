"use client";

import { nameFromEmail } from "@/lib/display-name";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "motion/react";
import { Search, X, Upload, CheckCircle2, XCircle, UserCog, Download, Mail, UserPlus, LoaderCircle } from "lucide-react";
import { ToastViewport, useToastQueue } from "@/components/ui/Toast";
import { getDashboardPreview, sampleAdminUsers } from "@/lib/dev/dashboardPreview";
import Button from "@/homepage/components/Button";
import { useAdminAudience } from "@/components/admin/AdminAudience";
import { ACTION_LINE, ALL_DATES, CARD, CARD_PAD, DATE_PRESETS, DateRangeFilter, FILTER_WIDTH, Pager, PerPageMenu } from "@/components/Dashboard/DashboardUI";
import { StatCard, StatCardSkeleton } from "@/components/Dashboard/TrendStat";
import { Tooltip } from "@/components/ui/Tooltip";
import { ManageUserDrawer } from "@/components/admin/ManageUserDrawer";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { FilterMenu } from "@/app/(app)/(workspace)/effects/FilterMenu";
import { buildUserActivitySlug } from "@/lib/user-slug";

const DEFAULT_PAGE_SIZE = 10;

// An icon-only action beside the date filter, as tall as it
const ICON_BUTTON = "grid size-9.5 cursor-pointer place-items-center bg-foreground text-black/60 ring-1 ring-inset ring-black/10 transition-[color,box-shadow] duration-300 hover:text-primary hover:ring-primary [&_svg]:size-4";

// The plan each account has now (an expired plan is Free)
const PLAN_FILTERS = { all: "All plans", pro_plus: "Pro+", pro: "Pro", free: "Free" };
const ROLE_FILTERS = { all: "All roles", user: "User", admin: "Admin", super_admin: "Super admin" };
const SORTS = { newest: "Newest", installs: "Most installs", web: "Most web", cli: "Most CLI", mcp: "Most MCP", saves: "Most saves" };

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

// Clerk's Name field is optional by default, so some existing accounts have
// none - falls back to the email's local part rather than a bare "-", which
// reads as broken data rather than "this person just never set a name".
// The real fix is requiring a name at sign-up (Clerk Dashboard -> User &
// Authentication -> Personal Information -> Name -> Required), which only
// affects future sign-ups; this fallback covers accounts that predate that.
function displayName(user) {
  if (user.name) return user.name;
  if (user.email) return nameFromEmail(user.email) || user.email;
  return "Unnamed user";
}

function PlanBadge({ plan, tier }) {
  return (
    <span className={`type-small inline-flex w-fit items-center px-2.5 py-0.5 ${plan === "pro" ? "bg-primary text-background" : "text-black/60 ring-1 ring-inset ring-black/10"}`}>
      {plan === "pro" ? (tier === "pro" ? "Pro" : "Pro+") : "Free"}
    </span>
  );
}

// Stat cards for the picked window and accounts (signups, of those on a paid plan now,
// installs, saves), each with its change against the previous period and its line - not
// the table's own filters, so switching pages / filters never changes what they mean.
// `dates` is the page's date filter ({ preset, from, to }), `audience` whose accounts.
function UserStatsTiles({ dates, audience }) {
  const [data, setData] = useState(null);
  const isCustom = dates.preset === "custom";

  useEffect(() => {
    // A custom range with nothing picked yet has nothing to fetch for
    if (isCustom && !dates.from && !dates.to) return;

    let active = true;
    if (getDashboardPreview()) {
      requestAnimationFrame(() => active && setData(sampleAdminUsers().stats));
      return () => {
        active = false;
      };
    }
    // Clears the previous window's numbers immediately so a range switch never
    // flashes stale data while the new fetch is in flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);

    const params = new URLSearchParams({ range: dates.preset, audience });
    if (isCustom && dates.from) params.set("from", dates.from);
    if (isCustom && dates.to) params.set("to", dates.to);

    fetch(`/api/admin/users/stats?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => active && setData(json))
      .catch(() => active && setData(null));

    return () => {
      active = false;
    };
  }, [dates.preset, isCustom, dates.from, dates.to, audience]);

  // Only "All time" is a headcount ("Total") - every other window is a "New" count
  const isAllTime = dates.preset === "all";
  const cards = data?.kpis
    ? [
        [isAllTime ? "Total users" : "New users", data.kpis.users, "Accounts"],
        [isAllTime ? "Paid users" : "New paid users", data.kpis.paidUsers, "On Pro or Pro+ now"],
        ["Installs", data.kpis.installs, "Web, CLI and MCP"],
        ["Saves", data.kpis.saves, "Effects saved"],
      ]
    : null;
  const ROW = "flex gap-[calc(var(--cvw)*0.8)] max-lg:flex-wrap max-lg:gap-3";
  const EACH = "flex-1 max-lg:w-[calc((100%-0.75rem)/2)] max-lg:flex-none max-md:w-full";

  if (!cards) {
    return (
      <div className={ROW}>
        {[0, 1, 2, 3].map((i) => (
          <StatCardSkeleton key={i} className={EACH} />
        ))}
      </div>
    );
  }

  return (
    <div className={ROW}>
      {cards.map(([label, stat, note]) => (
        <StatCard key={label} className={EACH} label={label} value={new Intl.NumberFormat("en").format(stat.value || 0)} note={note} stat={stat} comparison={data.kpis.comparison} />
      ))}
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loosely matches email-shaped tokens anywhere inside a CSV cell/line.
const EMAIL_TOKEN_RE = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;
// Matches the server's hard per-request cap (MAX_EMAILS_PER_REQUEST in the
// invite route) - a single click on "Send Invitations" fires this many
// sequential requests instead of one big one, so nothing ever gets sent in
// bulk even with a full CSV queued up.
const BATCH_SIZE = 10;

function parseEmailsFromText(text) {
  const matches = text.match(EMAIL_TOKEN_RE) || [];
  return matches
    .map((m) => m.trim().replace(/[.,;]+$/, "").toLowerCase())
    .filter((m) => EMAIL_RE.test(m));
}

function InviteModal({ onClose }) {
  const [emails, setEmails] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [results, setResults] = useState(null);
  const [csvNote, setCsvNote] = useState(null);
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    fetch("/api/admin/waitlist/invite")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json && setQuota(json))
      .catch(() => {});
  }, []);

  const atDailyLimit = quota && quota.remaining <= 0;

  function addEmails(text) {
    const found = parseEmailsFromText(text);
    if (found.length === 0) return;
    setEmails((prev) => {
      const merged = [...new Set([...prev, ...found])];
      if (quota && merged.length > quota.remaining) {
        setCsvNote({
          type: "error",
          text: `Only ${quota.remaining} invite${quota.remaining === 1 ? "" : "s"} left today (${quota.limit}/day limit) - trimmed the rest.`,
        });
        return merged.slice(0, quota.remaining);
      }
      return merged;
    });
  }

  function commitInput() {
    if (!inputValue.trim()) return;
    addEmails(inputValue);
    setInputValue("");
  }

  function removeEmail(target) {
    setEmails((prev) => prev.filter((e) => e !== target));
  }

  function handleInputKeyDown(e) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (inputValue.trim()) {
        e.preventDefault();
        commitInput();
      } else if (e.key === "Enter" && emails.length > 0) {
        // Empty box + Enter = send, mirroring the old native submit-button behavior.
        e.preventDefault();
        handleSubmit(e);
      }
    } else if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1));
    }
  }

  function handleInputPaste(e) {
    const pasted = e.clipboardData?.getData("text") || "";
    if (/[\s,;]/.test(pasted)) {
      e.preventDefault();
      addEmails(pasted);
      setInputValue("");
    }
  }

  function handleCsvFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const found = parseEmailsFromText(text);
      if (found.length === 0) {
        setCsvNote({ type: "error", text: "No valid email addresses found in that file." });
        return;
      }
      setEmails((prev) => {
        let merged = [...new Set([...prev, ...found])];
        const addedCount = merged.length - prev.length;

        if (quota && merged.length > quota.remaining) {
          merged = merged.slice(0, quota.remaining);
          const kept = merged.length - prev.length;
          setCsvNote({
            type: kept > 0 ? "success" : "error",
            text: `Only ${quota.remaining} invite${quota.remaining === 1 ? "" : "s"} left today (${quota.limit}/day limit) - added ${kept} from the CSV, skipped the rest.`,
          });
        } else {
          setCsvNote({
            type: "success",
            text: `Added ${addedCount} email${addedCount === 1 ? "" : "s"} from CSV.`,
          });
        }
        return merged;
      });
    };
    reader.onerror = () => {
      setCsvNote({ type: "error", text: "Could not read that file." });
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    commitInput();

    const toSend = inputValue.trim() ? [...new Set([...emails, ...parseEmailsFromText(inputValue)])] : emails;
    if (toSend.length === 0) return;

    const batches = [];
    for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
      batches.push(toSend.slice(i, i + BATCH_SIZE));
    }

    setSending(true);
    setMessage(null);
    setResults([]);
    setInputValue("");

    let allResults = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const res = await fetch("/api/admin/waitlist/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: batch }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Invite failed");

        allResults = [...allResults, ...(json.results || [])];
        setResults(allResults);
        setQuota((prev) =>
          prev
            ? {
                ...prev,
                sentToday: prev.sentToday + json.sentCount,
                remaining: Math.max(0, prev.remaining - json.sentCount),
              }
            : prev
        );
      } catch (err) {
        // A whole-batch failure (network/auth/etc, not a per-email one) - stop
        // there rather than firing further batches, but still account for
        // every email that never got attempted so none silently vanish.
        const unattempted = batches.slice(i).flat();
        allResults = [
          ...allResults,
          ...unattempted.map((email) => ({ email, success: false, error: err.message })),
        ];
        setResults(allResults);
        break;
      }
    }

    const sentCount = allResults.filter((r) => r.success).length;
    const failedCount = allResults.length - sentCount;
    const failedEmails = allResults.filter((r) => !r.success).map((r) => r.email);
    setEmails(failedEmails);

    if (failedCount === 0) {
      setMessage({
        type: "success",
        text: `Invitation${sentCount === 1 ? "" : "s"} sent to ${sentCount} address${sentCount === 1 ? "" : "es"}.`,
      });
    } else {
      setMessage({
        type: "error",
        text: `${sentCount} sent, ${failedCount} failed. Fix and retry the ones below.`,
      });
    }

    setSending(false);
  }

  const pendingCount = emails.length + (inputValue.trim() && EMAIL_RE.test(inputValue.trim()) ? 1 : 0);

  return (
    <motion.div
      className="fixed inset-0 z-900 flex items-center justify-center bg-black/60 px-4 backdrop-blur-lg"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="relative w-full max-w-lg border border-white/10 bg-background p-6 text-foreground"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className=" group absolute right-5 top-5 flex h-10 w-10 items-center justify-center  border border-white/20 bg-white/10 text-xl leading-none text-white/70 transition-all duration-500 ease-in-out hover:border-primary hover:bg-primary hover:text-white "
        >
          <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
            <span className="h-px w-4 rotate-45 bg-white" />
            <span className="absolute h-px w-4 -rotate-45 bg-white" />
          </div>
        </button>

        <div className="mb-6">
          <h2 className="type-h3 text-foreground">Invite users</h2>
        </div>
        <p className="mb-2 text-sm text-white/80">
          Add one or more addresses - type and press Enter, paste a list, or
          upload a CSV. Everyone in the list gets an invite link when you send.
        </p>
        <p className="mb-5 text-xs text-white/45">
          {quota
            ? `${quota.remaining} of ${quota.limit} invites left today`
            : "Limit: 100 invites per day"}
        </p>

        {atDailyLimit && (
          <p className="mb-4  border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Daily invite limit reached ({quota.limit}/day). Try again tomorrow.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="max-h-[calc(var(--cvw)*30)] overflow-y-auto border border-white/10 bg-white/5 p-2 focus-within:border-white/25">
            {emails.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5 px-1 pt-1">
                {emails.map((e) => (
                  <span
                    key={e}
                    className="inline-flex items-center gap-1.5  bg-white/10 py-1 pl-3 pr-1.5 text-xs text-white/80"
                  >
                    {e}
                    <button
                      type="button"
                      onClick={() => removeEmail(e)}
                      aria-label={`Remove ${e}`}
                      className="flex h-4 w-4 items-center justify-center  text-white/50 transition hover:bg-white/15 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              disabled={atDailyLimit}
              placeholder={atDailyLimit ? "Daily limit reached" : emails.length === 0 ? "name@example.com" : "Add another…"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onPaste={handleInputPaste}
              onBlur={commitInput}
              className="w-full bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/35 outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className={`inline-flex items-center gap-2  border border-white/15 px-3 py-[calc(var(--cvw)*.8)] text-[calc(var(--cvw)*1.1)] max-md:text-[3.5vw] max-lg:text-[2.5vw] font-medium text-white/70 transition ${atDailyLimit ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-white/30 hover:text-white"}`}>
              <Upload className="h-5 w-5" />
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleCsvFile}
                disabled={atDailyLimit}
                className="hidden"
              />
            </label>

            <Button
              href="#"
              preventDefault
              disabled={sending || pendingCount === 0 || atDailyLimit}
              onClick={handleSubmit}
              variant="orange"
              text={
                sending
                  ? "Sending…"
                  : pendingCount > 0
                    ? `Send ${pendingCount} Invitation${pendingCount === 1 ? "" : "s"}`
                    : "Send Invitations"
              }
            />
          </div>
        </form>

        {csvNote && (
          <p className={`mt-3 text-xs ${csvNote.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
            {csvNote.text}
          </p>
        )}
        {message && (
          <p
            className={`mt-3 text-sm ${
              message.type === "success" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}
        {results && results.length > 0 && (
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto  border border-white/10 bg-white/3 p-2">
            {results.map((r) => (
              <li key={r.email} className="flex items-center gap-2 px-1.5 py-1 text-xs">
                {r.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                )}
                <span className="truncate text-white/70">{r.email}</span>
                {!r.success && r.error && (
                  <span className="truncate text-white/35">- {r.error}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function AdminPage() {
  // isSuperAdmin: the development preview stands in for one
  const { path, isSuperAdmin } = useDashboard();
  const { user: viewer } = useUser();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  // Customers / Internal / All: chosen in the tab row (DashboardShell)
  const [audience] = useAdminAudience();
  // When they joined: the dashboard's date filter ({ preset, from, to })
  const [dates, setDates] = useState(ALL_DATES);
  const dateRange = dates.preset;
  const customFrom = dates.from;
  const customTo = dates.to;
  const [sortBy, setSortBy] = useState("newest");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [manageUser, setManageUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [prevSearch, setPrevSearch] = useState(search);
  const [prevPlanFilter, setPrevPlanFilter] = useState(planFilter);
  const [prevRoleFilter, setPrevRoleFilter] = useState(roleFilter);
  const [prevDateRange, setPrevDateRange] = useState(dateRange);
  const [prevCustomFrom, setPrevCustomFrom] = useState(customFrom);
  const [prevCustomTo, setPrevCustomTo] = useState(customTo);
  const [prevSortBy, setPrevSortBy] = useState(sortBy);
  const [prevPageSize, setPrevPageSize] = useState(pageSize);
  const [prevAudience, setPrevAudience] = useState(audience);

  // Reset to page 1 whenever a filter changes - derived purely from values
  // already available during render, so adjust it here instead of in an effect.
  if (
    prevSearch !== search ||
    prevPlanFilter !== planFilter ||
    prevRoleFilter !== roleFilter ||
    prevDateRange !== dateRange ||
    prevCustomFrom !== customFrom ||
    prevCustomTo !== customTo ||
    prevSortBy !== sortBy ||
    prevPageSize !== pageSize ||
    prevAudience !== audience
  ) {
    setPrevSearch(search);
    setPrevPlanFilter(planFilter);
    setPrevRoleFilter(roleFilter);
    setPrevCustomFrom(customFrom);
    setPrevCustomTo(customTo);
    setPrevDateRange(dateRange);
    setPrevSortBy(sortBy);
    setPrevPageSize(pageSize);
    setPrevAudience(audience);
    setCurrentPage(1);
  }

  useEffect(() => {
    if (!showInviteModal && !manageUser) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showInviteModal, manageUser]);

  // Guards against out-of-order responses: a broad, slow request (e.g. no
  // search text, a large page size) can resolve *after* a narrower, faster
  // one fired right behind it (e.g. once search text lands), which would
  // otherwise overwrite the correct filtered result with a stale unfiltered
  // one - exactly the "search box has text but the table shows everyone"
  // symptom. Only the most recently *started* request is allowed to apply
  // its result.
  const requestIdRef = useRef(0);

  // Shared by fetchUsers and handleExport, which filter the same table by
  // the same "Activity window" control - a custom range sends explicit
  // from/to instead of the "custom" preset name, which the server doesn't
  // otherwise know how to bound.
  const appendDateRangeParams = useCallback(
    (params) => {
      if (dateRange === "custom") {
        if (customFrom) params.set("joinedFrom", customFrom);
        if (customTo) params.set("joinedTo", customTo);
      } else if (dateRange !== "all") {
        params.set("joined", dateRange);
      }
    },
    [dateRange, customFrom, customTo]
  );

  const fetchUsers = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    // Development preview: sample users, no session needed
    if (getDashboardPreview()) {
      const sample = sampleAdminUsers();
      setUsers(sample.users);
      setTotal(sample.total);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ audience });
      if (search) params.set("search", search);
      if (planFilter !== "all") params.set("plan", planFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      appendDateRangeParams(params);
      if (sortBy !== "newest") params.set("sort", sortBy);
      params.set("limit", String(pageSize));
      params.set("offset", String((currentPage - 1) * pageSize));

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load users");
      if (requestId !== requestIdRef.current) return;
      setUsers(json.users || []);
      setTotal(json.total || 0);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [search, planFilter, roleFilter, audience, appendDateRangeParams, sortBy, pageSize, currentPage]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Download the filtered list as a CSV without leaving the page: fetched in the
  // background and saved from memory, with a toast for how it went
  const { toast, showToast, dismissToast } = useToastQueue();
  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    if (exporting) return;
    const params = new URLSearchParams({ audience });
    if (search) params.set("search", search);
    if (planFilter !== "all") params.set("plan", planFilter);
    if (roleFilter !== "all") params.set("role", roleFilter);
    appendDateRangeParams(params);

    setExporting(true);
    try {
      const res = await fetch(`/api/admin/users/export?${params.toString()}`);
      if (!res.ok) throw new Error(`export ${res.status}`);
      const blob = await res.blob();
      const name = res.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/)?.[1] || "vault-users.csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      // A file, not a page: the page transitions leave it alone
      link.setAttribute("data-no-page-transition", "");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast({ title: "Export Downloaded", description: `${name} - the users matching these filters.` });
    } catch (err) {
      console.error(err);
      showToast({ title: "Couldn't Export Users", description: "Please try again in a moment." });
    } finally {
      setExporting(false);
    }
  }

  function applyManageChanges(userId, patch) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const columns = isSuperAdmin ? 8 : 5;

  return (
    <>
    <ToastViewport toast={toast} onDismiss={dismissToast} />
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {/* the window and whose accounts, left; export, the email log, invite and the date, right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-label text-black/60">
          {dates.preset === "custom" ? "Custom range" : `${DATE_PRESETS[dates.preset]}`} · {audience === "all" ? "every account" : audience === "internal" ? "internal accounts" : "customers"}
        </p>
        <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
          <Tooltip label="Export CSV">
            <button type="button" onClick={handleExport} disabled={exporting} aria-label="Export CSV" className={ICON_BUTTON}>
              {exporting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            </button>
          </Tooltip>
          <Tooltip label="Email log">
            <Link href={path("admin/emails")} aria-label="Email log" className={ICON_BUTTON}>
              <Mail aria-hidden="true" />
            </Link>
          </Tooltip>
          <Tooltip label="Invite">
            <button type="button" onClick={() => setShowInviteModal(true)} aria-label="Invite people" className={ICON_BUTTON}>
              <UserPlus aria-hidden="true" />
            </button>
          </Tooltip>
          <DateRangeFilter label="Joined" value={dates} onChange={setDates} />
        </div>
      </div>

      <UserStatsTiles dates={dates} audience={audience} />

      <section aria-label="Users" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.2)] max-lg:gap-4`}>
        {/* search and filters */}
        <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
          <label className="type-small flex h-9.5 min-w-40 flex-1 items-center gap-2 bg-light px-3 text-black/60 ring-1 ring-inset ring-black/10 focus-within:ring-primary">
            <Search className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">Search users</span>
            <input type="text" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-black/40" />
          </label>
          {[
            [PLAN_FILTERS, planFilter, setPlanFilter, "all"],
            [ROLE_FILTERS, roleFilter, setRoleFilter, "all"],
            [SORTS, sortBy, setSortBy, "newest"],
          ].map(([labels, value, set, idle]) => (
            <FilterMenu
              key={Object.values(labels)[0]}
              tone="light"
              variant="label"
              alignRight
              widthClassName={FILTER_WIDTH}
              panelClassName="left-auto! right-0"
              options={Object.keys(labels)}
              categoryFilter={value}
              activeFilter={value === idle ? null : value}
              getLabel={(id) => labels[id]}
              onSelect={set}
            />
          ))}
          <div className="ml-auto">
            <PerPageMenu value={pageSize} onChange={setPageSize} />
          </div>
        </div>

        {error && <p className="type-small bg-primary/10 px-4 py-3 text-ink ring-1 ring-inset ring-primary/30">{error}</p>}

        {/* the table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[calc(var(--cvw)*60)] border-collapse text-left max-lg:min-w-225">
            <thead>
              <tr className="type-label border-b border-black/10 text-black/60">
                <th className="py-3 pr-4 font-normal">User</th>
                <th className="py-3 pr-4 font-normal">Joined</th>
                <th className="py-3 pr-4 font-normal">Plan</th>
                <th className="py-3 pr-4 font-normal">Installs (web / CLI / MCP)</th>
                <th className="py-3 pr-4 font-normal">Saves</th>
                {isSuperAdmin && (
                  <>
                    <th className="py-3 pr-4 font-normal">Valid until</th>
                    <th className="py-3 pr-4 font-normal">Payment ID</th>
                    <th className="py-3 text-right font-normal">
                      <span className="sr-only">Manage</span>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: Math.min(pageSize, 6) }, (_, i) => (
                  <tr key={i} className="border-b border-black/10 last:border-b-0">
                    <td colSpan={columns} className="py-3">
                      <Skeleton className="h-9 w-full" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={columns} className="type-body py-10 text-center text-black/60">
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-black/10 last:border-b-0">
                    <td className="py-[calc(var(--cvw)*0.7)] pr-4 max-lg:py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} email={user.email} imageUrl={user.imageUrl} className="size-9" />
                        <div className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-1.5">
                            <Link href={path(`admin/activity/${buildUserActivitySlug(user)}`)} className="type-body truncate transition-colors duration-300 hover:text-primary">
                              {displayName(user)}
                            </Link>
                            {user.role && user.role !== "user" && <span className="type-small shrink-0 bg-black/5 px-1.5 text-black/60">{user.role === "super_admin" ? "Super admin" : "Admin"}</span>}
                            {isSuperAdmin && user.id === viewer?.id && <span className="type-small shrink-0 text-black/40">(you)</span>}
                            {user.suspended && <span className="type-small shrink-0 bg-danger-strong/10 px-1.5 text-danger-strong">Suspended</span>}
                          </span>
                          <span className="type-small truncate text-black/60">{user.email || user.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="type-small whitespace-nowrap py-3 pr-4 text-black/60">{formatDate(user.joinedAt)}</td>
                    <td className="py-3 pr-4">
                      <PlanBadge plan={user.plan} tier={user.tier} />
                    </td>
                    <td className="type-body whitespace-nowrap py-3 pr-4">
                      <span title="All installs" className="text-ink">{user.installsCount ?? 0}</span>
                      <span className="type-small text-black/60"> (</span>
                      <span title="Web installs">{user.webCount ?? 0}</span>
                      <span className="text-black/20"> / </span>
                      <span title="CLI installs" className="text-primary">{user.cliCount ?? 0}</span>
                      <span className="text-black/20"> / </span>
                      <span title="MCP installs" className="text-black/60">{user.mcpCount ?? 0}</span>
                      <span className="type-small text-black/60">)</span>
                    </td>
                    <td className="type-body py-3 pr-4">{user.savesCount ?? 0}</td>
                    {isSuperAdmin && (
                      <>
                        <td className="type-small whitespace-nowrap py-3 pr-4 text-black/60">{user.plan === "pro" ? formatDate(user.planValidUntil) : "—"}</td>
                        <td className="type-small py-3 pr-4 text-black/60">
                          {user.razorpayCustomerId ? (
                            <span className="font-mono" title={user.razorpayCustomerId}>
                              {user.razorpayCustomerId.slice(0, 10)}…
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button type="button" onClick={() => setManageUser(user)} className={ACTION_LINE}>
                            <UserCog aria-hidden="true" />
                            Manage
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pager page={currentPage - 1} pages={totalPages} total={total} noun={total === 1 ? "user" : "users"} onPage={(p) => setCurrentPage(p + 1)} />
      </section>
    </div>
    <AnimatePresence>
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}

    </AnimatePresence>
    <ManageUserDrawer
      user={manageUser}
      isOwnRow={manageUser?.id === viewer?.id}
      activityHref={manageUser ? path(`admin/activity/${buildUserActivitySlug(manageUser)}`) : "#"}
      onClose={() => setManageUser(null)}
      onSaved={(patch) => {
        applyManageChanges(manageUser.id, patch);
        setManageUser((current) => (current ? { ...current, ...patch } : current));
      }}
    />
    </>
  );
}
