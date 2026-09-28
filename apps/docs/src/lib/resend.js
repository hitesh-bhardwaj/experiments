import "server-only";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Hyperiux Vault <hello@hyperiux.com>";

/**
 * Send an email via Resend and log the result to the sent_emails Supabase table.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plain-text fallback
 * @param {import('react').ReactElement} [options.react] - React email component (for JSX templates)
 * @param {string} [options.emailType] - Logical category e.g. "welcome", "pro_onboarding"
 * @param {string} [options.from] - Override sender address
 * @param {string} [options.replyTo] - Reply-to address
 * @param {string} [options.id] - Pre-generated sent_emails row id, so callers can
 *   embed it in the email content (e.g. a click-tracking link) before the row exists
 */
export async function sendEmail({ to, subject, html, text, react, emailType = "transactional", from, replyTo, id }) {
  let status = "success";
  let errorMessage = null;
  let loggedHtml = html || null;

  try {
    const payload = {
      from: from || FROM_ADDRESS,
      to,
      subject,
      ...(replyTo ? { replyTo } : {}),
    };

    if (react) {
      payload.react = react;
      if (text) payload.text = text;
      // Render to HTML for logging if possible
      try {
        const { render } = await import("@react-email/render");
        loggedHtml = await render(react);
      } catch {
        loggedHtml = null;
      }
    } else {
      if (html) payload.html = html;
      if (text) payload.text = text;
    }

    const { error } = await resend.emails.send(payload);

    if (error) {
      status = "failed";
      errorMessage = error.message || JSON.stringify(error);
      console.error("RESEND_SEND_ERROR:", errorMessage);
    }
  } catch (err) {
    status = "failed";
    errorMessage = err.message || "Unknown error";
    console.error("RESEND_SEND_EXCEPTION:", errorMessage);
  }

  // Log to Supabase asynchronously - never block the caller on this
  supabase
    .from("sent_emails")
    .insert({
      ...(id ? { id } : {}),
      recipient_email: to,
      subject,
      html_content: loggedHtml,
      text_content: text || null,
      email_type: emailType,
      status,
      error_message: errorMessage,
    })
    .then(({ error: logError }) => {
      if (logError) console.error("SENT_EMAIL_LOG_ERROR:", logError.message);
    });

  return { success: status === "success", error: errorMessage };
}
