import { describe, expect, it } from "vitest";
import { REVIEW_FORMATS, mix, quoteFontSize, reviewFormat, reviewTheme } from "./reviewThemes";

describe("review image helpers", () => {
  it("short reviews get bigger text than long ones, and smaller formats smaller text", () => {
    const short = quoteFontSize("Super!", "story");
    const long = quoteFontSize("x".repeat(400), "story");
    expect(short).toBeGreaterThan(long);
    expect(quoteFontSize("Super!", "square")).toBeLessThan(short);
  });
  it("falls back to safe defaults", () => {
    expect(reviewFormat("nonsense")).toBe("story");
    expect(reviewFormat("square")).toBe("square");
    expect(reviewTheme("nonsense", "#a65a2e").id).toBe("roos");
    expect(reviewTheme("brand", "#ff5fb0").id).toBe("brand");
    expect(Object.keys(REVIEW_FORMATS)).toEqual(["story", "post", "square", "strip"]);
    expect(REVIEW_FORMATS.strip.w / REVIEW_FORMATS.strip.h).toBe(4);
  });
  it("mixes colours", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#ff5fb0", "#ffffff", 0)).toBe("#ff5fb0");
  });
});
