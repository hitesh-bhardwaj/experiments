// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import { z } from "zod";
import ContactForm, { type FieldConfig } from "./ContactForm";

const FIELDS: FieldConfig[] = [
 { type: "text", name: "name", label: "Your Name*", required: true },
 { type: "email", name: "email", label: "Email Address*", required: true },
 { type: "text", name: "phone", label: "Phone Number*", required: true },
 {
 type: "select",
 name: "service",
 label: "Select a Service*",
 required: true,
 options: [
 { value: "cleaning", label: "Cleaning" },
 { value: "ac-appliance", label: "AC & Appliance" },
 { value: "plumbing", label: "Plumbing" },
 { value: "painting", label: "Painting" },
 { value: "electrical", label: "Electrical" },
 { value: "other", label: "Other" },
 ],
 },
 { type: "text", name: "message", label: "Tell Us More" },
];

// Optional +, code, 7-15 digits
const isValidPhone = (val: string): boolean => {
 const digits = val.replace(/\D/g, "");
 return digits.length >= 7 && digits.length <= 15;
};

const contactSchema = z.object({
 name: z
 .string()
 .trim()
 .min(1, "Your name is required.")
 .min(2, "Name must be at least 2 characters."),
 email: z
 .string()
 .trim()
 .min(1, "Email address is required.")
 .pipe(z.email("Please enter a valid email address.")),
 phone: z
 .string()
 .trim()
 .min(1, "Phone number is required.")
 .refine(isValidPhone, { message: "Please enter a valid phone number." }),
 service: z.enum(
 ["cleaning", "ac-appliance", "plumbing", "painting", "electrical", "other"],
 { message: "Please select a service." },
 ),
 message: z.string().trim().max(1000, "Message is too long.").optional(),
});

async function submitHandler(data: Record<string, any>) {
 console.log("Kyntra enquiry submitted:", data);
}

export default function AnimatedForm() {
 return (
 <div className="grid w-full grid-cols-2 items-start gap-[4vw] max-[1025px]:grid-cols-1 max-[1025px]:gap-[8vw] pt-[5vh]">
 {/* Left column: heading and copy */}
 <div className="max-[1025px]:pr-0 pr-[2vw]">
 <h2 className="font-helvetica-neue text-70 font-medium leading-[1.08] tracking-tight text-white max-[1025px]:text-[8vw] max-md:text-[9vw]">
 Let&rsquo;s Take Care
 <br />
 of Your Home
 </h2>
 <p className="mt-[2.5vw] w-[28vw] font-aeonik-pro text-22 leading-[1.6] text-white max-[1025px]:mt-[5vw] max-[1025px]:w-full max-[1025px]:text-[3.2vw] max-md:text-[4vw]">
 Have a question, need help with a service, or want to know more about
 Kyntra? Tell us what you need and our team will get back to you.
 </p>
 </div>

 {/* Right column: form */}
 <div className="w-full">
 <ContactForm
 fields={FIELDS}
 schema={contactSchema}
 onSubmit={submitHandler}
 submitLabel="Send Message"
 />
 </div>
 </div>
 );
}
