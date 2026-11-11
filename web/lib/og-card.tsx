import { ImageResponse } from "next/og";
import { clipText } from "@/lib/clip-text";

/**
 * Share cards. Every word on a card comes from the chain or the board, never from the URL, so the
 * card cannot be used to put someone else's message under the Bouncer name (QA R21 R-04).
 */

export type CardText = { sign: string; line: string; detail?: string; stamp?: { text: string; color: string } };

const DAY = 60 * 60 * 24;


export function cardResponse(text: CardText, maxAgeSeconds: number): ImageResponse {
  const sign = text.sign.slice(0, 40).toUpperCase();
  const size = sign.length > 24 ? 52 : sign.length > 14 ? 64 : 80;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#0d0a12", color: "#efe8da", padding: 64, backgroundImage: "radial-gradient(circle at 50% 38%, #2a1c3d 0%, #0d0a12 62%)" }}>
        <div style={{ fontSize: 26, letterSpacing: 10, color: "#cfa349" }}>BOUNCER</div>
        <div style={{ marginTop: 28, padding: "22px 52px", border: "6px solid #8f6bff", borderRadius: 28, fontSize: size, color: "#f1eaff", textAlign: "center", boxShadow: "0 0 48px #8f6bff" }}>{sign}</div>
        <div style={{ marginTop: 34, fontSize: 36, color: "#efe8da", textAlign: "center", maxWidth: 1000 }}>{clipText(text.line, 90)}</div>
        {text.detail ? <div style={{ marginTop: 14, fontSize: 28, color: "#efe8da", opacity: 0.7, textAlign: "center", maxWidth: 1000 }}>{clipText(text.detail, 120)}</div> : null}
        {text.stamp ? (
          <div style={{ marginTop: 36, fontSize: 28, color: text.stamp.color, border: `4px solid ${text.stamp.color}`, padding: "8px 22px", transform: "rotate(-3deg)" }}>{text.stamp.text}</div>
        ) : null}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "cache-control": `public, max-age=${Math.min(maxAgeSeconds, 300)}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${DAY}` },
    },
  );
}

export const DEFAULT_CARD: CardText = { sign: "Bouncer", line: "Get a bill past the door.", detail: "Free to play on NEAR testnet.", stamp: { text: "NOT APPROVED.", color: "#b3243a" } };
