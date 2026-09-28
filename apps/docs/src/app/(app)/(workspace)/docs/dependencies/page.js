import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import DocsDependencies from "./DocsDependencies";

export const metadata = createPageMetadata({
  title: "Vault Dependencies for Motion, GSAP & WebGL",
  description: "See which React, Next.js, Tailwind, GSAP, Motion, Three.js and WebGL dependencies each Vault effect may need before you install.",
  path: "/docs/dependencies",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/dependencies.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/docs/dependencies" />
      <DocsDependencies />
    </>
  );
}
