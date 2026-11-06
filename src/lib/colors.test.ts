import { describe, expect, it } from "vitest";
import { SERVICE_COLOR_PRESETS, cleanColor, readableText } from "./colors";

describe("cleanColor", () => {
  it("keeps #rrggbb and rejects everything else", () => {
    expect(cleanColor("#9B72CF")).toBe("#9b72cf");
    for (const bad of ["", "red", "#fff", "#12345z", null, undefined, "#9b72cf;x"]) expect(cleanColor(bad)).toBeNull();
  });
});

describe("readableText", () => {
  it("uses white on dark colours and dark text on light ones", () => {
    expect(readableText("#24170f")).toBe("#ffffff");
    expect(readableText("#8e4b8a")).toBe("#ffffff");
    expect(readableText("#ffd6e7")).toBe("#24170f");
    expect(readableText("#f5e050")).toBe("#24170f");
  });
  it("every preset gives readable text (contrast at least 3:1)", () => {
    const lum = (hex: string) => {
      const ch = (i: number) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
    };
    for (const p of SERVICE_COLOR_PRESETS) {
      const [a, b] = [lum(p.hex), lum(readableText(p.hex))].sort((x, y) => y - x);
      expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(3);
    }
  });
});
