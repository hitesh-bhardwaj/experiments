import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTemplateBySlug } from "@/lib/mock-templates";

// Sibling to /api/wishlist, scoped to templates instead of effects - kept
// as its own route/table (wishlisted_templates) rather than folding
// templates into wishlisted_effects, since that table's effect_slug/category
// columns are effects-specific and already read elsewhere (admin overview's
// "Top saved effects", dashboard/saved) as exactly that.

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Returns every template the current user has saved.
*/
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    const { data, error } = await supabase
      .from("wishlisted_templates")
      .select("template_slug, created_at")
      .eq("clerk_user_id", userId);

    if (error) {
      console.error("WISHLIST_TEMPLATES_GET_ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("WISHLIST_TEMPLATES_GET_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Toggle a template's saved state for the current user.
*/
export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateSlug } = await request.json().catch(() => ({}));

    if (!templateSlug || !getTemplateBySlug(templateSlug)) {
      return NextResponse.json({ error: "Unknown template." }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("wishlisted_templates")
      .select("id")
      .eq("clerk_user_id", userId)
      .eq("template_slug", templateSlug)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("wishlisted_templates")
        .delete()
        .eq("clerk_user_id", userId)
        .eq("template_slug", templateSlug);

      if (error) {
        console.error("WISHLIST_TEMPLATES_DELETE_ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ saved: false });
    }

    const { error } = await supabase
      .from("wishlisted_templates")
      .insert({ clerk_user_id: userId, template_slug: templateSlug });

    if (error) {
      console.error("WISHLIST_TEMPLATES_INSERT_ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("WISHLIST_TEMPLATES_POST_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
