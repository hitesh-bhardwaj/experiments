import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import TermsOfService from "./TermsofService";


export const metadata = createPageMetadata({
  title: "Hyperiux Vault Terms of Service",
  description: "Read the Hyperiux Vault Terms of Service covering accounts, subscriptions, billing, acceptable use, support, disputes, and service rules.",
  path: "/legal/terms-of-service",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/terms-of-service.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/legal/terms-of-service" />
    <TermsOfService/>
    </>
  );
}
