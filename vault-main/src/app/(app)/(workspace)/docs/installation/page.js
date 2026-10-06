import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import DocsInstallation from "./DocsInstallation";

export const metadata = createPageMetadata({
  title: "Install Hyperiux Vault Effects in Your Project",
  description: "Set up Vault with the CLI or manual workflow, add only the effect files you need, verify dependencies, and keep the source code editable in your repo.",
  path: "/docs/installation",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/installation.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/docs/installation" />
      <DocsInstallation />
    </>
  );
}
