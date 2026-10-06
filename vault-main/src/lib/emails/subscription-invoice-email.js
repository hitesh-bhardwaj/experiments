export function getBillingLabel(interval) {
  const labels = {
    monthly: "Monthly",
    yearly: "Yearly",
  };

  return labels[interval] || "Pro";
}

export function formatEmailDate(value) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatAmount(amountInSmallestUnit, currency) {
  const amount = (amountInSmallestUnit || 0) / 100;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export function createSubscriptionInvoiceEmail({
  name = "there",
  billingInterval,
  amount,
  currency,
  paymentId,
  periodEnd,
  invoiceUrl,
  isFirstPayment,
}) {
  const planName = `${getBillingLabel(billingInterval)} Pro`;
  const amountLabel = formatAmount(amount, currency);
  const renewsLabel = formatEmailDate(periodEnd);
  const heading = isFirstPayment
    ? "Welcome to Hyperiux Vault Pro"
    : "Payment received";
  const subject = isFirstPayment
    ? `You're in - Vault Pro receipt (${amountLabel})`
    : `Vault Pro renewal receipt (${amountLabel})`;

  const intro = isFirstPayment
    ? "Your Vault Pro subscription is active. Here's your receipt."
    : "Your Vault Pro subscription renewed. Here's your receipt.";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h1 style="font-size: 20px; margin-bottom: 4px;">${heading}</h1>
      <p style="color: #555; margin-top: 0;">${intro}</p>
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #777;">Plan</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${planName}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #777;">Amount</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${amountLabel}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #777;">Payment ID</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right; font-family: monospace; font-size: 13px;">${paymentId}</td></tr>
        <tr><td style="padding: 8px 0; color: #777;">Renews on</td><td style="padding: 8px 0; text-align: right;">${renewsLabel}</td></tr>
      </table>
      ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color: #ff5f00;">View invoice</a></p>` : ""}
      <p style="color: #999; font-size: 13px; margin-top: 32px;">Hyperiux Vault - Pro subscription</p>
    </div>
  `;

  const text = [
    heading,
    intro,
    `Plan: ${planName}`,
    `Amount: ${amountLabel}`,
    `Payment ID: ${paymentId}`,
    `Renews on: ${renewsLabel}`,
    invoiceUrl ? `Invoice: ${invoiceUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
