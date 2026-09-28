import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MAX_BATCH_EFFECTS = 50;

async function countInstalls(effect) {
  const { count, error } = await supabase
    .from("cli_effect_installs")
    .select("*", { count: "exact", head: true })
    .eq("effect", effect);

  if (error) {
    console.error("CLI_STATS_COUNT_ERROR:", error);
    return null;
  }

  return count ?? 0;
}

// GET /api/cli/stats?effect=blur-text          -> { effect, installCount }
// GET /api/cli/stats?effects=blur-text,grid-scale -> { stats: [{ effect, installCount }, ...] }
//
// installCount is COUNT(*) over cli_effect_installs, which is deduped on
// (anonymous_id, effect) by the /api/cli/telemetry route - so this is a
// real per-effect distinct-user count, not a raw event count.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const effect = searchParams.get("effect");
  const effectsParam = searchParams.get("effects");

  if (effect) {
    const installCount = await countInstalls(effect);

    if (installCount === null) {
      return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
    }

    return NextResponse.json({ effect, installCount });
  }

  if (effectsParam) {
    const effects = [...new Set(effectsParam.split(",").map((e) => e.trim()).filter(Boolean))].slice(
      0,
      MAX_BATCH_EFFECTS
    );

    if (effects.length === 0) {
      return NextResponse.json({ error: "No valid effects provided." }, { status: 400 });
    }

    const counts = await Promise.all(effects.map((e) => countInstalls(e)));

    if (counts.some((c) => c === null)) {
      return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
    }

    return NextResponse.json({
      stats: effects.map((e, i) => ({ effect: e, installCount: counts[i] })),
    });
  }

  return NextResponse.json(
    { error: "Provide an `effect` or `effects` query param." },
    { status: 400 }
  );
}
