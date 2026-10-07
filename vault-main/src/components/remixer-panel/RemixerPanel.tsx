"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, ChevronDown, Copy, RotateCcw } from "lucide-react";
import styles from "./remixer-panel.module.css";
import type { RemixerControl, RemixerOption, RemixerPanelProps } from "./types";

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function formatValue(value: unknown, control: RemixerControl) {
  if (control.format) return control.format(value);
  if (typeof value === "boolean") return value ? "on" : "off";
  if (typeof value === "object" && value !== null) return control.type;
  if (typeof value === "string" || typeof value === "number") return value;
  return "";
}

function normalizeColorInputValue(value: unknown) {
  if (typeof value === "number") return `#${value.toString(16).padStart(6, "0").slice(-6)}`;
  if (typeof value === "string" && /^0x[0-9a-f]{6}$/i.test(value)) return `#${value.slice(2)}`;
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return "#ffffff";
}

function getOptionValue(option: RemixerOption) {
  return typeof option === "object" ? (option.value ?? option.label ?? "") : option;
}

function getOptionLabel(option: RemixerOption) {
  return typeof option === "object" ? (option.label ?? option.value ?? "") : option;
}

function clampNumber(value: number, control: RemixerControl) {
  let nextValue = value;
  if (typeof control.min === "number") nextValue = Math.max(control.min, nextValue);
  if (typeof control.max === "number") nextValue = Math.min(control.max, nextValue);
  return nextValue;
}

function getFillPercent(value: number, control: RemixerControl) {
  const min = typeof control.min === "number" ? control.min : 0;
  const max = typeof control.max === "number" ? control.max : 100;
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

const LERP = 0.22;

function roundToStep(value: number, control: RemixerControl) {
  const step = typeof control.step === "number" && control.step > 0 ? control.step : 1;
  const min = typeof control.min === "number" ? control.min : 0;
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Number((Math.round((value - min) / step) * step + min).toFixed(decimals));
}

// Range input whose thumb, fill and emitted value ease toward the dragged
// position instead of jumping. Outside changes (typed value, Reset) snap.
function SmoothRange({
  control,
  value,
  onChange,
}: {
  control: RemixerControl;
  value: number;
  onChange: (value: number) => void;
}) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const targetRef = useRef(value);
  const emittedRef = useRef(value);
  const frameRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (value === emittedRef.current) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    targetRef.current = displayRef.current = emittedRef.current = value;
    setDisplay(value);
  }, [value]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const tick = () => {
    const target = targetRef.current;
    let next = displayRef.current + (target - displayRef.current) * LERP;
    const range = (control.max ?? 100) - (control.min ?? 0) || 1;
    if (Math.abs(target - next) < range * 0.001) next = target;
    displayRef.current = next;
    setDisplay(next);
    const emitted = next === target ? target : roundToStep(next, control);
    if (emitted !== emittedRef.current) {
      emittedRef.current = emitted;
      onChangeRef.current(emitted);
    }
    frameRef.current = next === target ? 0 : requestAnimationFrame(tick);
  };

  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <input
      type="range"
      min={control.min}
      max={control.max}
      step="any"
      value={display}
      onChange={(event) => {
        const next = roundToStep(Number(event.target.value), control);
        targetRef.current = next;
        if (reduceMotion) {
          displayRef.current = emittedRef.current = next;
          setDisplay(next);
          onChangeRef.current(next);
          return;
        }
        if (!frameRef.current) frameRef.current = requestAnimationFrame(tick);
      }}
      className={styles.range}
      style={{ "--fill": `${getFillPercent(display, control)}%` } as CSSProperties}
    />
  );
}

// Drawn with stroke-dashoffset (pathLength=1), so the tick strokes in when checked.
function CheckTick() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={styles.checkboxInner}>
      <path d="M2 6.5 4.8 9 10 3" pathLength={1} />
    </svg>
  );
}

