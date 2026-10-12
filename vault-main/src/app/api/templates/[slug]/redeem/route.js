import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getTemplateBySlug } from "@/lib/mock-templates";
import { getUserPlanInfo } from "@/lib/subscription";
import { canRedeemCatalogue } from "@/lib/plans";
import { redeemTemplateCredit } from "@/lib/template-credits";

// Spends one template credit on this template. Credits need an active plan
// (they roll over while it lasts); Pro credits only cover the "selected"
// catalogue, Pro+ credits cover every template. The spend itself is atomic
// in the redeem_template_credit RPC (sql/pro_plus_plans.sql), and a redeemed
// template is a template_purchases row, so it's kept after cancelling.
export async function POST(_req, { params }) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan, tier } = await getUserPlanInfo(userId);

  if (plan !== "pro") {
    return NextResponse.json(
      { error: "Template credits come with Pro and Pro+.", reason: "no-plan" },
      { status: 403 }
    );
  }

  if (!canRedeemCatalogue(tier, template.catalogue)) {
    return NextResponse.json(
      { error: "This template is in the full catalogue. Pro+ credits unlock it.", reason: "needs-pro-plus" },
      { status: 403 }
    );
  }

  const result = await redeemTemplateCredit({ clerkUserId: userId, templateSlug: slug });

  if (result.status === "redeemed") {
    return NextResponse.json({ redeemed: true, balance: result.balance });
  }

  if (result.status === "already-owned") {
    return NextResponse.json(
      { error: "You already own this template.", reason: "already-owned", balance: result.balance },
      { status: 409 }
    );
  }

  if (result.status === "no-credits") {
    return NextResponse.json(
      { error: "You have no template credits left.", reason: "no-credits", balance: result.balance },
      { status: 402 }
    );
  }

  return NextResponse.json({ error: "Could not redeem the credit. Please try again." }, { status: 500 });
}
