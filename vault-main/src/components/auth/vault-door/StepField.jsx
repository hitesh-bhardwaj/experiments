"use client";

import { useEffect, useRef, useState } from "react";
import { FIELDS, FOCUS_RING_CLASS, INPUT_AUTOFILL_STYLE, LABEL_CLASS } from "./constants";
import { EyeIcon } from "./icons";
import { passwordStrength } from "./utils";

const FINE_POINTER_QUERY = "(pointer: fine)";
const STRONG_ENOUGH = 3;

// One underlined field with its submit, styled like the footer newsletter row
export function StepField({ id, field, value, message, busy, submitLabel, onChange, onKeyDown }) {
  // Refs
  const inputRef = useRef(null);

  // State
  const [revealed, setRevealed] = useState(false);

  // Effects
  useEffect(() => {
    // Skip on touch so the keyboard doesn't jump up on every step
    if (window.matchMedia(FINE_POINTER_QUERY).matches) inputRef.current?.focus();
  }, []);

  // Render
  const config = FIELDS[field];
  const isPassword = config.type === "password";
  const strength = field === "newPassword" ? passwordStrength(value) : 0;
  const messageId = `${id}-message`;
  const isError = message?.tone === "bad";

  return (
    <div className="grid gap-[0.6vw] max-md:gap-2" data-step>
      <label htmlFor={id} className={`${LABEL_CLASS} text-white/40`}>
        {config.label}
      </label>

      <div className="relative flex items-center gap-[1vw] border-b border-foreground/30 transition-colors duration-300 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-700 after:ease-[cubic-bezier(.16,1,.3,1)] focus-within:border-white/70 focus-within:after:scale-x-100 max-md:gap-3">
        <input
          ref={inputRef}
          id={id}
          name={field}
          type={isPassword && revealed ? "text" : config.type}
          inputMode={config.inputMode}
          autoComplete={config.autoComplete}
          placeholder={config.placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby={messageId}
          aria-invalid={isError || undefined}
          required
          style={INPUT_AUTOFILL_STYLE}
          className="text24 h-auto min-w-0 flex-1 border-0 bg-transparent px-0 py-[0.9vw] text-white caret-primary outline-none placeholder:text-[#6e6e6e] max-md:py-3"
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => {
              setRevealed((current) => !current);
              inputRef.current?.focus();
            }}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className={`grid size-[2.4vw] shrink-0 cursor-pointer place-items-center text-white/40 transition-colors duration-300 hover:text-white aria-pressed:text-white max-lg:size-10 ${FOCUS_RING_CLASS}`}
          >
            <EyeIcon className="size-[1.2vw] max-lg:size-[18px]" />
          </button>
        )}

        <button
          type="submit"
          disabled={busy}
          aria-label={submitLabel}
          data-sound-kind="primary"
          className={`grid size-[2.5vw] shrink-0 cursor-pointer place-items-center bg-primary text-black transition-colors duration-300 hover:bg-white disabled:pointer-events-none disabled:opacity-60 max-lg:size-10 ${FOCUS_RING_CLASS}`}
        >
          {busy ? (
            <span className="size-[0.45vw] animate-pulse bg-current max-lg:size-2" aria-hidden="true" />
          ) : (
            <span
              aria-hidden="true"
              className="size-[0.9vw] bg-current [mask-image:url(/svgs/pixelated-arrow.svg)] mask-contain mask-center mask-no-repeat max-lg:size-3.5"
            />
          )}
        </button>
      </div>

      {field === "newPassword" && (
        <div className="-mt-[0.6vw] h-px bg-white/10 max-md:-mt-2" aria-hidden="true">
          <i
            className="block h-full transition-[width,background-color] duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
            style={{ width: `${strength * 25}%`, backgroundColor: strength >= STRONG_ENOUGH ? "var(--primary)" : "var(--light-grey)" }}
          />
        </div>
      )}

      <p
        id={messageId}
        aria-live="polite"
        className={`min-h-[1.4em] text-sm ${
          isError
            ? "text-white before:mr-2 before:inline-block before:size-1.5 before:bg-primary before:align-[1px] before:content-['']"
            : "text-light-grey"
        }`}
      >
        {message?.text}
      </p>
    </div>
  );
}
