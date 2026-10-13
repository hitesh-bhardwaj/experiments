import { notFound } from "next/navigation";
import { parsePlanKey } from "@/lib/plans";
import CheckoutScreen from "./CheckoutScreen";
import { getVisitorCurrency } from "@/lib/visitor-country";

export const metadata = {
  title: "Checkout | Hyperiux Vault",
  robots: { index: false, follow: false },
};

// /checkout/<tier>.<interval>, e.g. /checkout/pro_plus.yearly - where every
// "buy a plan" link outside the pricing page goes. Signed in, Razorpay opens
// straight away; signed out, one hop to sign-in and back here. Sign-in is
// checked in the browser (CheckoutScreen), where Clerk always knows, rather
// than here, where a stale session cookie from a Clerk-free page (the
// homepage) can read as signed out.
export default async function CheckoutPage({ params }) {
  const { plan } = await params;
  const parsed = parsePlanKey(plan);
  if (!parsed) notFound();

  return <CheckoutScreen tier={parsed.tier} interval={parsed.interval} currency={await getVisitorCurrency()} />;
}
