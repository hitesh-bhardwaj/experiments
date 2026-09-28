import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import DocsLicense from "./DocsLicense";

export const metadata = createPageMetadata({
  title: "Hyperiux Vault License: Free Core & Pro Usage",
  description: "Understand what you can do with Vault Free Core and Pro effects, including commercial projects, client work, source edits, and redistribution limits.",
  path: "/docs/license",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/license.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/docs/license" />
      <DocsLicense />
    </>
  );
}
