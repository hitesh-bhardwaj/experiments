// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import { z } from "zod";
import ContactForm, { type FieldConfig } from "./ContactForm";

const FIELDS: FieldConfig[] = [
 { type:"text", name:"name", label:"Name*", required: true },
 { type:"email", name:"email", label:"Business Email*", required: true },
 { type:"phone", name:"phone", label:"Phone*", required: true, defaultCountry:"IN" },
 {
 type:"select",
 name:"topic",
 label:"Topic*",
 required: true,
 options: [
 { value:"general", label:"General Inquiry" },
 { value:"partnership", label:"Partnership" },
 ],
 },
 { type:"textarea", name:"message", label:"Your message", rows: 4 },
 {
 type:"checkbox",
 name:"terms",
 required: true,
 label: <>I agree to the <a href="#" className="underline">Terms</a>.</>,
 },
];

// Phone values are stored as "+<dial> <number>" (e.g. "+91 9876543210").
// Strip the leading dial code so we count only the national number's digits.
const nationalDigits = (val: string): string => val.replace(/^\+\d+\s*/, "").replace(/\D/g, "");

// Valid national-number digit ranges per dial code (E.164, trunk prefix
// excluded). A single "exactly 10" rule rejects every valid number from
// Ireland, Australia, France, the UAE and Singapore.
const NATIONAL_LENGTH_BY_DIAL: Record<string, [number, number]> = {
 "+91": [10, 10], // India
 "+353": [7, 9], // Ireland
 "+1": [10, 10], // US / Canada
 "+44": [9, 10], // United Kingdom
 "+61": [9, 9], // Australia
 "+49": [7, 11], // Germany
 "+33": [9, 9], // France
 "+971": [8, 9], // United Arab Emirates
 "+65": [8, 8], // Singapore
};

// Countries where people habitually type the leading trunk "0"
// (e.g. UK 07123 456789) - drop it before checking the length.
const TRUNK_ZERO_DIALS = new Set(["+44", "+353", "+61", "+49", "+33", "+971"]);

const isValidPhone = (val: string): boolean => {
 const dial = val.match(/^(\+\d+)\s/)?.[1];
 let digits = nationalDigits(val);

 if (dial && TRUNK_ZERO_DIALS.has(dial) && digits.startsWith("0")) {
 digits = digits.slice(1);
 }

 // Unknown dial code (custom countries prop): fall back to E.164 bounds.
 const [min, max] = NATIONAL_LENGTH_BY_DIAL[dial as string] ?? [6, 14];
 return digits.length >= min && digits.length <= max;
};

const contactSchema = z.object({
 name: z
 .string()
 .trim()
 .min(1, "Name is required.")
 .min(2, "Name must be at least 2 characters."),
 email: z
 .string()
 .trim()
 .min(1, "Business Email is required.")
 .pipe(z.email("Please enter a valid email address.")),
 phone: z
 .string()
 .trim()
 .min(1, "Phone is required.")
 .refine(isValidPhone, {
 message: "Please enter a valid phone number for the selected country.",
 }),
 topic: z.enum(["general", "partnership"], {
 message: "Please select a topic.",
 }),
 message: z.string().trim().max(1000, "Message is too long.").optional(),
 terms: z.literal(true, {
 message: "You must agree to the Terms.",
 }),
});

async function submitHandler(data: Record<string, any>) {
 console.log("Contact form submitted:", data);
}

export default function AnimatedForm({
 accentColor = "#111111",
 backgroundColor = "#ffffff",
 textColor = "#111111",
 inputBackgroundColor = "#ffffff",
 fieldBorderColor = "#e5e7eb",
 inputRoundedness = 28,
 duration = 0.3,
}) {
 return (
 <main className="w-full min-h-screen mx-auto py-20 max-[1025px]:pt-28 px-6" style={{ backgroundColor }}>
  <div className="w-[50%] max-[1025px]:w-[90%] max-md:w-[95%] mx-auto">  <h1 className="text-3xl mb-8" style={{ color: textColor }}>Get in touch</h1>
 <ContactForm
 fields={FIELDS}
 schema={contactSchema}
 onSubmit={submitHandler}
 submitLabel="Send Message"
 accentColor={accentColor}
 textColor={textColor}
 inputBackgroundColor={inputBackgroundColor}
 fieldBorderColor={fieldBorderColor}
 inputRoundedness={inputRoundedness}
 duration={duration}
 />
 </div>
 </main>
 );
}
