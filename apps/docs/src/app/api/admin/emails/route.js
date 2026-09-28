import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";

// Resend's status column only tells us the invite email was delivered -
// it says nothing about whether the invitation itself is still pending,
// was accepted, revoked, or expired. Clerk is the actual source of truth
// for that, so invitations rows get annotated with it here instead of
// just showing "success" forever regardless of what happened afterward.
async function getInvitationStatusByEmail() {
  const clerk = await clerkClient();
  const { data: invitations } = await clerk.invitations.getInvitationList({
    limit: 500,
  });

  const statusByEmail = new Map();

  // Clerk returns newest-first, so the first hit per email is the most
  // recent invitation - what we want when someone's been invited more than once.
  for (const invitation of invitations || []) {
    const email = invitation.emailAddress?.toLowerCase();
    if (email && !statusByEmail.has(email)) {
      statusByEmail.set(email, invitation.status);
    }
  }

  return statusByEmail;
}

export async function GET(request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);

    // Single email fetch (for HTML preview)
    const id = searchParams.get("id");
    if (id) {
      const { data, error } = await supabase
        .from("sent_emails")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

      return NextResponse.json(data);
    }

    // List with filters
    const emailType = searchParams.get("type") || "";
    const status = searchParams.get("status") || "";
    // 500 matches the page-size ceiling in the admin UI (User Management,
    // the copy-activity log) - a smaller cap here would silently truncate a
    // "500 per page" request while the page's own pagination math still
    // assumed the full page size, skipping rows between pages.
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("sent_emails")
      .select("id, recipient_email, subject, email_type, status, error_message, sent_at, cta_clicked, cta_clicked_at", { count: "exact" })
      .order("sent_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (emailType) query = query.eq("email_type", emailType);
    if (status) query = query.eq("status", status);

    // Delivered/failed counts scoped by the same type/status filters as the
    // page itself, but never paginated - "10 delivered" reading off just the
    // current page's 10 rows (while the header's own total counts all 2257)
    // is exactly the mismatch this fixes.
    function scopedCount(extraStatus) {
      let q = supabase.from("sent_emails").select("id", { count: "exact", head: true });
      if (emailType) q = q.eq("email_type", emailType);
      if (status) q = q.eq("status", status);
      return q.eq("status", extraStatus);
    }

    const [
      { data, error, count },
      { count: successCount, error: successError },
      { count: failedCount, error: failedError },
    ] = await Promise.all([query, scopedCount("success"), scopedCount("failed")]);

    if (error || successError || failedError) {
      return NextResponse.json(
        { error: (error || successError || failedError).message },
        { status: 500 }
      );
    }

    const hasInviteRows = (data || []).some((row) => row.email_type === "invitations");
    const invitationStatusByEmail = hasInviteRows
      ? await getInvitationStatusByEmail()
      : new Map();

    const emails = (data || []).map((row) => {
      if (row.email_type !== "invitations") return row;

      return {
        ...row,
        invitation_status:
          invitationStatusByEmail.get(row.recipient_email?.toLowerCase()) || null,
      };
    });

    return NextResponse.json({
      emails,
      total: count || 0,
      successCount: successCount || 0,
      failedCount: failedCount || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
