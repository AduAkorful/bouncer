import type { ReactNode } from "react";
import type { BoardId } from "@/lib/street-kit";

/**
 * The board by the door that shows tonight's pot, in the style the sponsor picked. The pot itself is drawn by
 * the children at the same spot (centred on x 306), so every style shows the same amount.
 */
export function PotBoard({ style, title, children }: { style: BoardId; title: string; children: ReactNode }) {
  const heading = (fill: string) => (
    <text x="306" y="170" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="4.4" fill={fill} opacity="0.9">
      {title}
    </text>
  );
  if (style === "neon") {
    return (
      <g>
        <rect x="280" y="156" width="52" height="54" rx="6" fill="#0b0810" />
        <rect x="282" y="158" width="48" height="50" rx="5" fill="none" stroke="#ff4fa3" strokeWidth="5" strokeOpacity="0.25" />
        <rect x="282" y="158" width="48" height="50" rx="5" fill="none" stroke="#ff4fa3" strokeWidth="1.4" />
        <path d="M296,210 L292,224 M316,210 L320,224" stroke="#2a2234" strokeWidth="2.5" />
        {heading("#ffb3d6")}
        {children}
      </g>
    );
  }
  if (style === "brass") {
    return (
      <g>
        <path d="M290,224 L298,160 M322,224 L314,160 M306,224 L306,206" stroke="#cfa349" strokeWidth="2.5" />
        <rect x="282" y="156" width="48" height="52" rx="2" fill="#efe8da" stroke="#cfa349" strokeWidth="2.5" />
        <rect x="285" y="159" width="42" height="46" fill="none" stroke="#cfa349" strokeWidth="0.6" />
        <g filter="none">
          {heading("#17141c")}
          <g style={{ filter: "brightness(0.35) saturate(1.6)" }}>{children}</g>
        </g>
      </g>
    );
  }
  if (style === "lightbox") {
    return (
      <g>
        <path d="M288,224 L288,210 M324,224 L324,210" stroke="#3a3145" strokeWidth="3" />
        <rect x="279" y="154" width="54" height="56" rx="3" fill="#fff8e8" />
        <rect x="279" y="154" width="54" height="56" rx="3" fill="none" stroke="#17141c" strokeWidth="2" />
        <ellipse cx="306" cy="182" rx="40" ry="36" fill="#fff8e8" opacity="0.12" />
        {heading("#17141c")}
        <g style={{ filter: "brightness(0.3) saturate(1.4)" }}>{children}</g>
      </g>
    );
  }
  return (
    <g>
      <path d="M282,224 L290,166 M330,224 L322,166" stroke="#5a4630" strokeWidth="3" />
      <rect x="281" y="156" width="50" height="58" rx="3" fill="#1b2420" stroke="#5a4630" strokeWidth="3" />
      <g transform="rotate(-3 306 185)">
        {heading("#efe8da")}
        {children}
      </g>
    </g>
  );
}
