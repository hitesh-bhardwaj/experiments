
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

import { useState, useCallback, useId, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { ZodType } from "zod";
import Input from "./Input";
import Textarea from "./Textarea";
import Select, { type SelectOption } from "./Select";
import PhoneInput from "./PhoneInput";
import Checkbox from "./Checkbox";
import Button from "./Button";


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
 if (field.required && (value ==="" || value === false || value == null)) {
 return `${typeof field.label ==="string" ? field.label.replace("*","") :"This field"} is required.`;
 }
 if (field.type ==="email" && value && !EMAIL_RE.test(value)) {
 return"Invalid email address.";
 }
 if (field.type ==="phone" && value && value.replace(/\D/g,"").length < 7) {
 return"Invalid phone number.";
 }
 return undefined;
}

function buildInitialValues(fields: FieldConfig[]): Record<string, any> {
 const values: Record<string, any> = {};
 for (const f of fields) {
 if (f.type ==="checkbox") values[f.name] = false;
 else if (f.type ==="select") values[f.name] ="";
 else values[f.name] ="";
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
  submitButtonColor?: string;
}

// component
export default function ContactForm({
 fields = [],
 onSubmit,
 schema,
 submitLabel ="Submit",
 loadingLabel ="Sending...",
 successMessage =" Form submitted successfully!",
 errorMessage =" Error sending message. Please try again.",
 accentColor ="#111111",
 textColor ="#111111",
 inputBackgroundColor ="#ffffff",
 fieldBorderColor ="#e5e7eb",
 inputRoundedness = 28,
 duration = 0.3,
 submitButtonColor = "#000000",
}: ContactFormProps) {
 const [values, setValues] = useState(() => buildInitialValues(fields));
 const [errors, setErrors] = useState<Record<string, string>>({});
 const [isLoading, setIsLoading] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [failed, setFailed] = useState(false);
 const uid = useId().replace(/:/g, "");
 const sectionId = `contact-form-${uid}`;

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
 const validateField = useCallback(
 (field: FieldConfig, value: any) => {
 // Run built-in checks first
 const builtIn = defaultValidate(field, value);
 if (builtIn) return builtIn;
 // Then custom validator
 if (field.validate) return field.validate(value);
 return undefined;
 },
 []
 );

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
 [fields, validateAll, onSubmit]
 );

 const handleFormKeyDown = useCallback((event: KeyboardEvent<HTMLFormElement>) => {
 if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

 const target = event.target as HTMLElement | null;
 if (target?.tagName === "TEXTAREA" && event.shiftKey) return;

 event.preventDefault();
 event.currentTarget.requestSubmit();
 }, []);

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
 case"textarea":
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

 case"select":
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

 case"phone":
 return (
 <PhoneInput
 key={name}
 id={name}
 label={label as string | false | undefined}
 value={value}
 onChange={(val) => commonChange(val)}
 defaultCountry={defaultCountry ||"IN"}
 error={error}
 />
 );

 case"checkbox":
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
 type={type ||"text"}
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
 style={{
 "--form-accent": accentColor,
 "--form-text": textColor,
 "--form-input-bg": inputBackgroundColor,
 "--form-field-border": fieldBorderColor,
 "--form-input-radius": `${Math.max(0, Number(inputRoundedness) || 0)}px`,
 "--form-duration": `${Math.max(0.05, Number(duration) || 0.3)}s`,
 "--form-submit-bg": submitButtonColor,
 } as CSSProperties & Record<`--${string}`, string>}
 >
 <style>{`
 #${sectionId} input,
 #${sectionId} textarea,
 #${sectionId} select,
 #${sectionId} [data-phone-field],
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
 #${sectionId} [data-phone-field]:focus-within,
 #${sectionId} button[id]:focus,
 #${sectionId} .group:focus-within input,
 #${sectionId} .group:focus-within textarea {
   border-color: var(--form-accent);
 }
 #${sectionId} label span,
 #${sectionId} .text-gray-700,
 #${sectionId} .text-gray-600 {
   color: var(--form-text);
 }
 #${sectionId} label span {
   background-color: var(--form-input-bg);
 }
 #${sectionId} button[type="submit"] {
   background-color: var(--form-submit-bg);
   border-radius: var(--form-input-radius);
   color: #ffffff;
   transition-duration: var(--form-duration);
 }
 #${sectionId} [role="checkbox"][aria-checked="true"] {
   background-color: var(--form-accent);
   border-color: var(--form-accent);
 }
 `}</style>
 <div className="w-full h-full">
 <div className="w-full flex flex-col gap-[2vw]">
 <form
 autoComplete="off"
 className="space-y-[0.85vw] max-md:space-y-[3vw] max-[1025px]:space-y-[3vw]"
 onKeyDown={handleFormKeyDown}
 onSubmit={handleSubmit}
 >
 {fields.map((field) => renderField(field))}

 <div className="flex items-center justify-start max-md:mt-[6vw]">
 <Button
 type="submit"
 isLoading={isLoading}
 loadingText={loadingLabel}
 className="mt-[2vw] max-md:mt-0 max-[1025px]:mt-[2vw]"
 >
 {submitLabel}
 </Button>
 </div>

 <div aria-live="polite">
 {submitted && (
 <p className="text-green-600 text-sm mt-2">{successMessage}</p>
 )}
 {failed && (
 <p className="text-red-600 text-sm mt-2">{errorMessage}</p>
 )}
 </div>
 </form>
 </div>
 </div>
 </section>
 );
}
