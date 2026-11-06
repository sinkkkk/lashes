"use client";

import { useState } from "react";
import { SERVICE_COLOR_PRESETS } from "@/lib/colors";

export type UsedColor = { hex: string; names: string[] };

/**
 * Colour for a service. Colours already used by other services come first, so all services of
 * one lash type (e.g. every Hybrid service) can share a colour with one tap.
 */
export function ServiceColorField({ value, used }: { value: string | null; used: UsedColor[] }) {
  const [color, setColor] = useState<string | null>(value);
  const usedHex = new Set(used.map((u) => u.hex));
  const presets = SERVICE_COLOR_PRESETS.filter((p) => !usedHex.has(p.hex));

  const swatch = (hex: string, title: string) => (
    <button
      key={hex}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={color === hex}
      onClick={() => setColor(hex)}
      className={`h-9 w-9 shrink-0 rounded-full ring-offset-2 transition active:scale-90 ${color === hex ? "ring-2 ring-ink" : ""}`}
      style={{ background: hex }}
    />
  );

  return (
    <div className="col-span-2">
      <input type="hidden" name="color" value={color ?? ""} />
      <span className="mb-1 block text-xs font-medium text-muted">Värv (ripsmetüüp)</span>
      {used.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <span className="block text-[11px] text-muted">Kasutusel</span>
          {used.map((u) => (
            <div key={u.hex} className="flex items-center gap-2">
              {swatch(u.hex, u.names.join(", "))}
              <span className="min-w-0 truncate text-xs text-muted">{u.names.join(", ")}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => swatch(p.hex, p.name))}
        <label className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs ring-1 ring-line">
          <input
            type="color"
            value={color ?? "#9b72cf"}
            onChange={(e) => setColor(e.target.value)}
            className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
          />
          Muu
        </label>
        <button
          type="button"
          onClick={() => setColor(null)}
          className={`h-9 rounded-full px-3 text-xs ring-1 ${color === null ? "bg-ink text-white ring-ink" : "ring-line"}`}
        >
          Põhivärv
        </button>
      </div>
    </div>
  );
}
