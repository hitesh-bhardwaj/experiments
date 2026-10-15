-- Security audit H1: sent_emails held every sign-in / sign-up / reset code
-- (in the subject or body), readable by any admin from the email log.
-- New rows are masked at write time (src/lib/resend.js) and the admin route
-- masks old rows on read (src/lib/email-redaction.js); this removes the codes
-- from the rows already stored. No migration tooling exists in this repo -
-- run this once in the Supabase SQL editor. Safe to re-run.
update sent_emails
set
  subject = regexp_replace(subject, '[0-9]{4,8}', '••••••', 'g'),
  html_content = null,
  text_content = 'Hidden: this email contained a one-time code.'
where email_type in ('verification_code', 'reset_password_code', 'password_reset_otp', 'magic_link');
