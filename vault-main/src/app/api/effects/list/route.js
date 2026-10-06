import {
  getAllSanityEffectEntries,
  buildEffectsFromSanity,
} from "@/lib/sanity";
import { getFeaturedEffects } from "@/lib/featured-effects";
import { sortEffects } from "@/lib/effect-sort";
import { resolveEffectCategoryId } from "@/lib/categories";
import { attachInstallCounts, getEffectInstallCounts } from "@/lib/cli-install-stats";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "18", 10)));
    const category = searchParams.get("category") || "all";
    const filter = searchParams.get("filter") || null;
    const sort = searchParams.get("sort") || null;
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const slugsParam = searchParams.get("slugs");

    const sanityEntries = await getAllSanityEffectEntries();
    let allEffects = buildEffectsFromSanity(sanityEntries);

    let filteredEffects = [];

    if (slugsParam) {
      const requestedSlugs = slugsParam.split(",").map((s) => s.trim()).filter(Boolean);
      const effectsBySlug = new Map(allEffects.map((e) => [e.name, e]));
      filteredEffects = requestedSlugs
        .map((slug) => effectsBySlug.get(slug))
        .filter(Boolean);
    } else {
      const featuredEffects = getFeaturedEffects(allEffects);
      const featuredEffectNames = new Set(featuredEffects.map((e) => e.name));

      filteredEffects = allEffects.filter((effect) => {
        if (filter === "free" && effect.tier === "pro") return false;
        if (filter === "pro" && effect.tier !== "pro") return false;
        if (filter === "featured" && !featuredEffectNames.has(effect.name)) return false;

        if (category && category !== "all") {
          if (resolveEffectCategoryId(effect) !== category) return false;
        }

        if (search) {
          const catId = resolveEffectCategoryId(effect);
          const matches =
            effect.name.toLowerCase().includes(search) ||
            effect.title?.toLowerCase().includes(search) ||
            catId?.toLowerCase().includes(search) ||
            effect.description?.toLowerCase().includes(search);
          if (!matches) return false;
        }

        return true;
      });

      filteredEffects = sortEffects(filteredEffects, sort);
    }

    const total = filteredEffects.length;
    const startIndex = (page - 1) * limit;
    const paginatedSlice = filteredEffects.slice(startIndex, startIndex + limit);

    // Attach install counts only to the paginated batch
    const installCounts = await getEffectInstallCounts(paginatedSlice);
    const paginatedEffects = attachInstallCounts(paginatedSlice, installCounts);

    return Response.json({
      effects: paginatedEffects,
      total,
      page,
      limit,
      hasMore: startIndex + limit < total,
    });
  } catch (error) {
    console.error("API_EFFECTS_LIST_ERROR:", error);
    return Response.json({ error: "Failed to fetch effects" }, { status: 500 });
  }
}
