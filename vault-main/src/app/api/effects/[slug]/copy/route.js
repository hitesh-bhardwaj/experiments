import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getEffectMetadata, getEffectSource } from "@/lib/registry";
import { getEffectAccessDecision } from "@/lib/effect-access";
import { getInstallLimitDecision, getUnlockedEffectSlugsToday } from "@/lib/install-limit";
import { getSanityEffectSource } from "@/lib/sanity";
import { buildEffectAiPrompt } from "@/lib/effect-ai-prompt";

// Effect page "Get code" dropdown. The page itself never carries source -
// every option that returns code goes through here, after sign-in + Pro
// access checks:
//   jsx / tsx - Sanity jsxCode/tsxCode, and consumes a daily copy slot
//               (same shared bucket as copy-usage, `hyperiux add` and MCP)
//   prompt    - AI prompt built from the registry source; not metered, it
//               only counts once the agent actually installs the effect
// "Copy CLI" and "MCP" contain no source, so the client builds those itself.

const OPTIONS = new Set(["jsx", "tsx", "prompt"]);

function usageFields(result, effectSlugs) {
  return {
    signedIn: true,
    isAdmin: result.reason === "admin",
    plan: result.plan,
    limit: result.limit,
    count: result.count,
    remaining: result.remaining,
    effectSlugs,
  };
}

function findMainSource(effect) {
  const files = effect?.files || [];
  const main = files.find((file) => file.path === (effect.main || "index.tsx")) || files[0];
  return typeof main?.content === "string" ? main.content : null;
}

export async function POST(request, { params }) {
  const { slug } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ allowed: false, signedIn: false }, { status: 401 });
  }

  const { option } = await request.json().catch(() => ({}));

  if (!OPTIONS.has(option)) {
    return NextResponse.json({ allowed: false, error: "Unknown copy option." }, { status: 400 });
  }

  const effectMeta = getEffectMetadata(slug);

  if (!effectMeta) {
    return NextResponse.json({ allowed: false, error: `Effect "${slug}" not found.` }, { status: 404 });
  }

  const sanitySource = option === "prompt" ? null : await getSanityEffectSource(slug);
  const effectTier = sanitySource?.tier ?? effectMeta.tier ?? "pro";
  const access = await getEffectAccessDecision({ effectTier, clerkUserId: userId });

  if (!access.allowed) {
    return NextResponse.json(
      { allowed: false, locked: true, reason: access.reason, error: "Pro subscription required." },
      { status: 403 }
    );
  }

  // Resolve the content before touching the copy limit, so a missing source
  // never burns one of the user's daily slots.
  let content = null;
  let filename = null;

  if (option === "prompt") {
    const effect = getEffectSource(slug);
    const source = findMainSource(effect);
    if (source) content = buildEffectAiPrompt({ effect, source });
  } else {
    content = option === "jsx" ? sanitySource?.jsxCode : sanitySource?.tsxCode;
    filename = `index.${option}`;
  }

  if (!content) {
    return NextResponse.json(
      { allowed: false, error: "This code isn't available yet. Please try again later." },
      { status: 404 }
    );
  }

  if (option === "prompt") {
    return NextResponse.json({ allowed: true, content });
  }

  const result = await getInstallLimitDecision({
    effectSlug: slug,
    effectTier,
    source: "web",
    clerkUserId: userId,
  });

  if (result.reason === "error") {
    return NextResponse.json({ allowed: false, ...usageFields(result, []) }, { status: 500 });
  }

  const effectSlugs = await getUnlockedEffectSlugsToday({ clerkUserId: userId });

  if (!result.allowed) {
    return NextResponse.json({ allowed: false, ...usageFields(result, effectSlugs) }, { status: 429 });
  }

  return NextResponse.json({ allowed: true, content, filename, ...usageFields(result, effectSlugs) });
}
