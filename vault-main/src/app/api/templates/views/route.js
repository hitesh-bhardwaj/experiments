import { NextResponse } from "next/server";
import { TEMPLATES } from "@/lib/mock-templates";
import { getTemplateViewCounts } from "@/lib/template-views";

// View counts for the static templates pages, which load them in the browser.
// GET /api/templates/views?slugs=a,b - unknown slugs are ignored.
export async function GET(request) {
  const known = new Set(TEMPLATES.map((t) => t.slug));
  const slugs = (request.nextUrl.searchParams.get("slugs") || "")
    .split(",")
    .filter((slug) => known.has(slug));

  const counts = await getTemplateViewCounts(slugs).catch(() => ({}));
  // Shared by every visitor: the CDN may reuse it for a minute.
  return NextResponse.json(counts, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
