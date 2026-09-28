import React from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import DocsMcp from "./DocsMcp";

export const metadata = createPageMetadata({
  title: "Hyperiux MCP Server for AI Coding Assistants",
  description: "Connect Claude Code, Claude Desktop, Cursor, Codex CLI, or any MCP-compatible client to live, accurate Hyperiux Vault effect data.",
  path: "/docs/mcp",
  image: "https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/seo/cli.jpg",
});

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/docs/mcp" />
      <React.Suspense fallback={null}>
        <DocsMcp />
      </React.Suspense>
    </>
  );
}
