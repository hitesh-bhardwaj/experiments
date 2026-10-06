import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_APP_URL = "https://vault.hyperiux.com";
const EFFECTS_PATH = "/effects?utm_source=email&utm_medium=invite&utm_campaign=invitations";

// `to` is attacker-controllable (anyone can edit the query string of a link
// that starts with our own domain), so this only ever redirects somewhere
// whose origin matches our own app - never wherever the query string says,
// or this becomes an open-redirect phishing vector.
function resolveSafeDestination(toParam, appUrl) {
  if (!toParam) return null;
  try {
    const target = new URL(toParam);
    return target.origin === new URL(appUrl).origin ? target : null;
  } catch {
    return null;
  }
}

// Public click-tracking redirect for email CTAs - not admin-gated, since the
// people hitting this are email recipients, not logged-in admins. `id` is a
// sent_emails row id generated up front by the invite route; marking it
// clicked here is best-effort and never blocks the redirect.
export async function GET(request, { params }) {
  const { id } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
  const { searchParams } = new URL(request.url);
  const destination =
    resolveSafeDestination(searchParams.get("to"), appUrl) || new URL(EFFECTS_PATH, appUrl);

  if (id) {
    supabase
      .from("sent_emails")
      .update({ cta_clicked: true, cta_clicked_at: new Date().toISOString() })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("EMAIL_CTA_CLICK_LOG_ERROR:", error.message);
      });
  }

  return NextResponse.redirect(destination, { status: 307 });
}
