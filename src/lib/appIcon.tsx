import { ImageResponse } from "next/og";

/** The lash logo as a square app icon (home screen, browser tab, admin app). */
export function appIcon(size: number) {
  const art = Math.round(size * 0.74);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#24170f" }}>
        <svg width={art} height={art} viewBox="0 0 64 64" fill="none" stroke="#d99266" strokeWidth="3.6" strokeLinecap="round">
          <path d="M9 22c9 13 37 13 46 0" />
          <path d="M15 28l-3.5 7M23.5 31l-1.5 8M32 32.5v8.5M40.5 31l1.5 8M49 28l3.5 7" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
