import { getAiCatalogue, toLlmsFullTxt } from "@/lib/ai-catalogue";

// Every effect's full record as plain text, for AI tools that read llms-full.txt
export const revalidate = 3600;

export async function GET() {
  return new Response(toLlmsFullTxt(await getAiCatalogue()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
