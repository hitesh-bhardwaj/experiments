import { getAiCatalogue } from "@/lib/ai-catalogue";

// The /ai-components catalogue as JSON, for developer tools and AI agents
export const revalidate = 3600;

export async function GET() {
  return Response.json(await getAiCatalogue());
}
