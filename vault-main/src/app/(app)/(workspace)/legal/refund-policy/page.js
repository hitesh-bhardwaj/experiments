import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import RefundPolicy from "./RefundPolicy";

export const metadata = createPageMetadata({
  title: "Hyperiux Vault Refund Policy",
  description: "Review the Hyperiux Vault Refund Policy for Vault Pro purchases, cancellations, billing issues, chargebacks, and refund exceptions.",
  path: "/legal/refund-policy",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/Refund-policy.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/legal/refund-policy" />
      <RefundPolicy/>
    </>
  );
}
