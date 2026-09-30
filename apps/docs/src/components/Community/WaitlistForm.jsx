"use client";

import { useId, useRef, useState } from "react";
import { buttonV3ClassName, ButtonV3Chrome } from "@/homepage-v3/components/ButtonV3";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { getCrowd, markJoined, useCommunity } from "./community-store";

const WAITLIST_ROUTE = "/api/community/waitlist";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Email + submit, used in the hero and in Join. Both instances share the
// joined state, so signing up in one marks the other done too.
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

  let label = "Join the waitlist";
  if (sending) label = "Saving your seat…";
  if (joined) label = "You’re in ✓";

  return (
    <form className={`wl${joined ? " done" : ""}${error ? " err" : ""} ${className}`} onSubmit={onSubmit} noValidate>
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
      />
      <button
        ref={buttonRef}
        type="submit"
        disabled={joined || sending}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        data-sound-kind="primary"
        className={buttonV3ClassName({ className: "wl-btn", disabled: joined || sending })}
      >
        <ButtonV3Chrome label={label} hovered={hovered} />
      </button>
      <p id={`${inputId}-msg`} className="wl-msg label" aria-live="polite">{error}</p>
    </form>
  );
}
