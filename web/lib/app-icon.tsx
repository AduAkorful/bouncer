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
            color: "#f1eaff",
            fontSize: Math.round(px * (maskable ? 0.46 : 0.58)),
            fontWeight: 700,
            textShadow: `0 0 ${Math.round(px * 0.06)}px #b9a2ff`,
          }}
        >
          B
        </div>
      </div>
    ),
    { width: px, height: px, headers: { "cache-control": "public, max-age=86400, s-maxage=604800" } },
  );
}
