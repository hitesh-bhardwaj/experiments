import { describe, it, expect } from "vitest";
import {
  getPrice,
  getMonthlyEquivalent,
  getYearlySaving,
  getCreditsPerYear,
  getCreditsForCharge,
  canRedeemCatalogue,
  formatPrice,
  getPlanLabel,
  PLANS,
} from "./plans.js";

describe("plans", () => {
  it("prices match what's sold", () => {
    expect(getPrice("pro", "quarterly", "USD")).toBe(27);
    expect(getPrice("pro", "yearly", "USD")).toBe(79);
    expect(getPrice("pro_plus", "quarterly", "USD")).toBe(57);
    expect(getPrice("pro_plus", "yearly", "USD")).toBe(179);
    expect(getPrice("pro", "quarterly", "INR")).toBe(1347);
    expect(getPrice("pro", "yearly", "INR")).toBe(4490);
    expect(getPrice("pro_plus", "quarterly", "INR")).toBe(2997);
    expect(getPrice("pro_plus", "yearly", "INR")).toBe(8999);
    expect(getPrice("pro", "monthly", "USD")).toBeNull();
  });

  it("per-month equivalents and yearly savings", () => {
    expect(getMonthlyEquivalent("pro", "quarterly")).toBe(9);
    expect(getMonthlyEquivalent("pro", "yearly")).toBe(6.58);
    expect(getMonthlyEquivalent("pro_plus", "quarterly")).toBe(19);
    expect(getMonthlyEquivalent("pro_plus", "yearly")).toBe(14.92);
    expect(getMonthlyEquivalent("pro", "quarterly", "INR")).toBe(449);
    expect(getYearlySaving("pro")).toEqual({ amount: 29, percent: 27 });
    expect(getYearlySaving("pro_plus")).toEqual({ amount: 49, percent: 21 });
  });

  it("install limits: Pro 5, Pro+ 10", () => {
    expect(PLANS.pro.installsPerDay).toBe(5);
    expect(PLANS.pro_plus.installsPerDay).toBe(10);
  });

  it("credits per year: Pro none quarterly / 3 yearly, Pro+ 4 quarterly / 5 yearly", () => {
    expect(getCreditsPerYear("pro", "quarterly")).toBe(0);
    expect(getCreditsPerYear("pro", "yearly")).toBe(3);
    expect(getCreditsPerYear("pro_plus", "quarterly")).toBe(4);
    expect(getCreditsPerYear("pro_plus", "yearly")).toBe(5);
  });

  it("quarterly Pro earns no credits; quarterly Pro+ earns 1 every charge", () => {
    expect([1, 2, 5].map((n) => getCreditsForCharge("pro", "quarterly", n))).toEqual([0, 0, 0]);
    expect([1, 2, 5].map((n) => getCreditsForCharge("pro_plus", "quarterly", n))).toEqual([1, 1, 1]);
  });

  it("yearly plans earn their credits on every charge; bad counts earn nothing", () => {
    expect(getCreditsForCharge("pro", "yearly", 1)).toBe(3);
    expect(getCreditsForCharge("pro_plus", "yearly", 2)).toBe(5);
    expect(getCreditsForCharge("pro_plus", "quarterly", 3)).toBe(1);
    expect(getCreditsForCharge("pro", "yearly", 0)).toBe(0);
    expect(getCreditsForCharge("pro", "yearly", undefined)).toBe(0);
    expect(getCreditsForCharge("pro", "monthly", 1)).toBe(0);
  });

  it("Pro credits cover the selected catalogue only, Pro+ covers all", () => {
    expect(canRedeemCatalogue("pro", "selected")).toBe(true);
    expect(canRedeemCatalogue("pro", "full")).toBe(false);
    expect(canRedeemCatalogue("pro_plus", "full")).toBe(true);
    expect(canRedeemCatalogue("free", "selected")).toBe(false);
  });

  it("formats prices and labels", () => {
    expect(formatPrice(7.42)).toBe("$7.42");
    expect(formatPrice(179)).toBe("$179");
    expect(formatPrice(8999, "INR")).toBe("₹8,999");
    expect(getPlanLabel("pro_plus", "yearly")).toBe("Vault Pro+ Annual");
    expect(getPlanLabel("pro", "quarterly")).toBe("Vault Pro Quarterly");
  });
});
