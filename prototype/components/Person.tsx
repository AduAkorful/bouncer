export type PersonKind = "tall" | "puff" | "cap" | "braids" | "barman";

/** Silhouettes, feet at (0,0), facing the door (to the right). */
function Shape({ kind }: { kind: PersonKind }) {
  switch (kind) {
    case "tall":
      return (
        <>
          <circle cx="0" cy="-106" r="11" />
          <path d="M-18,-90 Q0,-98 18,-90 L20,-44 L12,-44 L11,0 L1,0 L0,-40 L-1,0 L-11,0 L-12,-44 L-20,-44 Z" />
          {/* arm up, phone to the face */}
          <path d="M14,-88 Q24,-74 16,-62 L10,-66 Q14,-74 8,-84 Z" />
          <rect x="9" y="-108" width="5" height="9" rx="1" transform="rotate(14 11 -103)" />
        </>
      );
    case "puff":
      return (
        <>
          <circle cx="2" cy="-114" r="8.5" />
          <circle cx="0" cy="-99" r="10" />
          <path d="M-13,-86 Q0,-92 13,-86 L17,-40 L-17,-40 Z" />
          <path d="M-9,-40 L-8,0 L-3,0 L-2,-40 Z M2,-40 L3,0 L8,0 L9,-40 Z" />
          <ellipse cx="-16" cy="-56" rx="6" ry="5" />
          <path d="M-16,-61 Q-12,-80 -8,-84" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </>
      );
    case "cap":
      return (
        <>
          <circle cx="0" cy="-96" r="11" />
          <path d="M-11,-99 Q-10,-110 0,-110 Q11,-110 11,-99 Z M4,-101 L19,-99 L11,-97 Z" />
          <path d="M-20,-80 Q0,-88 20,-80 L23,-38 L14,-38 L12,0 L2,0 L0,-34 L-2,0 L-12,0 L-14,-38 L-23,-38 Z" />
        </>
      );
    case "braids":
      return (
        <>
          <circle cx="0" cy="-98" r="10" />
          <path d="M-9,-100 Q-14,-80 -12,-68 L-7,-68 Q-8,-82 -5,-96 Z M7,-102 Q12,-84 10,-72 L6,-72 Q6,-86 3,-98 Z" />
          <path d="M-14,-84 Q0,-90 14,-84 L16,-48 L20,-20 L-20,-20 L-16,-48 Z" />
          <path d="M-10,-20 L-9,0 L-4,0 L-3,-20 Z M3,-20 L4,0 L9,0 L10,-20 Z" />
        </>
      );
    case "barman":
      return (
        <>
          <circle cx="0" cy="-104" r="11" />
          <path d="M-20,-88 Q0,-96 20,-88 L22,-42 L12,-42 L11,0 L1,0 L0,-38 L-1,0 L-11,0 L-12,-42 L-22,-42 Z" />
          <path d="M18,-86 Q30,-66 22,-50 L16,-54 Q20,-66 12,-80 Z" />
          <rect x="-12" y="-74" width="24" height="34" rx="2" opacity="0.6" />
        </>
      );
  }
}

/**
 * Someone in the queue: drawn twice, once in the light's colour and once in shadow nudged away from it,
 * so a thin rim of light traces the edge that faces the door.
 */
export function Person({
  x,
  y,
  s,
  kind,
  rim,
  flip = false,
  index,
  gossip = false,
  dark = "#08060c",
}: {
  x: number;
  y: number;
  s: number;
  kind: PersonKind;
  rim: string;
  flip?: boolean;
  index?: number;
  gossip?: boolean;
  dark?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} className="queue-person" data-person={index} style={gossip ? { cursor: "pointer" } : undefined}>
      <ellipse cx="0" cy="1" rx="20" ry="4" fill="#000" opacity="0.5" />
      {gossip && <rect x="-22" y="-145" width="44" height="146" fill="transparent" />}
      <g fill={rim} color={rim} opacity="0.75">
        <Shape kind={kind} />
      </g>
      <g fill={dark} color={dark} transform="translate(-1.6 1.1)">
        <Shape kind={kind} />
      </g>
      {kind === "tall" && <ellipse className="phone" cx="6" cy="-104" rx="7" ry="6" fill="#cfe0ff" opacity="0.28" />}
      {gossip && (
        <g className="gossip-hint" transform={`translate(0 -132) scale(${flip ? -1 : 1} 1)`}>
          <circle r="11" fill="transparent" />
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
