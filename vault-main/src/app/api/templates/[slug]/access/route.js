import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemplateBySlug } from "@/lib/mock-templates";
import { getTemplateAccessDecision } from "@/lib/template-access";

// The visitor's access to one template, for the cached (ISR) detail page,
// which can't read the session on the server. The download route re-checks
// access itself, so this only drives the Buy / Download button.
export async function GET(request, { params }) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userId } = await auth();
  const access = await getTemplateAccessDecision({
    clerkUserId: userId,
    templateSlug: slug,
    includedInAnnualPro: template.pricing?.includedInAnnualPro ?? false,
  }).catch(() => ({ allowed: false, reason: "error" }));

  return NextResponse.json(access, { headers: { "Cache-Control": "private, no-store" } });
}
