import { describe, expect, it } from "vitest";
import { DEFAULT_ACCENT, cleanAccent, cleanDarkness, themeCss } from "./theme";

describe("theme helpers", () => {
  it("accepts only #rrggbb colours", () => {
    expect(cleanAccent("#5F7A5C")).toBe("#5f7a5c");
    expect(cleanAccent(" #a65a2e ")).toBe("#a65a2e");
    for (const bad of ["red", "#fff", "#12345g", "", null, undefined, "#a65a2e;}body{display:none"]) {
      expect(cleanAccent(bad)).toBe(DEFAULT_ACCENT);
    }
  });

  it("keeps darkness between 0 and 90", () => {
    expect(cleanDarkness("40")).toBe(40);
    expect(cleanDarkness(-5)).toBe(0);
    expect(cleanDarkness(150)).toBe(90);
    expect(cleanDarkness("abc")).toBe(45);
  });

  it("never lets anything but a colour into the page CSS", () => {
    expect(themeCss({ accent: "</style><script>alert(1)</script>" })).toBe(`:root{--accent:${DEFAULT_ACCENT}}`);
  });
});

describe("themeCss icon colour", () => {
  it("adds the lash icon colour only when it is a valid colour", () => {
    expect(themeCss({ accent: "#a65a2e", iconColor: "#FFE4EE" })).toBe(":root{--accent:#a65a2e;--lash-icon:#ffe4ee}");
    expect(themeCss({ accent: "#a65a2e", iconColor: null })).toBe(":root{--accent:#a65a2e}");
    expect(themeCss({ accent: "#a65a2e", iconColor: "red;}x{" })).toBe(":root{--accent:#a65a2e}");
  });
});
