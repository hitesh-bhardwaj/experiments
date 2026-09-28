import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import LicenseAgreement from "./LicenseAgreement";


export const metadata = createPageMetadata({
  title: "Hyperiux Vault License Agreement",
  description: "Read the Hyperiux Vault License Agreement covering Free Core, Vault Pro, source files, client work, restrictions, and usage rights.",
  path: "/legal/license-agreement",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/license-agreement.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/legal/license-agreement" />
      <LicenseAgreement/>
    </>
  );
}
