"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Ban, Check, Copy, KeyRound, LoaderCircle, RotateCcw } from "lucide-react";
import { ACTION_PRIMARY, CARD_PAD, CardLink, DetailRows, SourceChip } from "@/components/Dashboard/DashboardUI";
import { BUTTON_SIZE } from "@/homepage/components/Button";
import { FilterMenu } from "@/app/(app)/(workspace)/effects/FilterMenu";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { useLenisLock } from "@/hooks/useLenisLock";
import { prefersReducedMotion } from "@/lib/motion";
import { getDashboardPreview } from "@/lib/dev/dashboardPreview";

const LEVELS = { free: "Free", pro: "Pro", pro_plus: "Pro+" };
const LENGTHS = { monthly: "1 month", quarterly: "3 months", yearly: "1 year" };
const ROLES = { "": "No access", admin: "Admin", super_admin: "Super Admin" };

const formatDate = (value) => (value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—");
// "free" | "pro" | "pro_plus" (Pro+ is plan "pro", tier "pro_plus"; old rows have no tier)
const levelOf = (user) => (user.plan === "pro" ? user.tier || "pro_plus" : "free");
const roleOf = (user) => (user.role && user.role !== "user" ? user.role : "");

function timeAgo(value) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

// The drawer's surfaces and buttons, on the dark page (as the effects' preview drawer)
const PANEL_CARD = `flex flex-col bg-dark-card text-foreground ring-1 ring-inset ring-foreground/10 ${CARD_PAD}`;
const LINE_BUTTON = `inline-flex w-fit shrink-0 cursor-pointer items-center gap-2 px-4 ${BUTTON_SIZE} text-foreground ring-1 ring-inset ring-foreground/20 transition-[color,box-shadow] duration-300 hover:text-primary hover:ring-primary disabled:cursor-default disabled:opacity-60 [&_svg]:size-4`;

// Open / close choreography of the effects' preview drawer: the panel slides in from the
// right (power2.inOut) while the backdrop fades, then the content fades in; closing runs
// it backwards before anything unmounts. Reduced motion: fades in place.
const EASE = "power2.inOut";
const PANEL_DURATION = 0.65;
const CONTENT_DURATION = 0.25;
const panelHidden = () => (prefersReducedMotion() ? { xPercent: 0, opacity: 0 } : { xPercent: 100, opacity: 1 });

// A dropdown in a card: the site's dark filter menu
function Picker({ label, value, options, onChange }) {
  return (
    <FilterMenu
      variant="label"
      label={label}
      options={Object.keys(options)}
      categoryFilter={value}
      activeFilter={null}
      getLabel={(id) => options[id]}
      onSelect={onChange}
    />
  );
}

// The change about to be made, and Confirm / Cancel - every change here asks first
function Confirm({ lines, busy, onConfirm, onCancel }) {
  return (
    <div className="flex flex-col gap-3 bg-foreground/5 p-4 ring-1 ring-inset ring-foreground/10">
      <ul className="flex flex-col gap-1.5">
        {lines.map((line) => (
          <li key={line.text} className={`type-small flex items-start gap-2 ${line.danger ? "text-danger" : "text-foreground"}`}>
            <span aria-hidden="true" className={`mt-[0.55em] size-1.5 shrink-0 rounded-full ${line.danger ? "bg-danger" : "bg-primary"}`} />
            {line.text}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={onConfirm} disabled={busy} className={ACTION_PRIMARY}>
          {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          {busy ? "Saving…" : "Confirm"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="type-label cursor-pointer text-foreground/80 underline underline-offset-3 transition-colors duration-300 hover:text-primary">
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Manage one account (super admins, the Users tab): the effects' preview drawer, dark,
 * from the right - who they are, their numbers, plan and access, role, recent installs and
 * account actions (copy email, send a password reset, suspend). Every change is confirmed
 * first, naming exactly what will happen. `user` opens it (and keeps it current); null
 * closes it. `onSaved(patch)` updates the row in the table.
 */
export function ManageUserDrawer({ user, isOwnRow, activityHref, onClose, onSaved }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const closeRef = useRef(null);
  const tlRef = useRef(null);
  const closingRef = useRef(false);
  const open = Boolean(user);

  // The account on screen: it outlives `user` until the close animation ends
  const [shown, setShown] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (user) {
      // Opening, reopening while it closes, or a saved change to the same account
      if (closingRef.current) {
        closingRef.current = false;
        tlRef.current?.kill();
        tlRef.current = gsap
          .timeline()
          .to(panelRef.current, { xPercent: 0, opacity: 1, duration: PANEL_DURATION, ease: EASE })
          .to(overlayRef.current, { opacity: 1, duration: PANEL_DURATION, ease: EASE }, "<")
          .to(contentRef.current, { opacity: 1, duration: CONTENT_DURATION, ease: EASE });
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(user);
      return;
    }
    if (!panelRef.current) return;
    closingRef.current = true;
    tlRef.current?.kill();
    tlRef.current = gsap
      .timeline({
        onComplete: () => {
          closingRef.current = false;
          setShown(null);
        },
      })
      .to(contentRef.current, { opacity: 0, duration: CONTENT_DURATION, ease: EASE })
      .to(panelRef.current, { ...panelHidden(), duration: PANEL_DURATION, ease: EASE })
      .to(overlayRef.current, { opacity: 0, duration: PANEL_DURATION, ease: EASE }, "<");
  }, [user]);

  // Slide in when it first appears
  const shownId = shown?.id;
  const visible = Boolean(shown);
  useLayoutEffect(() => {
    if (!visible || closingRef.current) return;
    tlRef.current?.kill();
    gsap.set(panelRef.current, panelHidden());
    gsap.set(overlayRef.current, { opacity: 0 });
    gsap.set(contentRef.current, { opacity: 0 });
    tlRef.current = gsap
      .timeline()
      .to(panelRef.current, { xPercent: 0, opacity: 1, duration: PANEL_DURATION, ease: EASE })
      .to(overlayRef.current, { opacity: 1, duration: PANEL_DURATION, ease: EASE }, "<")
      .to(contentRef.current, { opacity: 1, duration: CONTENT_DURATION, ease: EASE });
  }, [visible, shownId]);
  useEffect(() => () => tlRef.current?.kill(), []);

  // Escape closes it (not while a change is saving); the close button gets focus
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const focus = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), PANEL_DURATION * 1000);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(focus);
    };
  }, [open, busy, onClose]);
  useLenisLock(open);

  if (!shown || typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="manage-user-title" data-sound-flow="off" className="fixed inset-0 z-990">
      <div ref={overlayRef} aria-hidden="true" onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/30 backdrop-blur-lg" />
      <div
        ref={panelRef}
        data-lenis-prevent
        className="absolute inset-y-0 right-0 w-[calc(var(--cvw)*40)] overflow-y-auto overscroll-contain border-l border-foreground/10 bg-background text-foreground max-lg:w-full max-lg:border-l-0"
      >
        <div ref={contentRef} className="flex flex-col gap-(--cvw) px-10 pt-7 pb-16 max-lg:gap-3 max-lg:px-8 max-md:px-[6vw]">
          <DrawerBody
            key={shown.id}
            user={shown}
            isOwnRow={isOwnRow}
            activityHref={activityHref}
            onClose={onClose}
            onSaved={onSaved}
            busy={busy}
            setBusy={setBusy}
            closeRef={closeRef}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DrawerBody({ user, isOwnRow, activityHref, onClose, onSaved, busy, setBusy, closeRef }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // The change waiting for Confirm: "plan" | "role" | "suspend"
  const [pending, setPending] = useState(null);

  const currentLevel = levelOf(user);
  const [level, setLevel] = useState(currentLevel);
  const [length, setLength] = useState(user.plan === "pro" ? user.billingInterval || "monthly" : "monthly");
  const [role, setRole] = useState(roleOf(user));
  const planChanged = level !== currentLevel || (level !== "free" && length !== (user.billingInterval || "monthly"));
  const roleChanged = role !== roleOf(user);

  // Their latest installs
  const [recent, setRecent] = useState(null);
  useEffect(() => {
    let active = true;
    if (getDashboardPreview()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecent([]);
      return undefined;
    }
    fetch(`/api/admin/copy-activity?range=all&limit=6&userId=${encodeURIComponent(user.id)}`)
      .then((res) => (res.ok ? res.json() : { events: [] }))
      .then((json) => active && setRecent(json.events || []))
      .catch(() => active && setRecent([]));
    return () => {
      active = false;
    };
  }, [user.id]);

  const [copied, setCopied] = useState(false);
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(user.email || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the email is on screen to select
    }
  }

  async function post(url, body) {
    if (getDashboardPreview()) throw new Error("Not available in the preview.");
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "That didn’t work. Please try again.");
    return json;
  }

  async function run(kind, work) {
    setBusy(kind);
    setError("");
    setNotice("");
    try {
      const patch = await work();
      if (patch) onSaved(patch);
      setPending(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const planLines = [
    level === "free"
      ? { text: "Move to Free: Pro access and any CLI token for it stop straight away.", danger: currentLevel !== "free" }
      : level !== currentLevel
        ? { text: `Give ${LEVELS[level]} for ${LENGTHS[length]}, free of charge.` }
        : { text: `Change the access length to ${LENGTHS[length]}.` },
  ];
  const roleLines = [
    role === "super_admin"
      ? { text: "Make Super Admin: full access, including revenue, invoicing and roles.", danger: true }
      : !role
        ? { text: `Remove ${ROLES[user.role] || "admin"} access.`, danger: true }
        : { text: `Make ${ROLES[role]}: sees Activity and Users, not revenue or invoicing.` },
  ];
  const suspendLines = user.suspended
    ? [{ text: "Restore the account: they can sign in again." }]
    : [{ text: "Suspend the account: signed out everywhere and can’t sign in until restored. Their plan, payments and history stay.", danger: true }];

  const sources = [user.webCount, user.cliCount, user.mcpCount].map((n) => n ?? 0);

  return (
    <>
      {/* who, and the close control (the cross turns a quarter on hover, as on the preview drawer) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar name={user.name} email={user.email} imageUrl={user.imageUrl} className="size-[calc(var(--cvw)*4)] max-lg:size-14" textClassName="type-body" />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="manage-user-title" className="type-h3 truncate">
              {user.name || user.email}
            </h2>
            <p className="type-small truncate text-foreground/80">
              {user.email} · joined {formatDate(user.joinedAt)}
            </p>
            {user.suspended && <span className="type-small w-fit bg-danger/15 px-2 text-danger">Suspended</span>}
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close (Esc)"
          onClick={() => !busy && onClose()}
          className="group flex size-10 shrink-0 cursor-pointer items-center justify-center border border-foreground/20 bg-foreground/10 transition-colors duration-500 hover:border-primary hover:bg-primary"
        >
          <span className="relative flex size-4 items-center justify-center transition-transform duration-500 ease-in-out group-hover:rotate-90">
            <span className="h-px w-4 rotate-45 bg-foreground" />
            <span className="absolute h-px w-4 -rotate-45 bg-foreground" />
          </span>
        </button>
      </div>

      {/* their numbers */}
      <div className="flex gap-[calc(var(--cvw)*0.6)] max-lg:gap-2">
        {[
          [user.installsCount ?? 0, "Installs"],
          [sources.join(" / "), "Web / CLI / MCP"],
          [user.savesCount ?? 0, "Saves"],
        ].map(([value, label]) => (
          <div key={label} className="flex flex-1 flex-col gap-1 bg-dark-card p-(--cvw) ring-1 ring-inset ring-foreground/10 max-lg:p-4">
            <p className="type-h3">{value}</p>
            <p className="type-small text-foreground/80">{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="type-small bg-danger/15 px-4 py-3 text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="type-small bg-primary/15 px-4 py-3 text-foreground">
          {notice}
        </p>
      )}

      {/* plan and access */}
      <section aria-labelledby="manage-plan-h" className={`${PANEL_CARD} gap-(--cvw) max-lg:gap-4`}>
        <h3 id="manage-plan-h" className="type-h3">
          Plan &amp; access
        </h3>
        <DetailRows
          tone="dark"
          rows={[
            ["Plan", `${LEVELS[currentLevel]}${user.plan === "pro" && user.billingInterval ? ` · ${LENGTHS[user.billingInterval] || user.billingInterval}` : ""}`],
            ["Valid until", user.plan === "pro" ? formatDate(user.planValidUntil) : "—"],
            ["Payment ID", user.razorpayCustomerId || "—"],
          ]}
        />
        {pending === "plan" ? (
          <Confirm
            lines={planLines}
            busy={busy === "plan"}
            onCancel={() => setPending(null)}
            onConfirm={() =>
              run("plan", async () => {
                const plan = level === "free" ? "free" : "pro";
                const json = await post("/api/admin/users/update-plan", { clerkUserId: user.id, plan, tier: plan === "pro" ? level : null, billingInterval: plan === "pro" ? length : null });
                return { plan, tier: json.tier, status: json.status, billingInterval: json.billingInterval, planValidUntil: json.currentPeriodEnd };
              })
            }
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Picker label="Plan" value={level} options={LEVELS} onChange={setLevel} />
            {level !== "free" && <Picker label="Access length" value={length} options={LENGTHS} onChange={setLength} />}
            <button type="button" disabled={!planChanged} onClick={() => setPending("plan")} className={`${ACTION_PRIMARY} ml-auto`}>
              Apply
            </button>
          </div>
        )}
      </section>

      {/* role */}
      <section aria-labelledby="manage-role-h" className={`${PANEL_CARD} gap-(--cvw) max-lg:gap-4`}>
        <h3 id="manage-role-h" className="type-h3">
          Role
        </h3>
        {isOwnRow ? (
          <p className="type-small text-foreground/80">You can’t change your own role. Ask another super admin.</p>
        ) : pending === "role" ? (
          <Confirm
            lines={roleLines}
            busy={busy === "role"}
            onCancel={() => setPending(null)}
            onConfirm={() =>
              run("role", async () => {
                const json = await post("/api/admin/users/update-role", { clerkUserId: user.id, role: role || null });
                return { role: json.role, isAdmin: json.role !== null };
              })
            }
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Picker label="Role" value={role} options={ROLES} onChange={setRole} />
            <button type="button" disabled={!roleChanged} onClick={() => setPending("role")} className={`${LINE_BUTTON} ml-auto`}>
              Save role
            </button>
          </div>
        )}
        <p className="type-small text-foreground/80">Admins see Activity and Users. Only Super Admins see revenue and Invoicing.</p>
      </section>

      {/* recent installs */}
      <section aria-labelledby="manage-recent-h" className={`${PANEL_CARD} gap-(--cvw) max-lg:gap-4`}>
        <div className="flex items-baseline justify-between gap-4">
          <h3 id="manage-recent-h" className="type-h3">
            Recent activity
          </h3>
          <CardLink href={activityHref} tone="dark">
            All activity
          </CardLink>
        </div>
        {recent === null ? (
          <p className="type-small text-foreground/80">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="type-small text-foreground/80">No installs yet.</p>
        ) : (
          <ul className="flex flex-col">
            {recent.map((event) => (
              <li key={event.id} className="flex items-center gap-3 border-t border-foreground/10 py-2.5 first:border-t-0">
                <SourceChip source={event.source} dark />
                <span className="type-body min-w-0 flex-1 truncate">{event.effectTitle}</span>
                <span className="type-small shrink-0 text-foreground/80">{timeAgo(event.occurredAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* account */}
      <section aria-labelledby="manage-account-h" className={`${PANEL_CARD} gap-(--cvw) max-lg:gap-4`}>
        <h3 id="manage-account-h" className="type-h3">
          Account
        </h3>
        {pending === "suspend" ? (
          <Confirm
            lines={suspendLines}
            busy={busy === "suspend"}
            onCancel={() => setPending(null)}
            onConfirm={() =>
              run("suspend", async () => {
                const json = await post("/api/admin/users/suspend", { clerkUserId: user.id, suspended: !user.suspended });
                return { suspended: json.suspended };
              })
            }
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy === "reset" || !user.email}
              onClick={() =>
                run("reset", async () => {
                  const json = await post("/api/admin/users/send-password-reset", { clerkUserId: user.id });
                  setNotice(`Reset email sent to ${json.email}. Their password stays the same until they use it.`);
                  return null;
                })
              }
              className={LINE_BUTTON}
            >
              {busy === "reset" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
              Send password reset
            </button>
            <button type="button" onClick={copyEmail} disabled={!user.email} className={LINE_BUTTON}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? "Copied" : "Copy email"}
            </button>
            {!isOwnRow && (
              <button
                type="button"
                onClick={() => setPending("suspend")}
                className={`${LINE_BUTTON} ${user.suspended ? "" : "text-danger hover:text-danger hover:ring-danger"}`}
              >
                {user.suspended ? <RotateCcw aria-hidden="true" /> : <Ban aria-hidden="true" />}
                {user.suspended ? "Restore account" : "Suspend"}
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}
