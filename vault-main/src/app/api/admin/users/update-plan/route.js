import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertSuperAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/resend";
import {
  renderProUnlockedEmail,
  proUnlockedSubject,
  proUnlockedText,
} from "@/lib/emails/pro-unlocked-email";

// Manually-granted pro (no real Razorpay subscription behind it) has no
// webhook to ever expire it - it must carry its own period_end so
// getUserPlan()/getEffectAccessDecision() cut it off on their own, the same
// way they already do for real subscriptions.
function computePeriodEnd(billingInterval) {
  const end = new Date();

  if (billingInterval === "monthly") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }

  return end.toISOString();
}

// Matches the "Vault Pro Monthly" / "Vault Pro Annual" wording pro-access.js
// uses for real Razorpay plan_ids - a manual grant has no plan_id to derive
// this from, so it's built directly from the chosen interval instead.
const PLAN_LABELS = {
  monthly: "Vault Pro Monthly",
  yearly: "Vault Pro Annual",
};

export async function POST(request) {
  if (!(await assertSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { clerkUserId, plan, billingInterval } = await request.json();

    if (!clerkUserId || !["free", "pro"].includes(plan)) {
      return NextResponse.json(
        { error: "clerkUserId and plan (free|pro) are required." },
        { status: 400 }
      );
    }

    if (plan === "pro" && !["monthly", "yearly"].includes(billingInterval)) {
      return NextResponse.json(
        { error: "billingInterval (monthly|yearly) is required when granting pro." },
        { status: 400 }
      );
    }

    const newStatus = plan === "pro" ? "active" : "inactive";
    const currentPeriodEnd = plan === "pro" ? computePeriodEnd(billingInterval) : null;

    // Downgrading to free must kill any existing CLI token outright, not
    // just rely on verifyCliToken's plan check - otherwise a later
    // re-upgrade without a fresh `npx hyperiux login` would silently
    // reactivate the old token.
    const revokeFields =
      plan === "free"
        ? {
            cli_token_hash: null,
            cli_token_revoked_at: new Date().toISOString(),
          }
        : {};

    // Update Supabase
    const { error: supabaseError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          clerk_user_id: clerkUserId,
          plan,
          status: newStatus,
          billing_interval: plan === "pro" ? billingInterval : null,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
          ...revokeFields,
        },
        { onConflict: "clerk_user_id" }
      );

    if (supabaseError) {
      console.error("ADMIN_UPDATE_PLAN_SUPABASE_ERROR:", supabaseError);
      return NextResponse.json({ error: supabaseError.message }, { status: 500 });
    }

    // Update Clerk publicMetadata - mirrors the shape markUserProFromSubscription
    // writes for real subscriptions, so both grant paths look the same downstream.
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        plan,
        proAccess: plan === "pro",
        billingInterval: plan === "pro" ? billingInterval : null,
        currentPeriodEnd,
      },
    });

    // Same welcome email a real first purchase sends - never blocks the
    // actual grant if it fails, matching sendInvoiceEmail's posture in
    // pro-access.js.
    if (plan === "pro") {
      try {
        const clerkUser = await clerk.users.getUser(clerkUserId);
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress;

        if (email) {
          const planLabel = PLAN_LABELS[billingInterval] || "Vault Pro";

          await sendEmail({
            to: email,
            subject: proUnlockedSubject,
            react: renderProUnlockedEmail({ planLabel, isAdminGrant: true }),
            text: proUnlockedText({ planLabel, isAdminGrant: true }),
            emailType: "pro_unlocked",
          });
        }
      } catch (emailError) {
        console.error("ADMIN_UPDATE_PLAN_EMAIL_ERROR:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      plan,
      status: newStatus,
      billingInterval: plan === "pro" ? billingInterval : null,
      currentPeriodEnd,
    });
  } catch (error) {
    console.error("ADMIN_UPDATE_PLAN_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
