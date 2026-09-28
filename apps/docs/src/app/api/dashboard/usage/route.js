import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserPlan } from "@/lib/subscription";
import { isAdminUser } from "@/lib/admin";
import { getEffectMetadata } from "@/lib/registry";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { LIMITS } from "@/lib/install-limit";

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, plan, sanityEntries] = await Promise.all([
    currentUser(),
    getUserPlan(userId),
    getAllSanityEffectEntries(),
  ]);
  const isAdmin = isAdminUser(user);
  const limit = isAdmin ? null : plan === "pro" ? LIMITS.pro : LIMITS.free;

  // Same source the vault listing (and, at save-time, the Saved Effects
  // page) uses for cover/video assets - registry.json has neither field, so
  // reading it directly here left cards with no poster/video.
  const sanityEffectsBySlug = new Map(
    buildEffectsFromSanity(sanityEntries).map((effect) => [effect.name, effect])
  );

  // install_unlocks is the shared ledger across web/CLI/MCP (Installation-
  // SyncUp.md Stage 1) - copy_usage_effects was the web-only predecessor and
  // no longer receives new rows as of the copy-usage route's migration, so
  // reading it here would silently go stale.
  const [{ data: todayRows, error: todayError }, { data: allRows, error: allError }] =
    await Promise.all([
      supabase
        .from("install_unlocks")
        .select("effect_slug")
        .eq("clerk_user_id", userId)
        .eq("usage_date", todayUTC()),

      supabase
        .from("install_unlocks")
        .select("effect_slug, usage_date, source")
        .eq("clerk_user_id", userId)
        .order("usage_date", { ascending: false }),
    ]);

  if (todayError || allError) {
    console.error("DASHBOARD_INSTALL_UNLOCKS_ERROR:", todayError || allError);

    return NextResponse.json(
      { error: "Failed to load copy usage" },
      { status: 500 }
    );
  }

  const count = (todayRows || []).length;
  const remaining = isAdmin ? null : Math.max(0, limit - count);

  // install_unlocks has one row per (day, effect) - dedupe to the most
  // recent unlock per effect since rows are already ordered newest-first.
  const seenSlugs = new Set();
  const copiedEffects = [];

  for (const row of allRows || []) {
    if (seenSlugs.has(row.effect_slug)) continue;
    seenSlugs.add(row.effect_slug);

    const metadata = sanityEffectsBySlug.get(row.effect_slug) || getEffectMetadata(row.effect_slug);
    if (!metadata) continue;

    copiedEffects.push({
      name: row.effect_slug,
      title: metadata.title || row.effect_slug,
      category: metadata.category,
      categories: metadata.categories,
      categorySlug: metadata.categorySlug,
      // Fall back to the same <slug>.png / <slug>.mp4 convention
      // mergeRegistryWithSanity uses when Sanity has no explicit asset.
      coverImage: metadata.coverImage || row.effect_slug,
      videoUrl: metadata.videoUrl || `${row.effect_slug}.mp4`,
      tier: metadata.tier || "free",
      lastCopiedAt: row.usage_date,
      // Most recent unlock's source, since rows are ordered newest-first and
      // an effect can be re-unlocked on a later day from a different surface
      // (e.g. copied on the website, then later `hyperiux add`-ed too).
      source: row.source || null,
    });
  }

  return NextResponse.json({
    plan,
    isAdmin,
    limit,
    count,
    remaining,
    copiedEffects,
  });
}
