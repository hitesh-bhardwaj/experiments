import { describe, expect, it } from "vitest";
import { sortEffects } from "./effect-sort";

const effects = [
  { name: "third", title: "Third", addedAt: 3 },
  { name: "first", title: "First", addedAt: 1 },
  { name: "second", title: "Second", addedAt: 2 },
];

describe("sortEffects", () => {
  it("preserves Sanity order by default", () => {
    expect(sortEffects(effects).map((effect) => effect.name)).toEqual([
      "third",
      "first",
      "second",
    ]);
  });

  it("still supports explicit sort options", () => {
    expect(sortEffects(effects, "az").map((effect) => effect.name)).toEqual([
      "first",
      "second",
      "third",
    ]);
    expect(sortEffects(effects, "recent").map((effect) => effect.name)).toEqual([
      "third",
      "second",
      "first",
    ]);
  });
});
