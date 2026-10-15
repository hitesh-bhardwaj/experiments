import { getAiCatalogue, toLlmsTxt } from "@/lib/ai-catalogue";

// https://llmstxt.org index, built from the registry and Sanity so it never goes
// stale (it replaced a hand-maintained public/llms.txt). Full records: /llms-full.txt
export const revalidate = 3600;

export async function GET() {
  return new Response(toLlmsTxt(await getAiCatalogue()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
