import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserPlan } from "@/lib/subscription";

// The signed-in visitor's plan ("free" | "pro"), for pages that are cached
// (ISR) and so can't read the session on the server themselves.
export async function GET() {
  const { userId } = await auth();
  let plan = "free";
  try {
    plan = await getUserPlan(userId);
  } catch {
    // Treat a lookup failure as free; the copy / install routes re-check access.
  }
  return NextResponse.json({ plan }, { headers: { "Cache-Control": "private, no-store" } });
}
