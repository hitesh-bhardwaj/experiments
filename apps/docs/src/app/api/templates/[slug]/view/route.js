import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemplateBySlug } from "@/lib/mock-templates";
import { recordTemplateView, getTemplateViewCount } from "@/lib/template-views";
import { getRequestIp } from "@/lib/request-ip";

// Fired once per TemplateDetail mount (a real browser render). Deliberately
// not recorded from the [slug]/page.js server component itself -
// TemplateCard's Link uses prefetch={false} but still calls router.prefetch()
// manually on hover (see its handleMouseEnter), which executes the target
// page's server component to warm the cache; counting views there would
// inflate the number every time a visitor merely hovers a card.
export async function POST(request, { params }) {
  const { slug } = await params;

  if (!getTemplateBySlug(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userId } = await auth();
  const ip = getRequestIp(request);

  await recordTemplateView({ templateSlug: slug, clerkUserId: userId, ip });
  const viewCount = await getTemplateViewCount(slug);

  return NextResponse.json({ viewCount });
}
