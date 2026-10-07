import "server-only";

// Builds the "Copy AI prompt" text for the effect page dropdown: everything a
// coding agent needs to drop one effect into a project - requirements,
// dependencies, the full TSX source, a usage example and the props table.
// Paths match what `npx hyperiux add` / the MCP install, so all three
// install routes land the file in the same place.

const IMAGE_EXTENSION_RE = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const KNOWN_IMAGE_HOSTS = [/\.r2\.dev$/i, /^images\.unsplash\.com$/i, /^picsum\.photos$/i];
const URL_RE = /https:\/\/([a-z0-9.-]+)(\/[^\s"'`)?#]*)?/gi;

// Same detection as the CLI's remote-image note (packages/cli remote-images.js).
export function findRemoteImageHosts(source) {
  if (!source.includes("next/image")) return [];

  const hosts = new Set();
  for (const match of source.matchAll(URL_RE)) {
    const host = match[1].toLowerCase();
    if (IMAGE_EXTENSION_RE.test(match[2] || "") || KNOWN_IMAGE_HOSTS.some((pattern) => pattern.test(host))) {
      hosts.add(host);
    }
  }
  return [...hosts].sort();
}

function formatDefault(value) {
  if (value === undefined) return "-";
  return `\`${JSON.stringify(value)}\``;
}

function tableCell(text) {
  return String(text ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/**
 * @param {{ effect: object, source: string }} input - registry metadata and
 *   the effect's full TSX source (index.tsx).
 * @returns {string}
 */
export function buildEffectAiPrompt({ effect, source }) {
  const slug = effect.name;
  const title = effect.title || slug;
  const exportName = effect.exportName || "Effect";
  const importLine =
    effect.exportKind === "named"
      ? `import { ${exportName} } from "@/components/effects/${slug}";`
      : `import ${exportName} from "@/components/effects/${slug}";`;
  const dependencies = effect.dependencies || [];
  const props = (effect.props || []).filter((prop) => prop?.name);
  const imageHosts = findRemoteImageHosts(source);

  const sections = [
    `You are adding the "${title}" effect from Hyperiux Vault to this codebase.`,
    effect.description || "",
    `## Requirements

The project should use:
- Next.js with the App Router
- Tailwind CSS
- TypeScript

If any of these are missing, explain how to set them up before continuing. If the project uses JavaScript instead of TypeScript, add the component as \`index.jsx\` and remove the type annotations.`,
    `## 1. Install dependencies

${
  dependencies.length
    ? `\`\`\`bash\nnpm install ${dependencies.join(" ")}\n\`\`\`\n\nUse the project's package manager (pnpm / yarn / bun) if it isn't npm.`
    : "No extra npm packages are needed."
}`,
    `## 2. Add the component

Create \`src/components/effects/${slug}/index.tsx\` (or \`components/effects/${slug}/index.tsx\` if the project has no \`src\` folder) with exactly this code. Do not rewrite, simplify or restyle it:

\`\`\`tsx
${source.trimEnd()}
\`\`\``,
    `## 3. Use it

\`\`\`tsx
"use client";

${importLine}

export default function ${exportName}Example() {
  return <${exportName} />;
}
\`\`\`

The component runs in the browser, so render it from a client component (or behind \`"use client"\`) as shown.`,
  ];

  if (props.length) {
    sections.push(`## Props

All props are optional.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
${props
  .map((prop) => `| \`${prop.name}\` | \`${tableCell(prop.type)}\` | ${formatDefault(prop.default)} | ${tableCell(prop.description)} |`)
  .join("\n")}`);
  }

  if (imageHosts.length) {
    sections.push(`## Remote images

This effect loads demo images through next/image, and Next.js blocks remote hosts until they are allowed. Add this to \`next.config\`:

\`\`\`ts
images: {
  remotePatterns: [
${imageHosts.map((host) => `    { protocol: "https", hostname: "${host}" },`).join("\n")}
  ],
},
\`\`\``);
  }

  sections.push(`## When you're done

Tell me which file you created, which packages you installed and any config you changed.`);

  return `${sections.filter(Boolean).join("\n\n")}\n`;
}
