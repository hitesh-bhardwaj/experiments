import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isValidInterval, isValidTier } from "@/lib/plans";
import { getUpgradeQuote } from "@/lib/upgrade";

// What a Pro -> Pro+ upgrade costs today, after crediting the unused part of
// Pro - for the "Upgrade to Pro+" button to show before checkout opens.
// GET ?tier=pro_plus&interval=yearly
export async function GET(req) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier");
  const interval = searchParams.get("interval");

  if (!isValidTier(tier) || !isValidInterval(interval)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const quote = await getUpgradeQuote({ clerkUserId: userId, tier, interval });
    if (!quote.eligible) return NextResponse.json({ eligible: false, reason: quote.reason });

    return NextResponse.json({
      eligible: true,
      currency: quote.currency,
      // Smallest currency unit (cents / paise)
      fullPrice: quote.fullPrice,
      credit: quote.credit,
      charge: quote.charge,
      daysLeft: quote.daysLeft,
      renewsAt: quote.renewsAt,
    });
  } catch (error) {
    console.error("UPGRADE_QUOTE_ERROR:", error);
    return NextResponse.json({ error: "Could not price the upgrade" }, { status: 500 });
  }
}
