import { NextResponse } from "next/server";
import { getVisitorCurrency } from "@/lib/visitor-country";

// Which currency to price in for this visitor: INR from India, USD
// elsewhere. For client components that can't read the request headers
// themselves (see lib/useCurrency.js).
export async function GET() {
  return NextResponse.json(
    { currency: await getVisitorCurrency() },
    { headers: { "Cache-Control": "private, max-age=3600" } }
  );
}
