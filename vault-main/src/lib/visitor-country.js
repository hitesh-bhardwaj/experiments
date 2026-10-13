import "server-only";
import { headers } from "next/headers";

// The visitor's country code ("IN", "US", ...) from the header Vercel adds to
// every request - null locally, where there's no Vercel in front.
// DEV_VISITOR_COUNTRY (e.g. "IN" in .env.local) stands in for it in
// development only, to try INR pricing and checkout without a VPN or a
// header extension. Production always uses the real header.
export async function getVisitorCountry() {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_VISITOR_COUNTRY) {
    return process.env.DEV_VISITOR_COUNTRY.toUpperCase();
  }
  return (await headers()).get("x-vercel-ip-country");
}

// INR for India, USD everywhere else
export async function getVisitorCurrency() {
  return (await getVisitorCountry()) === "IN" ? "INR" : "USD";
}
