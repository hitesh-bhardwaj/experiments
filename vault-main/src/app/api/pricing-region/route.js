import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Which currency to price in for this visitor: INR from India, USD
// elsewhere. For client components that can't read the request headers
// themselves (see lib/useCurrency.js).
export async function GET() {
  const country = (await headers()).get("x-vercel-ip-country");
  return NextResponse.json(
    { currency: country === "IN" ? "INR" : "USD" },
    { headers: { "Cache-Control": "private, max-age=3600" } }
  );
}
