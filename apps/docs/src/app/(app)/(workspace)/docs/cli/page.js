import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import DocsCli from "./DocsCli";

export const metadata = createPageMetadata({
  title: "Hyperiux Vault CLI Commands & Workflow",
  description: "Use the Hyperiux CLI to initialize Vault, add or upgrade effects, diagnose setup issues, manage Pro access, and keep creative code in your workspace.",
  path: "/docs/cli",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/cli.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/docs/cli" />
      <React.Suspense fallback={null}>
        <DocsCli />
      </React.Suspense>
    </>
  );
}
