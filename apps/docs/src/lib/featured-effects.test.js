import { describe, expect, it } from "vitest";
import {
  getFeaturedEffects,
  getFeaturedEffectsByCategory,
  getOverviewFeaturedEffects,
} from "./featured-effects";

const effects = [
  makeEffect("mask-text-reveal", "text-animations", true),
  makeEffect("blur-text", "text-animations", true),
  makeEffect("dotted-grid", "backgrounds", true),
  makeEffect("radial-slice-transition", "page-transitions", false),
  makeEffect("hover-slider", "webgl-effects", true),
];

describe("featured effects", () => {
  it("uses the Sanity isFeatured flag", () => {
    expect(getFeaturedEffects(effects).map((effect) => effect.name)).toEqual([
      "mask-text-reveal",
      "blur-text",
      "dotted-grid",
      "hover-slider",
    ]);
  });

  it("filters featured effects by category", () => {
    expect(getFeaturedEffectsByCategory(effects, "text").map((effect) => effect.name)).toEqual([
      "mask-text-reveal",
      "blur-text",
    ]);
  });

  it("picks one featured effect per category for the overview carousel", () => {
    expect(getOverviewFeaturedEffects(effects).map((effect) => effect.name)).toEqual([
      "mask-text-reveal",
      "dotted-grid",
      "hover-slider",
    ]);
  });
});

function makeEffect(name, categorySlug, isFeatured) {
  return {
    name,
    title: name,
    categorySlug,
    categories: [categorySlug],
    isFeatured,
  };
}
