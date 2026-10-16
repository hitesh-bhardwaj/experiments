import { describe, it, expect } from "vitest";
import { displayFirstName, displayName, nameFromEmail } from "./display-name.js";

describe("display-name", () => {
  it("reads a name from an email's local part", () => {
    expect(nameFromEmail("harsh.goyal99@example.com")).toBe("Harsh Goyal");
    expect(nameFromEmail("jane_doe+news@x.io")).toBe("Jane Doe");
    expect(nameFromEmail("harshgoyal@example.com")).toBe("Harshgoyal");
    expect(nameFromEmail("42@example.com")).toBe(null);
    expect(nameFromEmail("")).toBe(null);
  });

  it("prefers the account's own name", () => {
    const email = { primaryEmailAddress: { emailAddress: "harsh.goyal@x.com" } };
    expect(displayName({ fullName: "Harsh G", ...email })).toBe("Harsh G");
    expect(displayName({ firstName: "Harsh", lastName: "Goyal" })).toBe("Harsh Goyal");
    expect(displayName(email)).toBe("Harsh Goyal");
    expect(displayFirstName({ firstName: "Vidushi", ...email })).toBe("Vidushi");
    expect(displayFirstName(email)).toBe("Harsh");
    expect(displayFirstName({ emailAddresses: [{ emailAddress: "42@x.com" }] })).toBe(null);
  });
});
