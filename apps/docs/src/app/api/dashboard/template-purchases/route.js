import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { TEMPLATES } from "@/lib/mock-templates";
import { getTemplateAccessDecision } from "@/lib/template-access";

// User-scoped sibling to api/admin/template-purchases/route.js - this one
// lists the current user's OWN downloadable templates (purchased, or
// included via an active annual-Pro subscription) for the dashboard's
// "My Templates" tab, no super-admin gate.
//
// Access is re-derived per template through getTemplateAccessDecision() -
// the same function the actual gated download route
// (api/templates/[slug]/download) checks - rather than re-deriving similar
// logic here, so this tab can never show a template the download route
// would then refuse (or the reverse).
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: purchaseRows, error: purchaseError } = await supabase
      .from("template_purchases")
      .select("template_slug, amount, currency, created_at")
      .eq("clerk_user_id", userId);

    if (purchaseError) {
      console.error("DASHBOARD_TEMPLATE_PURCHASES_ERROR:", purchaseError);
      return NextResponse.json({ error: purchaseError.message }, { status: 500 });
    }

    const purchaseByTemplateSlug = new Map(
      (purchaseRows || []).map((row) => [row.template_slug, row])
    );

    const decisions = await Promise.all(
      TEMPLATES.map((template) =>
        getTemplateAccessDecision({
          clerkUserId: userId,
          templateSlug: template.slug,
          includedInAnnualPro: template.pricing?.includedInAnnualPro ?? false,
        })
      )
    );

    const templates = TEMPLATES.map((template, index) => {
      const decision = decisions[index];
      if (!decision.allowed) return null;

      const purchase = purchaseByTemplateSlug.get(template.slug) || null;

      return {
        slug: template.slug,
        title: template.title,
        category: template.category,
        tagline: template.tagline,
        screenshots: template.screenshots,
        href: template.href,
        previewHref: template.previewHref,
        downloadHref: `/api/templates/${template.slug}/download`,
        accessReason: decision.reason,
        purchasedAt: purchase?.created_at || null,
        purchaseAmount: purchase?.amount ?? null,
        purchaseCurrency: purchase?.currency ?? null,
      };
    }).filter(Boolean);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("DASHBOARD_TEMPLATE_PURCHASES_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
