// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

/**
 *
 * fields: FieldConfig[]
 * Array that drives EVERY form field. Each object can be:
 *

 * onSubmit: async (data: Record<string, any>) => void
 * Called with the collected form data when validation passes.
 * Should throw on failure so the form can show the error banner.
 *
 * submitLabel?: string (default"Submit")
 * loadingLabel?: string (default"Sending...")
 * successMessage?: string (default" Form submitted successfully!")
 * errorMessage?: string (default" Error sending message. Please try again.")
 *
 * schema?: ZodType
 * Optional Zod schema for the whole form. When provided it becomes the
 * source of truth for validation and its messages are mapped back onto
 * fields by name (schema key === field.name). The built-in checks below
 * are used only when no schema is supplied.
 *
 * Built-in validation (fallback when no `schema` is passed)
 * - required fields checked automatically
 * - email fields validated with regex
 * - phone fields validated for minimum length
 * - Each field can supply its own `validate(value) => string | undefined`

 */

import React, {
  useCallback,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import type { ZodType } from "zod";
import Input from "./Input";
import Textarea from "./Textarea";
import Select, { type SelectOption } from "./Select";
import PhoneInput from "./PhoneInput";
import Checkbox from "./Checkbox";
import DotFillBtn from "../dot-fill-button/DotFillButton";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FieldConfig {
  type: string;
  name: string;
  label?: ReactNode;
  required?: boolean;
  defaultCountry?: string;
  options?: SelectOption[];
  rows?: number;
  validate?: (value: any) => string | undefined;
}

function defaultValidate(field: FieldConfig, value: any): string | undefined {
  if (field.required && (value === "" || value === false || value == null)) {
    return `${typeof field.label === "string" ? field.label.replace("*", "") : "This field"} is required.`;
  }
  if (field.type === "email" && value && !EMAIL_RE.test(value)) {
    return "Invalid email address.";
  }
  if (field.type === "phone" && value && value.replace(/\D/g, "").length < 7) {
    return "Invalid phone number.";
  }
  return undefined;
}

function buildInitialValues(fields: FieldConfig[]): Record<string, any> {
  const values: Record<string, any> = {};
  for (const f of fields) {
    if (f.type === "checkbox") values[f.name] = false;
    else if (f.type === "select") values[f.name] = "";
    else values[f.name] = "";
  }
  return values;
}

export interface ContactFormProps {
  fields?: FieldConfig[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  schema?: ZodType<any>;
  submitLabel?: string;
  loadingLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  accentColor?: string;
  textColor?: string;
  inputBackgroundColor?: string;
  fieldBorderColor?: string;
  inputRoundedness?: number;
  duration?: number;
}

// component
export default function ContactForm({
  fields = [],
  onSubmit,
  schema,
  submitLabel = "Submit",
  loadingLabel = "Sending...",
  successMessage = " Form submitted successfully!",
  errorMessage = " Error sending message. Please try again.",
  accentColor = "#111111",
  textColor = "#111111",
  inputBackgroundColor = "#ffffff",
  fieldBorderColor = "#e5e7eb",
  inputRoundedness = 28,
  duration = 0.3,
}: ContactFormProps) {
  const [values, setValues] = useState(() => buildInitialValues(fields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);
  const uid = useId().replace(/:/g, "");
  const sectionId = `contact-form-${uid}`;
  const formRef = useRef<HTMLFormElement | null>(null);

  // ── value helpers ──
  const setValue = useCallback((name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const clearError = useCallback((name: string) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  // ── per-field validation ──
  const validateField = useCallback((field: FieldConfig, value: any) => {
    // Run built-in checks first
    const builtIn = defaultValidate(field, value);
    if (builtIn) return builtIn;
    // Then custom validator
    if (field.validate) return field.validate(value);
    return undefined;
  }, []);

  // ── full-form validation ──
  // Returns { valid, data } where `data` is Zod's parsed (coerced/trimmed)
  // output when a schema is used, or the raw values otherwise.
  const validateAll = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (schema) {
      // Zod is the source of truth: map the first issue per field by name.
      const result = schema.safeParse(values);
      if (result.success) {
        setErrors(newErrors);
        return { valid: true, data: result.data };
      }
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string | number | undefined;
        if (key != null && !newErrors[key]) newErrors[key] = issue.message;
      }
    } else {
      for (const f of fields) {
        const err = validateField(f, values[f.name]);
        if (err) newErrors[f.name] = err;
      }
    }

    setErrors(newErrors);
    return { valid: Object.keys(newErrors).length === 0, data: values };
  }, [fields, values, validateField, schema]);

  // ── submit ──
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const { valid, data } = validateAll();
      if (!valid) return;

      setIsLoading(true);
      setFailed(false);

      try {
        await onSubmit(data);
        setSubmitted(true);
        setValues(buildInitialValues(fields));
        setTimeout(() => setSubmitted(false), 7000);
      } catch {
        setFailed(true);
        setTimeout(() => setFailed(false), 7000);
      } finally {
        setIsLoading(false);
      }
    },
    [fields, validateAll, onSubmit],
  );

  // ── render field ──
  const renderField = (field: FieldConfig) => {
    const { name, type, label, options, rows, defaultCountry } = field;
    const value = values[name];
    const error = errors[name];

    const commonChange = (val: any) => {
      setValue(name, val);
      clearError(name);
    };

    switch (type) {
      case "textarea":
        return (
          <Textarea
            key={name}
            id={name}
            label={label}
            rows={rows}
            value={value}
            onChange={(e) => commonChange(e.target.value)}
            error={error}
          />
        );

      case "select":
        return (
          <Select
            key={name}
            id={name}
            label={label as string | undefined}
            options={options || []}
            value={value}
            onChange={(e) => commonChange(e.target.value)}
            error={error}
          />
        );

      case "phone":
        return (
          <PhoneInput
            key={name}
            id={name}
            label={label as string | false | undefined}
            value={value}
            onChange={(val) => commonChange(val)}
            defaultCountry={defaultCountry || "IN"}
            error={error}
          />
        );

      case "checkbox":
        return (
          <Checkbox
            key={name}
            id={name}
            label={label}
            checked={!!value}
            onChange={(checked) => commonChange(checked)}
            error={error}
          />
        );

      // text | email | url | number | password |
      default:
        return (
          <Input
            key={name}
            id={name}
            label={label}
            type={type || "text"}
            value={value}
            onChange={(e) => commonChange(e.target.value)}
            error={error}
          />
        );
    }
  };

  return (
    <section
      className="h-full w-full"
      id={sectionId}
      style={
        {
          "--form-accent": accentColor,
          "--form-text": textColor,
          "--form-input-bg": inputBackgroundColor,
          "--form-field-border": fieldBorderColor,
          "--form-input-radius": `${Math.max(0, Number(inputRoundedness) || 0)}px`,
          "--form-duration": `${Math.max(0.05, Number(duration) || 0.3)}s`,
        } as CSSProperties & Record<`--${string}`, string>
      }
    >
      <style>{`
 #${sectionId} input,
 #${sectionId} textarea,
 #${sectionId} select,
 #${sectionId} [role="button"][aria-invalid],
 #${sectionId} button[id] {
   background-color: var(--form-input-bg);
   border-color: var(--form-field-border);
   border-radius: var(--form-input-radius);
   color: var(--form-text);
   transition-duration: var(--form-duration);
 }
 #${sectionId} input:focus,
 #${sectionId} textarea:focus,
 #${sectionId} button[id]:focus {
   border-color: #ff5f00;
 }
 #${sectionId} .text-gray-700,
 #${sectionId} .text-gray-600 {
   color: var(--form-text);
 }
 #${sectionId} [role="checkbox"][aria-checked="true"] {
   background-color: var(--form-accent);
   border-color: var(--form-accent);
 }
 `}</style>
      <div className="w-full h-full">
        <div className="w-full flex flex-col gap-[2vw]">
          <form
            ref={formRef}
            autoComplete="off"
            className="space-y-[1.2vw] max-md:space-y-[4vw] max-[1025px]:space-y-[4vw]"
            onSubmit={handleSubmit}
          >
            {fields.map((field) => renderField(field))}

            {/* Real submit button, visually hidden - DotFillBtn below
                renders a link, not a native <button type="submit">, so
                without this the form has no "default button" and pressing
                Enter in a field does nothing. This gives the browser's own
                native Enter-submits-the-form behavior a real target,
                exactly equivalent to clicking Send. Out of tab order
                (tabIndex=-1) so keyboard users don't land on an invisible
                duplicate of the visible button below. */}
            <button type="submit" disabled={isLoading} className="hidden" aria-hidden="true" tabIndex={-1} />

            <div className="flex items-center justify-start  max-md:mt-[10vw]">
              <DotFillBtn
                btnText={isLoading ? loadingLabel : submitLabel}
                href="#"
                textClassName="text-[1.2vw] max-md:text-[4vw] max-[1025px]:text-[2.5vw]"
                aria-disabled={isLoading}
                onClick={(e) => {
                  e.preventDefault();
                  if (isLoading) return;
                  formRef.current?.requestSubmit();
                }}
                className="mt-[2vw] max-md:mt-0 max-[1025px]:mt-[3vw]"
                bgColor={`linear-gradient(to right, ${accentColor}, #E61416)`}
                dotColor="#ffffff"
                textColor="#ffffff"
                hoverTextColor="#111111"
              />
            </div>

            {submitted && (
              <p className="text-green-600 text-sm mt-2">{successMessage}</p>
            )}
            {failed && (
              <p className="text-red-600 text-sm mt-2">{errorMessage}</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
