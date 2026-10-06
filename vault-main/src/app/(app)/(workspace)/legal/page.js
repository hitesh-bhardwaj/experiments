import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";


export const metadata = createPageMetadata({
  title: "Hyperiux Vault Docs: Creative Effects Guide",
  description: "Learn how Vault works, when to use it, what’s inside, and how to add source-first interaction patterns to React and Next.js projects.",
  path: "/docs",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/introduction.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/docs" />
      
    </>
  );
}
