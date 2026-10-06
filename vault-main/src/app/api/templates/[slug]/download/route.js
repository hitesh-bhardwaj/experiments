import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getTemplateBySlug } from "@/lib/mock-templates";
import { getTemplateAccessDecision } from "@/lib/template-access";
import { getTemplateScaffoldUrl } from "@/lib/template-scaffolds";

// Gated download - access is re-checked on every request here, not just
// hidden behind the "Download Zip" button's UI state (QC §13 [BLOCK]: "the
// gated download route never serves the zip via a public/static path").
// The Vercel Blob URL itself is never exposed to the client - this route
// fetches it server-side and streams the bytes back through this
// authenticated URL, which is the only URL the browser ever sees.
export async function GET(_req, { params }) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getTemplateAccessDecision({
    clerkUserId: userId,
    templateSlug: slug,
    includedInAnnualPro: template.pricing?.includedInAnnualPro ?? false,
  });

  if (!access.allowed) {
    return NextResponse.json(
      { error: "Purchase required", reason: access.reason },
      { status: 403 }
    );
  }

  const blobUrl = getTemplateScaffoldUrl(slug);

  if (!blobUrl) {
    console.error("TEMPLATE_DOWNLOAD_NO_SCAFFOLD_URL:", slug);
    return NextResponse.json(
      { error: "This template's download isn't available yet" },
      { status: 503 }
    );
  }

  // no-store: this route's own response is already private/no-store (see
  // the response headers below); this just stops Next's fetch-caching
  // layer from independently caching the upstream blob fetch across
  // requests/deploys.
  const blobResponse = await fetch(blobUrl, { cache: "no-store" });

  if (!blobResponse.ok || !blobResponse.body) {
    console.error("TEMPLATE_DOWNLOAD_BLOB_FETCH_ERROR:", slug, blobResponse.status);
    return NextResponse.json(
      { error: "Failed to fetch template download" },
      { status: 502 }
    );
  }

  return new NextResponse(blobResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
