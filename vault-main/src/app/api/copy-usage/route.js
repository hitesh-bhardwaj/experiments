import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getInstallLimitDecision,
  getUnlockedEffectSlugsToday,
  resolveSignedInIdentity,
} from "@/lib/install-limit";

// Website copy button, delegating to the shared install-limit decision point
// (Installation-SyncUp.md Stage 1.5) so the daily quota is one shared bucket
// across web copy, `hyperiux add`, and MCP - not three separate counters.
// Response shape is kept identical to the pre-migration version on purpose:
// vault-main/src/app/(app)/effects/[slug]/useCopyLimit.js already depends on
// exactly these fields.

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ signedIn: false });
  }

  const identity = await resolveSignedInIdentity(userId);

  if (identity.isAdmin) {
    return NextResponse.json({
      signedIn: true,
      isAdmin: true,
      plan: identity.plan,
      limit: null,
      count: 0,
      remaining: null,
      effectSlugs: [],
    });
  }

  const effectSlugs = await getUnlockedEffectSlugsToday({ clerkUserId: userId });
  const count = effectSlugs.length;

  return NextResponse.json({
    signedIn: true,
    isAdmin: false,
    plan: identity.plan,
    limit: identity.limit,
    count,
    remaining: Math.max(0, identity.limit - count),
    effectSlugs,
  });
}

export async function POST(request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ allowed: false, signedIn: false }, { status: 401 });
  }

  const { effectSlug } = await request.json().catch(() => ({}));

  if (!effectSlug || typeof effectSlug !== "string") {
    return NextResponse.json({ allowed: false, error: "Missing effectSlug." }, { status: 400 });
  }

  const result = await getInstallLimitDecision({
    effectSlug,
    source: "web",
    clerkUserId: userId,
  });

  if (result.reason === "error") {
    return NextResponse.json(
      {
        allowed: false,
        signedIn: true,
        isAdmin: false,
        plan: result.plan,
        limit: result.limit,
        count: result.count,
        remaining: result.remaining,
        effectSlugs: [],
      },
      { status: 500 }
    );
  }

  const effectSlugs = await getUnlockedEffectSlugsToday({ clerkUserId: userId });

  return NextResponse.json({
    allowed: result.allowed,
    signedIn: true,
    isAdmin: result.reason === "admin",
    plan: result.plan,
    limit: result.limit,
    count: result.count,
    remaining: result.remaining,
    effectSlugs,
  });
}
