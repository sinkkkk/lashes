"use client";
import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          prompt("Kopeeri link:", url);
        }
      }}
      className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-line"
    >
      {copied ? "Kopeeritud ✓" : "Kopeeri"}
    </button>
  );
}
