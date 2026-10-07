"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  ArrowUpRight,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  CheckCircle2,
  XCircle,
  UserCog,
  FileDown,
} from "lucide-react";
import { useAdminRole } from "@/lib/useAdminRole";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { StatCard } from "@/components/admin/StatCard";
import { DateRangeCalendarPicker } from "@/components/admin/DateRangeCalendarPicker";
import { buildUserActivitySlug } from "@/lib/user-slug";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 10;

const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

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
  if (user.email) {
    const local = user.email.split("@")[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return "Unnamed user";
}

function PlanBadge({ plan }) {
  return (
    <span
      className={`inline-flex items-center  px-3 py-1 text-xs font-medium ${
        plan === "pro"
          ? "bg-[#ff5f00]/15 text-[#ff5f00]"
          : "bg-white/8 text-white/60"
      }`}
    >
      {plan === "pro" ? "Pro" : "Free"}
    </span>
  );
}

// Site-wide activity for the selected window, scoped by real Supabase data
// (signups, first-ever paid invoices, install unlocks, saves) - not the
// per-user table's own filters, so switching table pages/filters never
// changes what these four numbers mean.
function UserStatsTiles({ range, onRangeChange, customFrom, customTo, onCustomFromChange, onCustomToChange }) {
  const [data, setData] = useState(null);
  const isCustom = range === "custom";

  useEffect(() => {
    // A custom range with nothing picked yet has nothing to fetch for -
    // wait for at least one bound instead of firing a request that's
    // equivalent to "all time" the instant "Custom range" is selected.
    if (isCustom && !customFrom && !customTo) return;

    let active = true;
    // Clears the previous window's numbers immediately so a range switch
    // never flashes stale data while the new fetch is in flight - a real
    // external-system sync, not derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);

    const params = new URLSearchParams({ range });
    if (isCustom && customFrom) params.set("from", customFrom);
    if (isCustom && customTo) params.set("to", customTo);

    fetch(`/api/admin/users/stats?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active) setData(json);
      })
      .catch(() => {
        if (active) setData(null);
      });

    return () => {
      active = false;
    };
  }, [range, isCustom, customFrom, customTo]);

  // Only "All time" is actually a headcount ("Total") - every other window,
  // custom ranges included, is a real "New" conversion count, matching how
  // the stats API computes each one differently under the hood.
  const isAllTime = range === "all";

  const stats = [
    { label: isAllTime ? "Total Users" : "New Users", value: data ? data.newUsers : "…" },
    { label: isAllTime ? "Total Pro Users" : "New Pro Users", value: data ? data.newProUsers : "…" },
    { label: "Installs & Copies", value: data ? data.copies : "…" },
    { label: "Saves", value: data ? data.saves : "…" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs uppercase tracking-wider text-white/45">Activity window</p>
        <div className="flex items-center gap-2">
          {isCustom && (
            <DateRangeCalendarPicker
              from={customFrom}
              to={customTo}
              onFromChange={onCustomFromChange}
              onToChange={onCustomToChange}
            />
          )}
          <CustomSelect
            size="compact"
            align="right"
            value={range}
            onChange={onRangeChange}
            options={DATE_RANGE_OPTIONS}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
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
      className="fixed inset-0 z-900 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="relative w-full max-w-lg  border border-white/10 bg-[#0a0a0a] p-6"
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
          className=" group absolute right-5 top-5 flex h-10 w-10 items-center justify-center  border border-white/20 bg-white/10 text-xl leading-none text-white/70 transition-all duration-500 ease-in-out hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white "
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
          <div className="max-h-[30vw] overflow-y-auto border border-white/10 bg-white/5 p-2 focus-within:border-white/25">
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
            <label className={`inline-flex items-center gap-2  border border-white/15 px-3 py-[.8vw] text-[1.1vw] max-md:text-[3.5vw] max-lg:text-[2.5vw] font-medium text-white/70 transition ${atDailyLimit ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-white/30 hover:text-white"}`}>
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

            <ButtonV3
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
const BILLING_LABELS = { monthly: "1 month", yearly: "1 year" };

function ModalShell({ onClose, children, maxWidth = "max-w-lg" }) {
  return (
    <motion.div
      className="fixed inset-0 z-900 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className={`relative w-full ${maxWidth}  border border-white/10 bg-[#0a0a0a] p-6`}
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
          className="max-lg:hidden group absolute right-5 top-5 flex h-10 w-10 items-center justify-center  border border-white/20 bg-white/10 text-xl leading-none text-white/70 transition-all duration-500 ease-in-out hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white "
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
  const [nextPlan, setNextPlan] = useState(user.plan === "pro" ? "pro" : "free");
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
    nextPlan !== (user.plan === "pro" ? "pro" : "free") ||
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
    } else if (user.plan !== "pro") {
      changeSummaries.push({ text: `Upgrade to Pro, billed ${BILLING_LABELS[nextInterval]}.` });
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
            billingInterval: nextPlan === "pro" ? nextInterval : null,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Plan update failed");
        patch.plan = nextPlan;
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
                  ? `Pro, billed ${BILLING_LABELS[user.billingInterval || "monthly"]}`
                  : "Free"}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CustomSelect
                value={nextPlan}
                onChange={setNextPlan}
                options={[
                  { value: "free", label: "Free" },
                  { value: "pro", label: "Pro" },
                ]}
              />
              {nextPlan === "pro" && (
                <CustomSelect
                  value={nextInterval}
                  onChange={setNextInterval}
                  options={[
                    { value: "monthly", label: "1 month" },
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
                onClick={() => setNextPlan("free")}
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
            <ButtonV3
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
            <ButtonV3
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
  const { user: viewer } = useUser();
  const { isSuperAdmin } = useAdminRole();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
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
    prevPageSize !== pageSize
  ) {
    setPrevSearch(search);
    setPrevPlanFilter(planFilter);
    setPrevRoleFilter(roleFilter);
    setPrevCustomFrom(customFrom);
    setPrevCustomTo(customTo);
    setPrevDateRange(dateRange);
    setPrevSortBy(sortBy);
    setPrevPageSize(pageSize);
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
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
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
  }, [search, planFilter, roleFilter, appendDateRangeParams, sortBy, pageSize, currentPage]);

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
    const params = new URLSearchParams();
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

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          {/* <p className="mt-1 text-sm text-white/50">{total} users total</p> */}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2  border border-white/15 px-4 py-3.5 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Export CSV
            <FileDown className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2  border border-white/15 px-4 py-3.5 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Invite
            <UserPlus className="h-3.5 w-3.5" />
          </button>
          <Link
            href="/dashboard/admin/emails"
            className="inline-flex items-center gap-2  border border-white/15 px-4 py-3.5 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Email Log
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <UserStatsTiles
        range={dateRange}
        onRangeChange={setDateRange}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center justify-between">
        <div className="flex gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-60">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full  border border-white/10 bg-white/5 py-3.5 pl-10 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/25"
            />
          </div>
          <CustomSelect
            value={planFilter}
            onChange={setPlanFilter}
            options={[
              { value: "all", label: "All plans" },
              { value: "pro", label: "Pro" },
              { value: "free", label: "Free" },
            ]}
          />
          <CustomSelect
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "all", label: "All roles" },
              { value: "user", label: "User" },
              { value: "admin", label: "Admin" },
              { value: "super_admin", label: "Super Admin" },
            ]}
          />
          <CustomSelect
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "newest", label: "Newest" },
              { value: "copies", label: "Most Copies" },
              { value: "installs", label: "Most Installs" },
              { value: "saves", label: "Most Saves" },
            ]}
          />
        </div>

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

      {/* Table */}
      <div className=" border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-white/45 uppercase tracking-wider">User</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-white/45 uppercase tracking-wider">Joined</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-white/45 uppercase tracking-wider">Plan</th>
                <th className="px-3 py-2.5 text-center text-xs font-medium text-white/45 uppercase tracking-wider">Copies / Installs / Saves</th>
                {isSuperAdmin && (
                  <>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-white/45 uppercase tracking-wider">Valid Until</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-white/45 uppercase tracking-wider">Payment ID</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-white/45 uppercase tracking-wider">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {loading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isSuperAdmin ? 7 : 4 }).map((__, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <div className="h-4 bg-white/8 animate-pulse" style={{ width: j === 0 ? "120px" : "70px" }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 4} className="px-3 py-10 text-center text-white/40">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-white/2">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {user.imageUrl ? (
                          <Image
                            src={user.imageUrl}
                            alt={user.name || ""}
                            width={28}
                            height={28}
                            className="h-7 w-7  object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center  bg-white/10 text-xs font-medium">
                            {(user.name?.[0] || user.email?.[0] || "?").toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/dashboard/admin/activity/${buildUserActivitySlug(user)}`}
                              className="truncate font-medium text-white max-w-32 hover:text-[#ff5f00] hover:underline underline-offset-2"
                            >
                              {displayName(user)}
                            </Link>
                            {isSuperAdmin && user.id === viewer?.id && (
                              <span className="shrink-0 text-xs text-white/30">(you)</span>
                            )}
                          </div>
                          <p className="truncate text-xs text-white/45 max-w-32">
                            {user.email || user.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-white/60 whitespace-nowrap">
                      {formatDate(user.joinedAt)}
                    </td>
                    <td className="px-3 py-2.5 flex justify-center">
                      <PlanBadge plan={user.plan} />
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <span className="text-blue-400">{user.copiesCount ?? 0}</span>
                      <span className="mx-1 text-white/25">/</span>
                      <span className="text-emerald-400">{user.installsCount ?? 0}</span>
                      <span className="mx-1 text-white/25">/</span>
                      <span className="text-purple-400">{user.savesCount ?? 0}</span>
                    </td>
                    {isSuperAdmin && (
                      <>
                        <td className="px-3 py-2.5 text-white/60 whitespace-nowrap text-center">
                          {user.plan === "pro" ? formatDate(user.planValidUntil) : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {user.razorpayCustomerId ? (
                            <span className="font-mono text-xs text-white/60" title={user.razorpayCustomerId}>
                              {user.razorpayCustomerId.slice(0, 10)}…
                            </span>
                          ) : (
                            <span className="text-xs text-white/60 inline-block w-fit">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => setManageUser(user)}
                            className="inline-flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-xs text-white/70 transition hover:border-white/30 hover:text-white"
                          >
                            <UserCog className="h-3.5 w-3.5" />
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
      </div>

      {!loading && users.length > 0 && (
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
