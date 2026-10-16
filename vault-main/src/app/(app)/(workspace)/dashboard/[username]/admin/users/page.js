"use client";

import { nameFromEmail } from "@/lib/display-name";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "motion/react";
import { Search, X, Upload, CheckCircle2, XCircle, UserCog } from "lucide-react";
import { getDashboardPreview, sampleAdminUsers } from "@/lib/dev/dashboardPreview";
import Button from "@/homepage/components/Button";
import { DashboardHeroAside } from "@/components/Dashboard/DashboardContext";
import { AdminAudienceToggle, useAdminAudience } from "@/components/admin/AdminAudience";
import { ACTION_LINE, ALL_DATES, CARD, CARD_PAD, DateRangeFilter, FILTER_WIDTH, Pager, PerPageMenu } from "@/components/Dashboard/DashboardUI";
import { Skeleton } from "@/components/ui/Skeleton";
import { FilterMenu } from "@/app/(app)/(workspace)/effects/FilterMenu";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { buildUserActivitySlug } from "@/lib/user-slug";

const DEFAULT_PAGE_SIZE = 10;

// The plan each account has now (an expired plan is Free)
const PLAN_FILTERS = { all: "All plans", pro_plus: "Pro+", pro: "Pro", free: "Free" };
const ROLE_FILTERS = { all: "All roles", user: "User", admin: "Admin", super_admin: "Super admin" };
const SORTS = { newest: "Newest", copies: "Most copies", cli: "Most CLI", mcp: "Most MCP", saves: "Most saves" };

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

