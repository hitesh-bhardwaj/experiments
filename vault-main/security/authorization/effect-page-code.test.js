import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// The effect page is cached and the same for every visitor: it shows the
// "Usage Code" snippet only, and the component's code comes from the "Get
// code" menu (/api/effects/[slug]/copy - covered in free-pro-access.test.js).
// These check the page can't carry any other code.

const { VAULT_ROOT } = await import("../helpers/route-harness.js");
const { shapeEffectBody } = await import("@/lib/effect-body");

describe("cached effect page", () => {
  const page = fs.readFileSync(path.join(VAULT_ROOT, "src/app/(app)/(workspace)/effects/[slug]/[effectSlug]/page.js"), "utf-8");

  it("never reads registry source files or the session", () => {
    expect(page).not.toMatch(/getEffectSource\(|@clerk\/nextjs\/server|await auth\(/);
  });

  it("always strips code from the body and drops jsxCode/tsxCode", () => {
    expect(page).toMatch(/body:\s*shapeEffectBody\(content\.body\)/);
    expect(page).toMatch(/jsxCode:\s*_jsx,\s*tsxCode:\s*_tsx/);
  });
});

describe("effect body shaping", () => {
  const h2 = (text) => ({ _type: "block", style: "h2", children: [{ _type: "span", text, marks: [] }] });
  const body = [
    h2("Usage Code"),
    { _type: "effectCodeBlock", code: "USAGE_SNIPPET" },
    h2("Component Code"),
    { _type: "effectCodeBlock", code: "SECRET_JSX", tsxCode: "SECRET_TSX" },
    { _type: "callout", content: [{ _type: "block", children: [{ _type: "span", text: "SECRET_INLINE", marks: ["code"] }] }] },
  ];

  it("the cached page keeps the usage snippet (public) and strips every other code", () => {
    const shaped = shapeEffectBody(body);
    const text = JSON.stringify(shaped);
    expect(text).toContain("USAGE_SNIPPET");
    expect(text).not.toContain("SECRET");
    expect(shaped[1].isPublic).toBe(true);
    expect(shaped[3].isPublic).toBeUndefined();
  });

  it("inline code under the usage heading stays; elsewhere it's blanked", () => {
    const inline = (text) => ({ _type: "block", children: [{ _type: "span", text, marks: ["code"] }] });
    const shaped = shapeEffectBody([h2("Usage Code"), inline("npx USAGE_INLINE"), h2("Install"), inline("SECRET_CMD")]);
    expect(JSON.stringify(shaped)).toContain("USAGE_INLINE");
    expect(JSON.stringify(shaped)).not.toContain("SECRET");
  });
});
