import { ImageResponse } from "next/og";

/**
 * The app icon: the door's neon sign with a B on it. `maskable` keeps the sign inside the middle 80%,
 * so an Android mask can cut the corners without cutting the sign.
 */
export function appIcon(px: number, maskable = false): ImageResponse {
  const pad = Math.round(px * (maskable ? 0.18 : 0.06));
  const frame = Math.max(3, Math.round(px * 0.045));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0a12", padding: pad }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${frame}px solid #8f6bff`,
            borderRadius: Math.round(px * 0.16),
            boxShadow: `0 0 ${Math.round(px * 0.08)}px #8f6bff`,
          }}
        >
          {/* A drawn letter, not text: the default font has no bold weight, so a text B came out as a glow. */}
          <svg width={Math.round(px * (maskable ? 0.4 : 0.5))} height={Math.round(px * (maskable ? 0.4 : 0.5))} viewBox="0 0 100 100">
            <path
              fillRule="evenodd"
              fill="#f1eaff"
              d="M20 8 H58 C78 8 88 20 88 34 C88 44 82 51 73 54 C85 57 92 66 92 76 C92 90 80 92 60 92 H20 Z M40 26 V45 H55 C62 45 66 41 66 35 C66 29 62 26 55 26 Z M40 62 V76 H57 C65 76 70 73 70 69 C70 65 65 62 57 62 Z"
            />
          </svg>
        </div>
      </div>
    ),
    { width: px, height: px, headers: { "cache-control": "public, max-age=86400, s-maxage=604800" } },
  );
}