// Activity for the picked window and accounts (signups, accounts on a paid plan now,
// install unlocks, saves) - not the table's own filters, so switching pages/filters
// never changes what these four numbers mean.
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
  const stats = [
    [isAllTime ? "Total users" : "New users", data?.newUsers, "Accounts"],
    [isAllTime ? "Paid users" : "New paid users", data?.newProUsers, "On Pro or Pro+ now"],
    ["Installs & copies", data?.copies, "Web, CLI and MCP"],
    ["Saves", data?.saves, "Effects saved"],
  ];

  if (!data) {
    return (
      <div className="flex gap-[calc(var(--cvw)*0.8)] max-md:flex-wrap max-lg:gap-3">
        {stats.map(([label]) => (
          <Skeleton key={label} className="h-[calc(var(--cvw)*9)] flex-1 max-lg:h-32 max-md:w-[calc((100%-0.75rem)/2)] max-md:flex-none" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-[calc(var(--cvw)*0.8)] max-md:flex-wrap max-lg:gap-3">
      {stats.map(([label, value, detail]) => (
        <div key={label} className={`${CARD} ${CARD_PAD} flex-1 justify-between gap-(--cvw) max-lg:gap-3 max-md:w-[calc((100%-0.75rem)/2)] max-md:flex-none`}>
          <p className="type-label text-black/60">{label}</p>
          <p className="type-h2">{new Intl.NumberFormat("en").format(value || 0)}</p>
          <p className="type-small text-black/60">{detail}</p>
        </div>
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
        className="relative w-full max-w-lg  border border-white/10 bg-background p-6"
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
          <h2 className="text-2xl font-semibold">Invite users</h2>
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

const ROLE_LABELS = { "": "No access", admin: "Admin", super_admin: "Super Admin" };
const BILLING_LABELS = { monthly: "1 month", quarterly: "3 months", yearly: "1 year" };
const LEVEL_LABELS = { free: "Free", pro: "Pro", pro_plus: "Pro+" };

// "free" | "pro" | "pro_plus" - the one choice the modal offers; it maps to
// plan + tier on save (Pro+ is plan "pro", tier "pro_plus")
const levelOf = (user) => (user.plan === "pro" ? user.tier || "pro_plus" : "free");

function ModalShell({ onClose, children, maxWidth = "max-w-lg" }) {
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
        className={`relative w-full ${maxWidth}  border border-white/10 bg-background p-6`}
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
          className="max-lg:hidden group absolute right-5 top-5 flex h-10 w-10 items-center justify-center  border border-white/20 bg-white/10 text-xl leading-none text-white/70 transition-all duration-500 ease-in-out hover:border-primary hover:bg-primary hover:text-white "
        >
          <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
            <span className="h-px w-4 rotate-45 bg-white" />
            <span className="absolute h-px w-4 -rotate-45 bg-white" />
          </div>
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

// Single entry point for both plan and role changes on one user - replaces
// the old per-row duration-select + upgrade/downgrade button + role-select
// trio with one "Manage" action, and gates the actual mutation behind an
// explicit confirmation step naming exactly what's about to change (no
// action here fires straight off a click any more).
function ManageUserModal({ user, isOwnRow, onClose, onSaved }) {
  const currentLevel = levelOf(user);
  const [nextLevel, setNextLevel] = useState(currentLevel);
  const nextPlan = nextLevel === "free" ? "free" : "pro";
  // Monthly is the default billing interval when granting/changing Pro,
  // regardless of what the user's own current interval happens to be -
  // yearly is an explicit opt-in, not the fallback.
  const [nextInterval, setNextInterval] = useState(
    user.plan === "pro" ? user.billingInterval || "monthly" : "monthly"
  );
  const [nextRole, setNextRole] = useState(user.role || "");
  const [step, setStep] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const planChanged =
    nextLevel !== currentLevel ||
    (nextPlan === "pro" && nextInterval !== (user.billingInterval || "monthly"));
  const roleChanged = nextRole !== (user.role || "");
  const hasChanges = planChanged || roleChanged;

  const changeSummaries = [];
  if (planChanged) {
    if (nextPlan === "free") {
      changeSummaries.push({
        text: "Downgrade to Free - this immediately revokes Pro access and any active CLI token.",
        danger: true,
      });
    } else if (nextLevel !== currentLevel) {
      changeSummaries.push({ text: `Set plan to ${LEVEL_LABELS[nextLevel]}, for ${BILLING_LABELS[nextInterval]}.` });
    } else {
      changeSummaries.push({ text: `Change billing interval to ${BILLING_LABELS[nextInterval]}.` });
    }
  }
  if (roleChanged) {
    if (nextRole === "super_admin") {
      changeSummaries.push({
        text: "Grant Super Admin - full access including billing and role management.",
        danger: true,
      });
    } else if (!nextRole && user.role) {
      changeSummaries.push({ text: `Remove ${ROLE_LABELS[user.role]} access.`, danger: true });
    } else {
      changeSummaries.push({ text: `Set role to ${ROLE_LABELS[nextRole] || "No access"}.` });
    }
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);

    try {
      const patch = {};

      if (planChanged) {
        const res = await fetch("/api/admin/users/update-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkUserId: user.id,
            plan: nextPlan,
            tier: nextPlan === "pro" ? nextLevel : null,
            billingInterval: nextPlan === "pro" ? nextInterval : null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Plan update failed");
        patch.plan = nextPlan;
        patch.tier = json.tier;
        patch.status = json.status;
        patch.billingInterval = json.billingInterval;
        patch.planValidUntil = json.currentPeriodEnd;
      }

      if (roleChanged) {
        const res = await fetch("/api/admin/users/update-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkUserId: user.id, role: nextRole || null }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Role update failed");
        patch.role = json.role;
        patch.isAdmin = json.role !== null;
      }

      onSaved(patch);
      onClose();
    } catch (err) {
      setError(err.message);
      setStep("edit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-6 flex items-center gap-3">
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={user.name || ""}
            width={40}
            height={40}
            className="h-10 w-10 object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center bg-white/10 text-sm font-medium">
            {(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{displayName(user)}</h2>
          <p className="truncate text-xs text-white/45">{user.email || user.id}</p>
        </div>
      </div>

      {step === "edit" && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Plan</p>
            <p className="mb-3 text-sm text-white/50">
              Currently{" "}
              <span className="text-white">
                {user.plan === "pro"
                  ? `${LEVEL_LABELS[currentLevel]}, billed ${BILLING_LABELS[user.billingInterval || "monthly"]}`
                  : "Free"}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CustomSelect
                value={nextLevel}
                onChange={setNextLevel}
                options={[
                  { value: "free", label: "Free" },
                  { value: "pro", label: "Pro" },
                  { value: "pro_plus", label: "Pro+" },
                ]}
              />
              {nextPlan === "pro" && (
                <CustomSelect
                  value={nextInterval}
                  onChange={setNextInterval}
                  options={[
                    { value: "monthly", label: "1 month" },
                    { value: "quarterly", label: "3 months" },
                    { value: "yearly", label: "1 year" },
                  ]}
                />
              )}
            </div>
            {/* Explicit, unmissable downgrade action - not just "pick Free
                from the same dropdown" - since revoking a paying customer's
                access is exactly the kind of change that shouldn't hide
                inside a generic control. */}
            {nextPlan === "pro" && user.plan === "pro" && (
              <button
                type="button"
                onClick={() => setNextLevel("free")}
                className="mt-2 text-xs text-red-400 underline underline-offset-2 transition hover:text-red-300"
              >
                Downgrade to Free
              </button>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-white/45">Role</p>
            {isOwnRow ? (
              <p className="text-sm text-white/50">
                You can&apos;t change your own role - ask another super admin.
              </p>
            ) : (
              <CustomSelect
                value={nextRole}
                onChange={setNextRole}
                options={[
                  { value: "", label: "No access" },
                  { value: "admin", label: "Admin" },
                  { value: "super_admin", label: "Super Admin" },
                ]}
              />
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/60 transition hover:text-white"
            >
              Cancel
            </button>
            <Button
              href="#"
              preventDefault
              disabled={!hasChanges}
              onClick={() => setStep("confirm")}
              variant="orange"
              text="Review Changes"
            />
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-5">
          <p className="text-sm text-white/70">
            You&apos;re about to make the following change{changeSummaries.length === 1 ? "" : "s"}
            {" "}to <span className="text-white">{user.name || user.email}</span>:
          </p>

          <ul className="space-y-2">
            {changeSummaries.map((change) => (
              <li
                key={change.text}
                className={`border px-3 py-2 text-sm ${
                  change.danger
                    ? "border-red-500/25 bg-red-500/10 text-red-300"
                    : "border-white/10 bg-white/5 text-white/80"
                }`}
              >
                {change.text}
              </li>
            ))}
          </ul>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("edit")}
              disabled={saving}
              className="px-4 py-2 text-sm text-white/60 transition hover:text-white disabled:opacity-50"
            >
              Back
            </button>
            <Button
              href="#"
              preventDefault
              disabled={saving}
              onClick={handleConfirm}
              variant="orange"
              text={saving ? "Saving…" : "Confirm"}
            />
          </div>
        </div>
      )}
    </ModalShell>
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
  const [audience, setAudience] = useAdminAudience();
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

  // A plain same-origin GET, pointed straight at the API URL - the server's
  // Content-Disposition: attachment header is what makes the browser
  // download it rather than navigate, so this needs no fetch/blob JS at
  // all. The earlier fetch-to-blob-to-<a download> version broke under
  // Chrome's device-emulation mode (and possibly other constrained
  // contexts): the blob click fell through to a real top-level navigation
  // to the blob's bare id instead of triggering a save, 404ing because
  // that's not a real route. A plain link is what every "Download PDF"
  // link on the web actually is - no JS delivery mechanism to break.
  function handleExport() {
    const params = new URLSearchParams({ audience });
    if (search) params.set("search", search);
    if (planFilter !== "all") params.set("plan", planFilter);
    if (roleFilter !== "all") params.set("role", roleFilter);
    appendDateRangeParams(params);

    const link = document.createElement("a");
    link.href = `/api/admin/users/export?${params.toString()}`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function applyManageChanges(userId, patch) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const columns = isSuperAdmin ? 8 : 5;

  return (
    <>
    <div className="flex flex-col gap-[calc(var(--cvw)*0.8)] max-lg:gap-3">
      {/* header, right: export, the email log, invite */}
      <DashboardHeroAside>
        <div className="flex flex-wrap items-center gap-3">
          <AdminAudienceToggle value={audience} onChange={setAudience} />
          <Button text="Export CSV" variant="outline" preventDefault onClick={handleExport} />
          <Button text="Email log" variant="outline" href={path("admin/emails")} />
          <Button text="Invite" preventDefault onClick={() => setShowInviteModal(true)} />
        </div>
      </DashboardHeroAside>

      <UserStatsTiles dates={dates} audience={audience} />

      <section aria-label="Users" className={`${CARD} ${CARD_PAD} gap-[calc(var(--cvw)*1.2)] max-lg:gap-4`}>
        {/* search and filters */}
        <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
          <label className="type-small flex h-9.5 min-w-60 flex-1 items-center gap-2 bg-light px-3 text-black/60 ring-1 ring-inset ring-black/10 focus-within:ring-primary">
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
          <DateRangeFilter label="Joined" value={dates} onChange={setDates} />
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
                <th className="py-3 pr-4 font-normal">Web / CLI / MCP</th>
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
                        {user.imageUrl ? (
                          <Image src={user.imageUrl} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="type-small grid size-8 shrink-0 place-items-center rounded-full bg-ink text-foreground">{(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}</span>
                        )}
                        <div className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-1.5">
                            <Link href={path(`admin/activity/${buildUserActivitySlug(user)}`)} className="type-body truncate transition-colors duration-300 hover:text-primary">
                              {displayName(user)}
                            </Link>
                            {user.role && user.role !== "user" && <span className="type-small shrink-0 bg-black/5 px-1.5 text-black/60">{user.role === "super_admin" ? "Super admin" : "Admin"}</span>}
                            {isSuperAdmin && user.id === viewer?.id && <span className="type-small shrink-0 text-black/40">(you)</span>}
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
                      <span title="Website copies">{user.copiesCount ?? 0}</span>
                      <span className="text-black/20"> / </span>
                      <span title="CLI installs" className="text-primary">{user.cliCount ?? 0}</span>
                      <span className="text-black/20"> / </span>
                      <span title="MCP installs" className="text-black/60">{user.mcpCount ?? 0}</span>
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

        {/* pages, and how many a page */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PerPageMenu value={pageSize} onChange={setPageSize} />
          <div className="min-w-0 flex-1">
            <Pager page={currentPage - 1} pages={totalPages} total={total} noun={total === 1 ? "user" : "users"} onPage={(p) => setCurrentPage(p + 1)} />
          </div>
        </div>
      </section>
    </div>
    <AnimatePresence>
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}
      {manageUser && (
        <ManageUserModal
          user={manageUser}
          isOwnRow={manageUser.id === viewer?.id}
          onClose={() => setManageUser(null)}
          onSaved={(patch) => applyManageChanges(manageUser.id, patch)}
        />
      )}
    </AnimatePresence>
    </>
  );
}
