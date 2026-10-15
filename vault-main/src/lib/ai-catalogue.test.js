import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/sanity", () => ({ getAllSanityEffectGuides: vi.fn(), getSanityBlogEntries: vi.fn() }));

const { buildAiCatalogue, readGuide, toLlmsTxt, toLlmsFullTxt } = await import("./ai-catalogue.js");

const SECRET = "/* PRO-SOURCE-SHOULD-NEVER-LEAK */";
const h2 = (text) => ({ _type: "block", style: "h2", text });
const p = (text) => ({ _type: "block", style: "normal", text });
const code = (value) => ({ _type: "effectCodeBlock", code: value });

const proGuide = {
  effectSlug: "stack-spread",
  categorySlug: "scroll-effects",
  title: "Stack Spread",
  summary: "A stack-to-spread hero.",
  seoDescription: "Stack Spread for React.",
  tier: "free", // Sanity disagrees with the registry on purpose
  tags: ["Motion"],
  relatedEffectNames: ["Timeline", "Not In Catalogue"],
  faq: [{ question: "What is it?", answer: "A hero." }],
  body: [
    h2("Overview"), p("Turns a pile into a composition."),
    h2("Install Command"), code("npx hyperiux add stack-spread"),
    h2("Usage Code"), code('import StackSpread from "@/components/effects/stack-spread";'),
    h2("Component Code"), code(`"use client"; ${SECRET} export default function StackSpread() {}`),
    h2("Best Used For"), p("• Portfolio heroes."), p("• Campaign pages."),
    h2("Not For"), p("Not for dense galleries."),
    h2("Accessibility and Mobile"), p("Keep the headline as real text."),
    h2("Common Mistakes"), p("• Too many images."),
  ],
};

const catalogue = buildAiCatalogue({
  registryItems: [
    { name: "stack-spread", category: "scroll", tier: "pro", dependencies: ["gsap"] },
    { name: "timeline", category: "components", tier: "free", dependencies: [] },
  ],
  guides: [proGuide, { effectSlug: "timeline", categorySlug: "components", title: "Timeline", body: [] }],
  getRegistryEffect: (slug) => (slug === "stack-spread" ? { props: [{ name: "scrollLength", type: "number", default: 350, description: "Scroll distance in vh." }] } : null),
  templates: [{ slug: "lumera", title: "Lumera", category: "Real Estate" }],
  blogPosts: [{ slug: "post", title: "A post" }],
});

describe("ai catalogue", () => {
  it("never carries an effect's component source, in JSON or text", () => {
    expect(JSON.stringify(catalogue)).not.toContain("PRO-SOURCE");
    expect(toLlmsTxt(catalogue)).not.toContain("PRO-SOURCE");
    expect(toLlmsFullTxt(catalogue)).not.toContain("PRO-SOURCE");
  });

  it("keeps only the usage snippet from the guide's code blocks", () => {
    expect(readGuide(proGuide.body).usage).toBe('import StackSpread from "@/components/effects/stack-spread";');
  });

  it("takes Free/Pro from the registry, not Sanity", () => {
    expect(catalogue.effects.find((e) => e.slug === "stack-spread").tier).toBe("pro");
  });

  it("splits the guide into sections, with bullets as list items", () => {
    const effect = catalogue.effects.find((e) => e.slug === "stack-spread");
    expect(effect.bestFor).toEqual(["Portfolio heroes.", "Campaign pages."]);
    expect(effect.notFor).toEqual(["Not for dense galleries."]);
    expect(effect.accessibility).toEqual(["Keep the headline as real text."]);
    expect(effect.commonMistakes).toEqual(["Too many images."]);
    expect(effect.props[0]).toEqual({ name: "scrollLength", type: "number", default: 350, description: "Scroll distance in vh." });
  });

  it("links related effects that exist and drops the rest", () => {
    expect(catalogue.effects.find((e) => e.slug === "stack-spread").related.map((r) => r.slug)).toEqual(["timeline"]);
  });

  it("uses the site's category slugs in links and counts every effect", () => {
    const effect = catalogue.effects.find((e) => e.slug === "stack-spread");
    expect(effect.docsUrl).toBe("https://vault.hyperiux.com/effects/scroll-effects/stack-spread");
    expect(catalogue.totals).toMatchObject({ effects: 2, free: 1, pro: 1, templates: 1 });
  });

  it("lists every effect in llms.txt with its tier and demo link", () => {
    const text = toLlmsTxt(catalogue);
    expect(text).toContain("[Stack Spread](https://vault.hyperiux.com/effects/scroll-effects/stack-spread): Pro");
    expect(text).toContain("[live demo](https://vault.hyperiux.com/demo/timeline)");
    expect(text).toContain("[A post](https://vault.hyperiux.com/blog/post)");
  });
});