function ControlField({
  control,
  value,
  onChange,
}: {
  control: RemixerControl;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const displayValue = formatValue(value, control);

  if (control.type === "checkbox" || control.type === "toggle") {
    return (
      <button type="button" onClick={() => onChange(!value)} className={`${styles.field} ${styles.toggleRow}`}>
        <span className={styles.fieldLabel}>{control.id ?? control.label}</span>
        <span className={`${styles.checkboxOuter} ${value ? styles.checkboxSelected : ""}`}>
          <CheckTick />
        </span>
      </button>
    );
  }

  if (control.type === "color") {
    const colorValue = normalizeColorInputValue(value);
    return (
      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{control.id ?? control.label}</span>
          {/* Small swatch (opens the native picker) right beside the hex value. */}
          <span className={styles.colorValue}>
          <input
            type="color"
            value={colorValue}
            onChange={(event) => onChange(event.target.value)}
            className={styles.colorSwatch}
            aria-label={`${control.label} colour picker`}
          />
          <input
            key={colorValue}
            type="text"
            defaultValue={colorValue}
            onChange={(event) => {
              const nextValue = event.target.value.trim();
              if (/^#?[0-9a-f]{6}$/i.test(nextValue)) {
                onChange(nextValue.startsWith("#") ? nextValue : `#${nextValue}`);
              }
            }}
            onBlur={(event) => {
              const nextValue = normalizeColorInputValue(event.target.value);
              event.currentTarget.value = nextValue;
              onChange(nextValue);
            }}
            className={`${styles.fieldValue} ${styles.colorText}`}
            aria-label={`${control.label} hex value`}
            spellCheck={false}
          />
          </span>
        </div>
        {control.description ? <p className={styles.fieldDescription}>{control.description}</p> : null}
      </div>
    );
  }

  if (control.type === "radio") {
    return (
      <div className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{control.id ?? control.label}</span>
          <span className={styles.fieldValue}>{displayValue}</span>
        </div>
        {control.description ? <p className={styles.fieldDescription}>{control.description}</p> : null}
        <div className={styles.checkboxGroup}>
          {control.options?.map((option) => {
            const optionValue = getOptionValue(option);
            const optionLabel = getOptionLabel(option);
            const isSelected = value === optionValue;

            return (
              <button
                key={String(optionValue)}
                type="button"
                onClick={() => onChange(optionValue)}
                className={`${styles.checkboxOption} ${isSelected ? styles.checkboxOptionSelected : ""}`}
              >
                <span className={`${styles.checkboxOuter} ${isSelected ? styles.checkboxSelected : ""}`}>
                  <CheckTick />
                </span>
                <span className={styles.checkboxText}>{optionLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (control.type === "select") {
    return (
      <label className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{control.id ?? control.label}</span>
          <span className={styles.fieldValue}>{displayValue}</span>
        </div>
        {control.description ? <p className={styles.fieldDescription}>{control.description}</p> : null}
        <select value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={(event) => onChange(event.target.value)} className={styles.select}>
          {control.options?.map((option) => {
            const optionValue = getOptionValue(option);
            return (
              <option key={String(optionValue)} value={String(optionValue)}>
                {getOptionLabel(option)}
              </option>
            );
          })}
        </select>
      </label>
    );
  }

  if (control.type === "text" || control.type === "string") {
    return (
      <label className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{control.id ?? control.label}</span>
          <span className={styles.fieldValue}>{displayValue}</span>
        </div>
        {control.description ? <p className={styles.fieldDescription}>{control.description}</p> : null}
        <input type="text" value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} className={styles.textInput} />
      </label>
    );
  }

  if (control.type === "textarea" || control.type === "json/list" || control.type === "json") {
    const textValue = typeof value === "string" ? value : JSON.stringify(value ?? "", null, 2);
    return (
      <label className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{control.id ?? control.label}</span>
          <span className={styles.fieldValue}>{control.type}</span>
        </div>
        {control.description ? <p className={styles.fieldDescription}>{control.description}</p> : null}
        <textarea
          value={textValue}
          onChange={(event) => {
            if (control.type === "textarea") return onChange(event.target.value);
            try {
              onChange(JSON.parse(event.target.value) as unknown);
            } catch {
              onChange(event.target.value);
            }
          }}
          className={`${styles.textInput} ${styles.textareaInput}`}
        />
      </label>
    );
  }

  if (control.type === "number") {
    return (
      <label className={styles.field}>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{control.id ?? control.label}</span>
          <span className={styles.fieldValue}>{displayValue}</span>
        </div>
        {control.description ? <p className={styles.fieldDescription}>{control.description}</p> : null}
        <input type="number" min={control.min} max={control.max} step={control.step ?? 1} value={typeof value === "number" ? value : ""} onChange={(event) => onChange(Number(event.target.value))} className={styles.textInput} />
      </label>
    );
  }

  const numberValue = typeof value === "number" ? value : 0;

  return (
    <label className={styles.field}>
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>{control.id ?? control.label}</span>
        <input
          type="number"
          min={control.min}
          max={control.max}
          step={control.step ?? 1}
          value={numberValue}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (!Number.isNaN(nextValue)) onChange(nextValue);
          }}
          onBlur={(event) => {
            const nextValue = Number(event.target.value);
            if (!Number.isNaN(nextValue)) onChange(clampNumber(nextValue, control));
          }}
          className={styles.rangeValueInput}
          aria-label={`${control.label} value`}
        />
      </div>
      {control.description ? <p className={styles.fieldDescription}>{control.description}</p> : null}
      <SmoothRange control={control} value={numberValue} onChange={onChange} />
    </label>
  );
}

// Light JSX colouring for the "Your props" block: tag, prop, value.
function CodeLine({ line }: { line: string }) {
  const tag = line.match(/^(\s*)(<\/?[\w.]+|\/>)(.*)$/);
  if (tag) return <>{tag[1]}<span className={styles.codeTag}>{tag[2]}</span>{tag[3]}</>;
  const prop = line.match(/^(\s*)([\w$]+)=(\{)?(.*?)(\})?$/);
  if (prop) {
    return (
      <>
        {prop[1]}<span className={styles.codeProp}>{prop[2]}</span>=
        {prop[3]}<span className={prop[3] ? styles.codeValue : styles.codeString}>{prop[4]}</span>{prop[5]}
      </>
    );
  }
  return <>{line}</>;
}

export default function RemixerPanel({
  isExpanded,
  groups,
  values,
  onChange,
  onCopyCode,
  onReset,
  defaultOpenGroupId,
  compact = false,
}: RemixerPanelProps & { compact?: boolean }) {
  const availableGroups = useMemo(() => groups.filter((group) => group.controls?.length), [groups]);
  const [openGroupId, setOpenGroupId] = useState<string | null>(
    defaultOpenGroupId ?? availableGroups[0]?.id ?? null,
  );
  const [copied, setCopied] = useState(false);
  // Recomputed each render so it tracks every slider move.
  const code = onCopyCode?.() ?? "";

  const handleCopy = async () => {
    if (!onCopyCode) return;
    await copyTextToClipboard(onCopyCode());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    // compact: tighter spacing / tracking and wrapped code, for narrow columns
    // (the effect page's Playground).
    <aside className={`${styles.panel} ${isExpanded ? styles.panelOpen : ""} ${compact ? styles.compact : ""}`}>
      <div className={`${styles.body} ${styles.hideScrollbar}`} data-lenis-prevent>
        {availableGroups.map((group) => {
          if (group.collapsible === false) {
            return (
              <section key={group.id} className={`${styles.group} ${styles.groupStatic}`}>
                {group.title ? (
                  <div className={styles.groupStaticHeader}>
                    <span className={styles.groupTitle}>{group.title}</span>
                  </div>
                ) : null}
                <div className={styles.groupBodyStatic}>
                  <div className={styles.groupBodyInner}>
                    {group.controls?.map((control) => (
                      <ControlField key={control.id} control={control} value={values[control.id ?? ""]} onChange={(nextValue) => onChange(control.id ?? "", nextValue)} />
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          const isOpen = openGroupId === group.id;
          return (
            <section key={group.id} className={`${styles.group} ${isOpen ? styles.groupOpen : ""}`}>
              <button type="button" onClick={() => setOpenGroupId(isOpen ? null : group.id ?? null)} className={styles.groupTrigger}>
                <span className={styles.groupTitle}>{group.title}</span>
                <ChevronDown className={styles.groupChevron} />
              </button>
              <div className={styles.groupBody}>
                <div className={styles.groupBodyInner}>
                  {group.controls?.map((control) => (
                    <ControlField key={control.id} control={control} value={values[control.id ?? ""]} onChange={(nextValue) => onChange(control.id ?? "", nextValue)} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
        {code ? (
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeTitle}>Your props</span>
              <button type="button" onClick={handleCopy} className={styles.codeCopy}>
                {copied ? <Check className={styles.actionIcon} /> : <Copy className={styles.actionIcon} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className={styles.codePre}>
              <code>
                {code.split("\n").map((line, index) => (
                  <span key={index} className={styles.codeLine}>
                    <CodeLine line={line} />
                  </span>
                ))}
              </code>
            </pre>
          </div>
        ) : null}
      </div>
      <div className={styles.footer}>
        <div className={styles.footerActions}>
          <button type="button" onClick={onReset} className={styles.footerButton}>
            <RotateCcw className={styles.actionIcon} />
            <span className={styles.footerButtonText}>Reset</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
