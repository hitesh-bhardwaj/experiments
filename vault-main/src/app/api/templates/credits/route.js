import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserPlanInfo } from "@/lib/subscription";
import { getCreditBalance } from "@/lib/template-credits";

// The signed-in user's tier and template credit balance, for the
// get-template modal and the pricing page's credit wallet.
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ signedIn: false, plan: "free", tier: "free", balance: 0 });
  }

  const [{ plan, tier }, balance] = await Promise.all([
    getUserPlanInfo(userId),
    getCreditBalance(userId),
  ]);

  return NextResponse.json({ signedIn: true, plan, tier, balance });
}
