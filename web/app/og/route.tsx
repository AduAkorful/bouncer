import { ImageResponse } from "next/og";

/** A share card: the page's title on the night sign, with an optional line under it. Plain text only. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get("t") ?? "Bouncer").slice(0, 60);
  const line = (url.searchParams.get("l") ?? "Get a bill past the door.").slice(0, 120);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#0d0a12", color: "#efe8da", padding: 64 }}>
        <div style={{ fontSize: 28, letterSpacing: 8, color: "#cfa349" }}>BOUNCER</div>
        <div style={{ marginTop: 24, padding: "24px 48px", border: "6px solid #8f6bff", borderRadius: 24, fontSize: 76, color: "#e2d6ff", textAlign: "center" }}>{title.toUpperCase()}</div>
        <div style={{ marginTop: 32, fontSize: 34, color: "#efe8da", opacity: 0.85, textAlign: "center" }}>{line}</div>
        <div style={{ marginTop: 40, fontSize: 26, color: "#b3243a", border: "4px solid #b3243a", padding: "8px 20px", transform: "rotate(-3deg)" }}>NOT APPROVED.</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
