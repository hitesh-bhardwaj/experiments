import { getSearchIndexEffects } from "@/lib/search-index";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const searchableEffects = await getSearchIndexEffects();

  return Response.json({
    effects: searchableEffects,
    total: searchableEffects.length,
  });
}
