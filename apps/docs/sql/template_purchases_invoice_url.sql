-- No migration tooling exists in this repo - Supabase schema changes are
-- hand-run in the Supabase SQL editor. Run this once against the existing
-- template_purchases table (see template_purchases.sql) to add the column
-- recordTemplatePurchase() (lib/template-purchases.js) now populates -
-- Razorpay's real hosted invoice short_url (https://rzp.io/...), fetched in
-- verify-payment/route.js after create-order/route.js switched template
-- purchases from a bare Order to an Invoice (razorpay.invoices.create()) so
-- "View Bill" can link to the same kind of receipt subscription invoices
-- already have via invoices.invoice_url.

alter table template_purchases add column if not exists invoice_url text;
