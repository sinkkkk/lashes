import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { isAdmin } from "@/lib/auth";
import { db, type Review } from "@/lib/db";
import { REVIEW_FORMATS, quoteFontSize, reviewFormat, reviewTheme } from "@/lib/reviewThemes";
import { site } from "@/lib/site";
import { getTheme } from "@/lib/theme";

/**
 * A review as an image (PNG) for Instagram / TikTok, made in admin → Reviews.
 * ?format=story|post|square & theme=<id>. Admin only.
 */
const FONT_DIR = join(process.cwd(), "src", "assets", "fonts");
// Each font is split in two files: basic Latin, and "Ext" with Estonian letters (õ ä ö ü š ž).
// They need different names (the image renderer keeps one file per name), so every
// fontFamily below lists the "Ext" file as a fallback.
type Font = { name: string; data: Buffer; weight: 400 | 500 | 600; style: "normal" | "italic" };
let fontsPromise: Promise<Font[]> | null = null;
function loadFonts() {
  const f = (file: string, name: string, weight: Font["weight"], style: Font["style"]) =>
    readFile(join(FONT_DIR, file)).then((data) => ({ name, data, weight, style }));
  fontsPromise ??= Promise.all([
    f("cormorant-garamond-latin-600-normal.woff", "Cormorant", 600, "normal"),
    f("cormorant-garamond-latin-ext-600-normal.woff", "CormorantExt", 600, "normal"),
    f("cormorant-garamond-latin-500-italic.woff", "Cormorant", 500, "italic"),
    f("cormorant-garamond-latin-ext-500-italic.woff", "CormorantExt", 500, "italic"),
    f("inter-latin-400-normal.woff", "Inter", 400, "normal"),
    f("inter-latin-ext-400-normal.woff", "InterExt", 400, "normal"),
    f("inter-latin-600-normal.woff", "Inter", 600, "normal"),
    f("inter-latin-ext-600-normal.woff", "InterExt", 600, "normal"),
  ]);
  return fontsPromise;
}

const STAR = "M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z";

export async function GET(req: Request, ctx: RouteContext<"/api/admin/review-image/[id]">) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [review] = (await db()`select * from reviews where id = ${id}`) as unknown as Review[];
  if (!review) return new Response("Not found", { status: 404 });

  const q = new URL(req.url).searchParams;
  const format = reviewFormat(q.get("format"));
  const { w, h, scale } = REVIEW_FORMATS[format];
  const [fonts, look] = await Promise.all([loadFonts(), getTheme()]);
  const t = reviewTheme(q.get("theme"), look.accent);
  const s = (n: number) => Math.round(n * scale);
  const text = review.text.trim();
  const domain = site.url.replace(/^https?:\/\//, "");

  if (format === "strip") {
    // Thin 4:1 sticker with rounded, transparent corners: stars + name, the review, and the lash logo.
    const strip = new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              gap: 36,
              padding: "30px 44px",
              borderRadius: 56,
              backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})`,
              color: t.text,
              fontFamily: "Inter, InterExt",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} width={36} height={36} viewBox="0 0 20 20">
                      <path d={STAR} fill={t.star} opacity={i <= review.rating ? 1 : 0.22} />
                    </svg>
                  ))}
                </div>
                <div style={{ display: "flex", fontWeight: 600, fontSize: 26, color: t.muted }}>— {review.name_display}</div>
              </div>
              {text && (
                <div
                  style={{
                    display: "block",
                    marginTop: 12,
                    fontFamily: "Cormorant, CormorantExt",
                    fontStyle: "italic",
                    fontWeight: 500,
                    fontSize: quoteFontSize(text, "strip"),
                    lineHeight: 1.15,
                    lineClamp: 3,
                    overflow: "hidden",
                  }}
                >
                  {text}
                </div>
              )}
            </div>
            <svg width={84} height={42} viewBox="0 0 64 32" fill="none" stroke={t.star} strokeWidth="2.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <path d="M4 10c8 12 48 12 56 0" />
              <path d="M12 16.5l-3 7M20 19.5l-1.6 7.5M28 21l-.4 7.6M36 21l.4 7.6M44 19.5l1.6 7.5M52 16.5l3 7" />
            </svg>
          </div>
        </div>
      ),
      { width: w, height: h, fonts },
    );
    strip.headers.set("Cache-Control", "private, max-age=300");
    return strip;
  }

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: `${s(120)}px ${s(96)}px ${s(96)}px`,
          backgroundImage: `linear-gradient(180deg, ${t.from}, ${t.to})`,
          color: t.text,
          fontFamily: "Inter, InterExt",
        }}
      >
        {/* Review */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: "Cormorant, CormorantExt", fontWeight: 600, fontSize: s(300), lineHeight: 0.8, height: s(170), color: t.quote }}>“</div>
          <div style={{ display: "flex", gap: s(14), marginTop: s(24) }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <svg key={i} width={s(64)} height={s(64)} viewBox="0 0 20 20">
                <path d={STAR} fill={t.star} opacity={i <= review.rating ? 1 : 0.22} />
              </svg>
            ))}
          </div>
          {text && (
            <div
              style={{
                display: "flex",
                marginTop: s(48),
                fontFamily: "Cormorant, CormorantExt",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: quoteFontSize(text, format),
                lineHeight: 1.22,
              }}
            >
              {text}
            </div>
          )}
          <div style={{ display: "flex", marginTop: s(44), fontWeight: 600, fontSize: s(40), color: t.muted }}>— {review.name_display}</div>
        </div>

        {/* Footer: lash logo + business name + website */}
        <div style={{ display: "flex", alignItems: "center", gap: s(22), marginTop: s(48) }}>
          <svg width={s(88)} height={s(44)} viewBox="0 0 64 32" fill="none" stroke={t.star} strokeWidth="2.6" strokeLinecap="round">
            <path d="M4 10c8 12 48 12 56 0" />
            <path d="M12 16.5l-3 7M20 19.5l-1.6 7.5M28 21l-.4 7.6M36 21l.4 7.6M44 19.5l1.6 7.5M52 16.5l3 7" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Cormorant, CormorantExt", fontWeight: 600, fontSize: s(50), lineHeight: 1.05 }}>{site.name}</div>
            <div style={{ display: "flex", fontSize: s(28), color: t.muted, marginTop: s(4) }}>{domain}</div>
          </div>
        </div>
      </div>
    ),
    { width: w, height: h, fonts },
  );
  image.headers.set("Cache-Control", "private, max-age=300");
  return image;
}
