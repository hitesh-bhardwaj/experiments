// A Sanity portable-text block whose only content is a single "code"-marked
// span (used for freeform code snippets outside of explicit effectCodeBlock
// entries).
export function isCodeOnlyBlock(block) {
  const children = block?.children || [];

  if (!children.length) return false;

  return children.every(
    (child) => child?._type === "span" && (child.marks || []).includes("code")
  );
}

// The "Usage Code" section's snippet is public - how to drop the component in,
// no source.
const PUBLIC_CODE_HEADINGS = new Set(["Usage Code"]);

function blockText(block) {
  return (block?.children || []).map((child) => child?.text || "").join("").trim();
}

// The effect page shows the usage snippet only; the component's code comes
// from the "Get code" menu (/api/effects/[slug]/copy checks sign-in, plan and
// the daily limit). The page is cached and the same for everyone, so any other
// code in content.body - effectCodeBlock entries (block.code / tsxCode) and
// code-only portable-text blocks - is stripped here and never reaches the HTML
// or RSC payload. Usage code blocks are marked `isPublic`. (Component code and
// install commands are being removed from Sanity; once they're all gone this
// strips nothing.)
export function shapeEffectBody(body, heading = null) {
  if (!Array.isArray(body)) return body;

  return body.map((block) => {
    if (block?._type === "block" && block.style === "h2") heading = blockText(block);
    const isPublic = PUBLIC_CODE_HEADINGS.has(heading);

    // Blocks nested in others (a callout's content) are shaped the same way
    if (Array.isArray(block?.content)) {
      block = { ...block, content: shapeEffectBody(block.content, heading) };
    }

    if (block?._type === "effectCodeBlock") {
      if (isPublic) return { ...block, isPublic: true };
      // Both versions of the source: tsxCode is the TypeScript one
      const { code, tsxCode, ...rest } = block;
      return rest;
    }

    if (block?._type === "block" && !isPublic && isCodeOnlyBlock(block)) {
      return {
        ...block,
        children: block.children.map((child) => ({ ...child, text: "" })),
      };
    }

    return block;
  });
}
