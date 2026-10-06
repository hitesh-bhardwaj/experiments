import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getTemplateBySlug } from "@/lib/mock-templates";

// Legacy fallback when neither templateSlug nor any other real product is
// specified - the original "validate the Razorpay data flow" test payment
// this route started as, kept so that use case still works.
const TEST_AMOUNT_INR = 1;

export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { templateSlug } = body;

    if (templateSlug) {
      const template = getTemplateBySlug(templateSlug);
      const price = template?.pricing?.standaloneOneTime;

      if (!template || !Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { error: "Unknown or unpriced template" },
          { status: 400 }
        );
      }

      // Price is looked up server-side from mock-templates.js, never
      // trusted from the request body - unlike the legacy test-payment
      // branch below (fine for a $1 test charge, not fine for real money).
      //
      // USD only: templates have no real rupee price anywhere (unlike Pro's
      // RAZORPAY_PRO_*_INR_PLAN_ID, which map to actual ₹999/₹8999 prices).
      // Charging the USD number as rupees (₹29 instead of a real ₹-priced
      // equivalent) would undercharge by roughly 88x - block it server-side
      // rather than trust a client-supplied currency, until real INR
      // pricing exists per template.
      const amount = price;
      const currency = "USD";

      // An Invoice, not a bare Order - unlike the legacy test-payment branch
      // below, so this gets a real Razorpay-hosted receipt (short_url,
      // rzp.io/... -> invoices.razorpay.com/...) the same way subscription
      // invoices already do (see lib/pro-access.js's recordInvoice, which
      // stores the *subscription's* short_url - Orders have no equivalent
      // field, Invoices do). Razorpay auto-generates an order_id for it,
      // which Checkout.js opens exactly like a bare order - the frontend
      // (RazorpayCheckoutButton) needs no changes.
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId).catch(() => null);
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress;

      const invoice = await razorpay.invoices.create({
        type: "invoice",
        currency,
        customer: {
          name: clerkUser?.fullName || clerkUser?.firstName || undefined,
          email: email || undefined,
        },
        line_items: [
          {
            name: template.title,
            amount: Math.round(amount * 100),
            currency,
            quantity: 1,
          },
        ],
        notes: { clerk_user_id: userId, template_slug: templateSlug },
        receipt: `template_${templateSlug}_${Date.now()}`,
        // Checkout.js is the notification here (the visitor is already in
        // the payment modal) - Razorpay's own invoice email/SMS default to
        // on, which would otherwise fire before the visitor has even paid.
        sms_notify: 0,
        email_notify: 0,
      });

      return NextResponse.json({
        orderId: invoice.order_id,
        amount: Math.round(amount * 100),
        currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    const amount =
      Number.isFinite(body?.amount) && body.amount > 0
        ? body.amount
        : TEST_AMOUNT_INR;
    const currency = "INR";

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: `test_${Date.now()}`,
      notes: { clerk_user_id: userId },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("RAZORPAY_CREATE_ORDER_ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
