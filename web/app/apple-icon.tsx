import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0a12", color: "#e2d6ff", fontSize: 110, border: "10px solid #8f6bff", borderRadius: 36 }}>B</div>
    ),
    size,
  );
}
