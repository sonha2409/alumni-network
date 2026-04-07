import { ImageResponse } from "next/og";

// F46: Dynamically generated Open Graph image (1200x630). Automatically picked
// up by Next.js as the site-wide default OG image for all pages unless a page
// exports its own opengraph-image. No font fetching needed — ImageResponse
// falls back to a system sans-serif that handles Vietnamese diacritics well
// enough for SEO purposes; swap in a fetched Be Vietnam Pro font if the
// rendering looks off in production.

export const runtime = "edge";
export const alt = "PTNKAlum — Alumni network for Trường Phổ thông Năng khiếu (PTNK)";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #8b5cf6 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            opacity: 0.9,
          }}
        >
          PTNKAlum
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: "900px",
            }}
          >
            The global alumni network for PTNK.
          </div>
          <div
            style={{
              fontSize: "32px",
              lineHeight: 1.3,
              opacity: 0.85,
              maxWidth: "900px",
            }}
          >
            Trường Phổ thông Năng khiếu · VNU-HCM · Est. 1996
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "24px",
            opacity: 0.75,
          }}
        >
          <div>ptnkalum.com</div>
          <div>Verified alumni community</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
