import type { ReactNode } from "react";

export type Hair = "low" | "puff" | "bun" | "braids" | "locs" | "cap" | "headwrap" | "bald";
export type Outfit = "tee" | "shirt" | "jacket" | "hoodie" | "dress" | "apron";
export type Pose = "phone" | "chat" | "dance" | "selfie" | "fold" | "hold" | "still" | "basin";

export interface GoerLook {
  skin: string;
  top: string;
  bottom: string;
  hair: Hair;
  hairColor: string;
  outfit: Outfit;
  pose: Pose;
  /** Cap brim, headwrap, inner tee, sneakers */
  accent?: string;
  /** Wider shoulders */
  broad?: boolean;
}

/**
 * A limb that swings from a joint: the joint becomes the group's origin, so rotating the middle group
 * turns the arm about the shoulder and the hand stays on the end of it.
 */
function Swing({ x, y, cls, children }: { x: number; y: number; cls: string; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={cls}>
        <g transform={`translate(${-x} ${-y})`}>{children}</g>
      </g>
    </g>
  );
}

/** Everything in one fill when `mono` is set for the rim-light copy. */
function Body({ l, mono, dark = 0 }: { l: GoerLook; mono?: string; dark?: number }) {
  // Night light changes colour, not coverage: walls must never show through a person.
  const c = (hex: string) => {
    if (mono) return mono;
    const amount = Math.max(0, Math.min(1, dark)) * 0.55;
    const channels = [1, 3, 5].map((start, i) =>
      Math.round(parseInt(hex.slice(start, start + 2), 16) * (1 - amount) + [13, 10, 18][i] * amount),
    );
    return `rgb(${channels.join(",")})`;
  };
  const w = l.broad ? 16 : 13;
  const arm = { stroke: c(l.top), strokeWidth: l.broad ? 6 : 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const hand = (x: number, y: number) => <circle cx={x} cy={y} r="2.6" fill={c(l.skin)} />;
  const arms: Record<Pose, ReactNode> = {
    still: (
      <>
        <path d={`M${-w},-85 L${-w - 3},-62 L${-w - 2},-50`} {...arm} />
        <path d={`M${w},-85 L${w + 3},-62 L${w + 2},-50`} {...arm} />
        {hand(-w - 2, -48)}
        {hand(w + 2, -48)}
      </>
    ),
    fold: (
      <>
        <path d={`M${-w},-85 L${-w - 2},-70 L8,-67`} {...arm} />
        <path d={`M${w},-85 L${w + 2},-70 L-8,-69`} {...arm} />
        {hand(8, -67)}
        {hand(-8, -69)}
      </>
    ),
    phone: (
      <>
        <path d={`M${-w},-85 L${-w - 4},-64 L${-w - 1},-50`} {...arm} />
        <path d={`M${w},-85 L${w + 8},-74 L${w + 4},-96`} {...arm} />
        {hand(-w - 1, -48)}
        {hand(w + 4, -98)}
        <rect x={w} y="-114" width="8" height="13" rx="1.4" fill={c("#141820")} />
        <rect x={w + 1} y="-112" width="6" height="8" rx="0.6" fill={c("#d5e4ff")} />
      </>
    ),
    chat: (
      <>
        <path d={`M${-w},-85 L${-w - 3},-62 L${-w - 2},-50`} {...arm} />
        <Swing x={w} y={-85} cls="swing-gesture">
          <path d={`M${w},-85 L${w + 9},-70 L${w + 18},-77`} {...arm} />
          {hand(w + 18.5, -77.5)}
        </Swing>
        {hand(-w - 2, -48)}
      </>
    ),
    dance: (
      <>
        <Swing x={-w} y={-85} cls="swing-l">
          <path d={`M${-w},-85 L${-w - 9},-100 L${-w - 5},-114`} {...arm} />
          {hand(-w - 5, -115)}
        </Swing>
        <Swing x={w} y={-85} cls="swing-r">
          <path d={`M${w},-85 L${w + 9},-100 L${w + 5},-114`} {...arm} />
          {hand(w + 5, -115)}
        </Swing>
      </>
    ),
    selfie: (
      <>
        <path d={`M${-w},-85 L${-w - 7},-66 L${-w + 1},-56`} {...arm} />
        <path d={`M${w},-85 L${w + 10},-102 L${w + 15},-120`} {...arm} />
        {hand(-w + 1, -56)}
        {hand(w + 15, -121)}
        <rect x={w + 11} y="-131" width="6" height="9" rx="1" fill={c("#0d0a12")} />
      </>
    ),
    hold: (
      <>
        <path d={`M${-w},-85 L${-w - 3},-62 L${-w - 2},-50`} {...arm} />
        <path d={`M${w},-85 L${w + 3},-66 L6,-62`} {...arm} />
        {hand(-w - 2, -48)}
        <path d="M2,-70 L10,-70 L9,-60 L3,-60 Z" fill={c("#b3243a")} />
        {hand(6, -62)}
      </>
    ),
    basin: (
      <>
        <path d={`M${-w},-85 L${-w - 6},-100 L${-w + 2},-116`} {...arm} />
        <path d={`M${w},-85 L${w + 3},-62 L${w + 2},-50`} {...arm} />
        {hand(-w + 2, -117)}
        {hand(w + 2, -48)}
      </>
    ),
  };

  const torso =
    l.outfit === "dress" ? (
      <path d={`M${-w + 1},-88 Q0,-92 ${w - 1},-88 L${w},-60 L19,-30 L-19,-30 L${-w},-60 Z`} fill={c(l.top)} />
    ) : (
      <path d={`M${-w},-88 Q0,-93 ${w},-88 L${w + 1},-45 L${-w - 1},-45 Z`} fill={c(l.top)} />
    );

  return (
    <>
      {/* Legs and shoes */}
      {l.outfit === "dress" ? (
        <path d="M-8,-31 L-7,-2 L-4,-2 L-3,-31 Z M3,-31 L4,-2 L7,-2 L8,-31 Z" fill={c(l.skin)} />
      ) : (
        <path d="M-13,-46 L-12,-2 L-3,-2 L-1,-38 L1,-38 L3,-2 L12,-2 L13,-46 Z" fill={c(l.bottom)} />
      )}
      <ellipse cx="-8" cy="-1" rx="5.5" ry="2.2" fill={c(l.accent && l.outfit !== "dress" ? l.accent : "#0d0a12")} />
      <ellipse cx="8" cy="-1" rx="5.5" ry="2.2" fill={c(l.accent && l.outfit !== "dress" ? l.accent : "#0d0a12")} />

      {l.outfit === "hoodie" && <ellipse cx="0" cy="-90" rx="12" ry="6" fill={c(l.top)} />}
      <rect x="-3.5" y="-93" width="7" height="6" fill={c(l.skin)} />
      {torso}
      {l.outfit === "jacket" && <path d="M-3,-89 L3,-89 L4,-45 L-4,-45 Z" fill={c(l.accent ?? "#efe8da")} />}
      {l.outfit === "shirt" && <path d="M-4,-89 L0,-82 L4,-89" stroke={c("#0d0a12")} strokeWidth="1" fill="none" opacity="0.6" />}
      {l.outfit === "apron" && <path d={`M-9,-80 L9,-80 L10,-38 L-10,-38 Z`} fill={c(l.accent ?? "#efe8da")} />}
      {arms[l.pose]}

      {/* Head. The ear sits behind the skull. Features are drawn later, on top of the night shadow. */}
      {l.hair === "puff" && <circle cx="2" cy="-116" r="8.5" fill={c(l.hairColor)} />}
      {l.hair === "bun" && <circle cx="0" cy="-113" r="4.6" fill={c(l.hairColor)} />}
      <ellipse cx="-8.5" cy="-100" rx="2.4" ry="3.5" fill={c(l.skin)} />
      {!mono && <ellipse cx="-8.5" cy="-100" rx="1.2" ry="2.1" fill="#1a0e0a" opacity="0.22" />}
      <circle cx="0" cy="-101" r="9.5" fill={c(l.skin)} />
      <Hairdo l={l} c={c} />
      {l.pose === "basin" && (
        <g>
          <ellipse cx="0" cy="-113" rx="15" ry="3.5" fill={c("#3b4a8f")} />
          <path d="M-14,-113 Q0,-104 14,-113" fill={c("#2c3870")} />
          {[-9, -4, 1, 6, 10].map((x) => (
            <rect key={x} x={x - 2} y="-120" width="4.5" height="6" rx="1" fill={c("#cfe0ff")} opacity="0.9" />
          ))}
        </g>
      )}
    </>
  );
}

/** A 3/4 face turned toward the door: two eyes, a nose, a mouth. Drawn after the shadow so the night wash doesn't erase it. */
function Features({ l }: { l: GoerLook }) {
  const ink = "#1a0e0a";
  return (
    <g>
      <path d="M-5.8,-105.2 Q-3.6,-104 -1.8,-104.8" stroke={ink} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <path d="M1.2,-105.4 Q3.8,-104 6.4,-105" stroke={ink} strokeWidth="0.85" fill="none" strokeLinecap="round" />
      <ellipse cx="-2.7" cy="-101.6" rx="1.15" ry="0.9" fill="#efe8da" />
      <circle cx="-2.55" cy="-101.55" r="0.55" fill={ink} />
      <ellipse cx="3.9" cy="-101.3" rx="1.4" ry="1.05" fill="#efe8da" />
      <circle cx="4.15" cy="-101.25" r="0.68" fill={ink} />
      <circle cx="4.45" cy="-101.55" r="0.22" fill="#fff" opacity="0.8" />
      <path d="M0.15,-100.5 Q1.35,-97.9 2.7,-100.3" stroke={ink} strokeWidth="0.65" fill="none" strokeLinecap="round" />
      <path d="M0.5,-96.7 Q3.1,-95.4 5.5,-96.6" stroke={ink} strokeWidth="0.75" fill="none" strokeLinecap="round" />
      {l.hair === "bald" && <path d="M-6,-108 Q0,-110.5 6,-108" stroke={l.skin} strokeWidth="0.6" fill="none" opacity="0.5" />}
    </g>
  );
}

function Hairdo({ l, c }: { l: GoerLook; c: (x: string) => string }) {
  const cap = "M-9.8,-102 Q-9.5,-112 0,-112 Q9.5,-112 9.8,-102 Q5,-106.5 0,-106.5 Q-5,-106.5 -9.8,-102 Z";
  switch (l.hair) {
    case "bald":
      return null;
    case "low":
    case "puff":
    case "bun":
      return <path d={cap} fill={c(l.hairColor)} />;
    case "braids":
    case "locs":
      return (
        <g>
          <path d={cap} fill={c(l.hairColor)} />
          <g stroke={c(l.hairColor)} strokeWidth={l.hair === "locs" ? 3 : 2} strokeLinecap="round" fill="none">
            <path d="M-8,-103 Q-11,-92 -10,-80" />
            <path d="M-5,-105 Q-7,-93 -7,-82" />
            <path d="M8,-103 Q10,-95 9,-86" />
            {l.hair === "locs" && <path d="M-2,-106 Q-3,-95 -3,-84" />}
          </g>
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M-10,-105 Q-11,-115 0,-116 Q11,-115 10,-105 Q6,-108.5 0,-109 Q-6,-108.5 -10,-105 Z" fill={c(l.hairColor)} />
          <path d="M1,-106 L18,-103 L7,-102 Z" fill={c(l.accent ?? l.hairColor)} />
        </g>
      );
    case "headwrap":
      return (
        <g>
          <path d="M-11,-101 Q-13,-118 0,-123 Q13,-118 11,-101 Q5,-105 0,-105 Q-5,-105 -11,-101 Z" fill={c(l.accent ?? l.hairColor)} />
          <path d="M3,-121 Q11,-128 13,-119 Q8,-121 5,-117 Z" fill={c(l.accent ?? l.hairColor)} />
        </g>
      );
  }
}

/**
 * A person on the street, in colour but in night light: a copy in the light's colour sits nudged towards the
 * light so a rim traces that edge, then the opaque person with darker fills further back in the scene.
 */
export function Goer({
  x,
  y = 222,
  s,
  look,
  rim,
  flip = false,
  dark = 0.3,
  index,
  gossip = false,
  className = "",
}: {
  x: number;
  y?: number;
  s: number;
  look: GoerLook;
  rim: string;
  flip?: boolean;
  /** Opaque night shading, 0–1 */
  dark?: number;
  /** Tap target id for gossip */
  index?: number;
  gossip?: boolean;
  className?: string;
}) {
  const talker = index !== undefined;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} className={`goer ${className}`} data-person={talker ? index : undefined} style={gossip && talker ? { cursor: "pointer" } : undefined}>
      <ellipse cx="0" cy="1" rx="18" ry="3.5" fill="#000" opacity="0.5" />
      {gossip && talker && <rect x="-24" y="-150" width="48" height="151" fill="transparent" />}
      <g className={look.pose === "dance" ? "goer-bob" : look.pose === "chat" ? "goer-nod" : "goer-idle"}>
        <g transform="translate(1.6 -1.2)" opacity="0.85">
          <Body l={look} mono={rim} />
        </g>
        <Body l={look} dark={dark} />
        <g opacity={Math.max(0.55, 1 - dark * 0.7)}>
          <Features l={look} />
        </g>
        {look.pose === "phone" && (
          <ellipse className="phone" cx={look.broad ? 22 : 18} cy="-106" rx="8" ry="7" fill="#cfe0ff" opacity="0.35" style={{ mixBlendMode: "screen" }} />
        )}
        {look.pose === "selfie" && <circle className="selfie-flash" cx={(look.broad ? 16 : 13) + 14} cy="-127" r="10" fill="#fff" opacity="0" />}
      </g>
      {gossip && talker && (
        <g className="gossip-hint" transform={`translate(0 -146) scale(${flip ? -1 : 1} 1)`}>
          <path d="M-8,-6 h16 a3,3 0 0 1 3,3 v6 a3,3 0 0 1 -3,3 h-9 l-4,4 v-4 h-3 a3,3 0 0 1 -3,-3 v-6 a3,3 0 0 1 3,-3 Z" fill="#efe8da" />
          <g fill="#17141c">
            <circle cx="-4" cy="0" r="1.3" />
            <circle cx="0" cy="0" r="1.3" />
            <circle cx="4" cy="0" r="1.3" />
          </g>
        </g>
      )}
    </g>
  );
}
