import { WorkWithHyperiuxEmail } from "@/components/WebsiteComps/emailTemplate/WorkWithHyperiuxEmail";
import { WorkWithHyperiuxConfirmationEmail } from "@/components/WebsiteComps/emailTemplate/WorkWithHyperiuxConfirmationEmail";
import { sendEmail } from "@/lib/resend";
import { isBlockedEmailDomain } from "@/lib/blocked-email-domains";
import { verifyRecaptcha } from "@/lib/recaptcha";

function validatePayload(body) {
  const errors = {};

  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim();
  const number = String(body?.number || "").trim();
  const message = String(body?.message || "").trim();

  if (!name || name.length < 2) errors.name = "Name is required.";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "A valid email is required.";
  else if (isBlockedEmailDomain(email)) errors.email = "Please use a work or personal email address.";
  if (!number || !/^[+()\-.\s0-9]{7,24}$/.test(number)) errors.number = "A valid phone number is required.";
  if (!message || message.length < 10) errors.message = "Message must be at least 10 characters.";

  return { errors, values: { name, email, number, message } };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { errors, values } = validatePayload(body);

    if (Object.keys(errors).length > 0) {
      return Response.json({ error: "Please check the form fields.", errors }, { status: 400 });
    }

    const { success: recaptchaOk } = await verifyRecaptcha(
      body?.recaptchaToken,
      "work_with_hyperiux"
    );

    if (!recaptchaOk) {
      return Response.json(
        { error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const teamEmail = await sendEmail({
      to: process.env.RESEND_FROM_EMAIL,
      subject: `New work enquiry from ${values.name}`,
      react: WorkWithHyperiuxEmail(values),
      replyTo: values.email,
      emailType: "work_with_hyperiux",
    });

    const confirmationEmail = await sendEmail({
      to: values.email,
      subject: "We received your enquiry - Hyperiux",
      react: WorkWithHyperiuxConfirmationEmail({ name: values.name, message: values.message }),
      emailType: "work_with_hyperiux_confirmation",
    });

    if (!teamEmail.success) {
      return Response.json({ error: "Failed to send request." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Work with Hyperiux form API error:", error);
    return Response.json({ error: "Failed to send request." }, { status: 500 });
  }
}
