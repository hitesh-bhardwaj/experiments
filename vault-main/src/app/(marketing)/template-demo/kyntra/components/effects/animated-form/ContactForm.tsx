// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useState, useCallback, useId, useRef, type CSSProperties, type FormEvent, type ReactNode } from "react";
import type { ZodType } from "zod";
import Input from "./Input";
import Textarea from "./Textarea";
import Select, { type SelectOption } from "./Select";
import PhoneInput from "./PhoneInput";
import Checkbox from "./Checkbox";
import CharStaggerPrimaryButton from "../char-stagger-primary-button";

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
}

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
}: ContactFormProps) {
 const [values, setValues] = useState(() => buildInitialValues(fields));
 const [errors, setErrors] = useState<Record<string, string>>({});
 const [isLoading, setIsLoading] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [failed, setFailed] = useState(false);
 const submitRef = useRef<HTMLButtonElement | null>(null);
 const uid = useId().replace(/:/g, "");
 const sectionId = `contact-form-${uid}`;

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

 const validateField = useCallback(
 (field: FieldConfig, value: any) => {
 // Built-in checks first
 const builtIn = defaultValidate(field, value);
 if (builtIn) return builtIn;
 // Then the custom validator
 if (field.validate) return field.validate(value);
 return undefined;
 },
 []
 );

 const validateAll = useCallback(() => {
 const newErrors: Record<string, string> = {};

 if (schema) {

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
 className="w-full"
 id={sectionId}
 style={{
 "--form-accent": accentColor,
 "--form-text": textColor,
 "--form-input-bg": inputBackgroundColor,
 "--form-field-border": fieldBorderColor,
 "--form-input-radius": `${Math.max(0, Number(inputRoundedness) || 0)}px`,
 "--form-duration": `${Math.max(0.05, Number(duration) || 0.3)}s`,
 } as CSSProperties & Record<`--${string}`, string>}
 >
 <style>{`
 #${sectionId} input:-webkit-autofill,
 #${sectionId} textarea:-webkit-autofill {
   -webkit-text-fill-color: #ffffff;
   -webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.05) inset;
   transition: background-color 9999s ease-in-out 0s;
 }
 #${sectionId} input::placeholder,
 #${sectionId} textarea::placeholder {
   color: transparent;
 }
 #${sectionId} button[type="submit"] {
   transition-duration: var(--form-duration);
 }
 `}</style>
 <div className="w-full">
 <div className="w-full flex flex-col gap-[2vw]">
 <form
 autoComplete="off"
 className="space-y-[1vw] max-[1025px]:space-y-[3.5vw]"
 onSubmit={handleSubmit}
 >
 {fields.map((field, index) => (
 // Stacking order only; form fades once
 <div
 key={field.name}
 className="relative"
 style={{ zIndex: fields.length - index }}
 >
 {renderField(field)}
 </div>
 ))}

 <div className="relative flex items-center justify-start pt-[0.8vw] max-[1025px]:pt-[3vw]" style={{ zIndex: 0 }}>
 {/* Renders an anchor; cannot self-submit */}
 <button ref={submitRef} type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
 <CharStaggerPrimaryButton
 text={isLoading ? loadingLabel : submitLabel}
 href="#"
 onClick={(event) => {
 event.preventDefault();
 if (isLoading) return;
 submitRef.current?.click();
 }}
 hoverColor="#000000"
 showArrow
 className={`rounded-full bg-white px-[1.8vw] py-[0.7vw] text-black max-[1025px]:px-[6vw] max-[1025px]:py-[3vw] ${
 isLoading ? "pointer-events-none opacity-70" : ""
 }`}
 textClassName="font-aeonik-pro text-22 tracking-tight"
 iconClassName="text-black"
 />
 </div>

 {submitted && (
 <p className="mt-[0.6vw] font-aeonik-pro text-[0.9vw] text-green-400 max-[1025px]:mt-[2vw] max-[1025px]:text-[2.8vw] max-md:text-[3.4vw]">{successMessage}</p>
 )}
 {failed && (
 <p className="mt-[0.6vw] font-aeonik-pro text-[0.9vw] text-red-400 max-[1025px]:mt-[2vw] max-[1025px]:text-[2.8vw] max-md:text-[3.4vw]">{errorMessage}</p>
 )}
 </form>
 </div>
 </div>
 </section>
 );
}
