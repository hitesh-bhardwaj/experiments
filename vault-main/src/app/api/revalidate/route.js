import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { SANITY_BLOG_TAG, SANITY_EFFECTS_TAG } from "@/lib/sanity";

// Sanity publish webhook: clears the cached effects / blog content straight away
// instead of waiting out SANITY_REVALIDATE. Configure the webhook in Sanity to
// POST here with header `x-revalidate-secret: <SANITY_REVALIDATE_SECRET>` and a
// projection that includes `_type`.
const TAGS_BY_TYPE = {
  effectContent: [SANITY_EFFECTS_TAG],
};

export async function POST(request) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  // Anything that isn't an effect document is blog content (posts, authors, categories).
  const tags = TAGS_BY_TYPE[body?._type] || [SANITY_BLOG_TAG];
  // "max": visitors keep getting the cached page while the fresh one builds.
  for (const tag of tags) revalidateTag(tag, "max");

  return NextResponse.json({ revalidated: tags });
}
