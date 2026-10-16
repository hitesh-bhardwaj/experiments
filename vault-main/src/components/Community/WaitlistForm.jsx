"use client";

import { useId, useRef, useState } from "react";
import { buttonClassName, ButtonChrome } from "@/homepage/components/Button";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { getCrowd, markJoined, useCommunity } from "./community-store";

const WAITLIST_ROUTE = "/api/community/waitlist";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Email + submit, used in the hero and in Join. Both instances share the
// joined state, so signing up in one marks the other done too.
// On phones the field sits over a full-width button, at 16px so iOS Safari
// doesn't zoom the page when it's tapped.
export default function WaitlistForm({ className = "" }) {
  const inputId = useId();
  const buttonRef = useRef(null);
  const { stack, joined } = useCommunity();
  const { sound } = useInteraction() ?? {};
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [hovered, setHovered] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (joined || sending) return;
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError(value ? "That email doesn’t look quite right." : "Pop your email in first.");
      e.currentTarget.querySelector("input")?.focus();
      return;
    }

    setError("");
    setSending(true);
    try {
      const res = await fetch(WAITLIST_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, stack }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn’t save your seat. Please try again.");
        return;
      }
    } catch {
      setError("Couldn’t reach the server. Check your connection and try again.");
      return;
    } finally {
      setSending(false);
    }

    const b = buttonRef.current?.getBoundingClientRect();
    if (b) getCrowd()?.launch(b.left + b.width / 2, b.top + b.height / 2);
    sound?.note?.(4);
    markJoined();
  };

  let label = "Join the Waitlist";
  if (sending) label = "Saving your Seat…";
  if (joined) label = "You’re in ✓";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={`relative flex w-full items-center gap-1.5 bg-background/60 px-1.5 py-1.5 ring-1 ring-inset backdrop-blur-lg transition-shadow duration-700 ease-[cubic-bezier(.16,1,.3,1)] max-md:flex-col max-md:items-stretch max-md:gap-2 max-md:p-2 ${
        joined
          ? "ring-success/60"
          : error
            ? "ring-danger/60"
            : "shadow-2xl ring-foreground/10 focus-within:ring-primary/60"
      } ${className}`}
    >
      <label className="sr-only" htmlFor={inputId}>Work email</label>
      <input
        id={inputId}
        type="email"
        name="email"
        placeholder={joined ? "You’re on the list" : "you@studio.com"}
        autoComplete="email"
        required
        disabled={joined}
        value={joined ? "" : email}
        onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
        aria-invalid={!!error}
        aria-describedby={`${inputId}-msg`}
        className={`type-body h-11 min-w-0  flex-1 border-0 bg-transparent px-[calc(var(--cvw)*1.2)] text-foreground outline-none [--input-autofill-bg:var(--background)] [--input-autofill-text:var(--foreground)] max-md:h-12 max-md:flex-none max-md:bg-foreground/5 max-md:px-3 max-md:text-[16px] ${joined ? "placeholder:text-success" : "placeholder:text-foreground/60"}`}
      />
      <button
        ref={buttonRef}
        type="submit"
        disabled={joined || sending}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        data-sound-kind="primary"
        className={buttonClassName({ className: "max-md:w-full max-md:justify-center", disabled: joined || sending })}
      >
        <ButtonChrome label={label} hovered={hovered} />
      </button>
      <p id={`${inputId}-msg`} className="type-label absolute top-[calc(100%+var(--cvw)*0.7)] left-[calc(var(--cvw)*1.2)] min-h-[1em] text-left text-danger max-md:static max-md:min-h-0 max-md:px-1 max-md:empty:hidden" aria-live="polite">{error}</p>
    </form>
  );
}
