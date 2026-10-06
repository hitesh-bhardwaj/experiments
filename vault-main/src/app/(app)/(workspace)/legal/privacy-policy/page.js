import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import PrivacyPolicy from "./PrivacyPolicy";


export const metadata = createPageMetadata({
  title: "Hyperiux Vault Privacy Policy",
  description: "Learn how Hyperiux Vault collects, uses, stores, and protects personal data, including cookies, analytics, billing, and user rights.",
  path: "/legal/privacy-policy",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/privacy-policy.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/legal/privacy-policy" />
      <PrivacyPolicy/>
    </>
  );
}
