/**
 * The crowds a sponsor can put in the queue. A crowd is data: what people wear on a night out there, the range
 * of people in the line, how they wear their hair, how they stand, and the wall and street sign by the door.
 * Adding a crowd is one entry here; the sponsor form lists every entry. The index is what a card stores, so
 * entries are only ever added at the end.
 */

export type Hair = "low" | "puff" | "bun" | "braids" | "locs" | "cap" | "headwrap" | "bald";
export type Pose = "phone" | "chat" | "dance" | "selfie" | "fold" | "hold" | "still" | "basin";
export type Outfit = "tee" | "shirt" | "jacket" | "hoodie" | "dress" | "apron";

export type Crowd = {
  id: string;
  label: string;
  /** Accra is the queue as drawn; every other crowd redresses it. */
  original?: boolean;
  tops: string[];
  bottom: string;
  skins: string[];
  hair: Hair[];
  poses: Pose[];
  /** What a person who is not in a dress wears: a coat on a cold night, a tee on a warm one. */
  layer: Outfit;
  accent: string;
  /** The order the six crowd people stand in, so each crowd's line looks different. */
  order: number[];
  brick: "block" | "stock" | "red" | "render";
  plate?: { text: string; ground: string; ink: string };
};

export const CROWDS: Crowd[] = [
  {
    id: "accra",
    label: "Accra night out",
    original: true,
    tops: [],
    bottom: "#1d1727",
    skins: [],
    hair: [],
    poses: [],
    layer: "tee",
    accent: "#efe8da",
    order: [0, 1, 2, 3, 4, 5],
    brick: "block",
  },
  {
    id: "london",
    label: "London night out",
    tops: ["#2a2234", "#3a3f4a", "#5b3a2e", "#1f3a4a", "#4a2a3a", "#2e3a2a"],
    bottom: "#17141c",
    skins: ["#f1c9a5", "#c99a72", "#6b4430", "#e0b08a", "#3b2417", "#a8754f", "#f5d6bc", "#8a5a3c", "#d9a07a", "#4a2e1f"],
    hair: ["bun", "low", "cap", "puff", "bald", "locs"],
    poses: ["phone", "still", "hold", "fold", "chat", "phone"],
    layer: "jacket",
    accent: "#efe8da",
    order: [3, 0, 5, 1, 4, 2],
    brick: "stock",
    plate: { text: "HIGH ST", ground: "#efe8da", ink: "#17141c" },
  },
  {
    id: "lagos",
    label: "Lagos night out",
    tops: ["#e9b52a", "#b3243a", "#2c6e49", "#8f6bff", "#e07a2a", "#efe8da"],
    bottom: "#1d1727",
    skins: ["#3b2417", "#4a2e1f", "#6b4430", "#2e1c12", "#8a5a3c", "#5a3826"],
    hair: ["headwrap", "low", "braids", "cap", "headwrap", "bald"],
    poses: ["selfie", "dance", "chat", "phone", "dance", "hold"],
    layer: "shirt",
    accent: "#cfa349",
    order: [5, 2, 0, 4, 1, 3],
    brick: "render",
  },
  {
    id: "nairobi",
    label: "Nairobi night out",
    tops: ["#b3243a", "#1f3a4a", "#cfa349", "#2a2234", "#2c6e49", "#5b3a2e"],
    bottom: "#17141c",
    skins: ["#3b2417", "#4a2e1f", "#6b4430", "#8a5a3c", "#a8754f", "#2e1c12"],
    hair: ["low", "puff", "cap", "braids", "bald", "bun"],
    poses: ["chat", "phone", "fold", "hold", "selfie", "still"],
    layer: "jacket",
    accent: "#e9b52a",
    order: [1, 4, 2, 5, 0, 3],
    brick: "render",
  },
  {
    id: "new-york",
    label: "New York night out",
    tops: ["#17141c", "#3b4a8f", "#2a2234", "#b3243a", "#3a3f4a", "#efe8da"],
    bottom: "#17141c",
    skins: ["#f1c9a5", "#3b2417", "#c99a72", "#8a5a3c", "#e0b08a", "#6b4430", "#a8754f", "#f5d6bc"],
    hair: ["cap", "locs", "bun", "low", "puff", "bald"],
    poses: ["phone", "fold", "chat", "still", "phone", "hold"],
    layer: "hoodie",
    accent: "#e9b52a",
    order: [2, 5, 1, 3, 0, 4],
    brick: "red",
    plate: { text: "MAIN ST", ground: "#1f6b3a", ink: "#efe8da" },
  },
  {
    id: "paris",
    label: "Paris night out",
    tops: ["#17141c", "#3a3f4a", "#5b3a2e", "#efe8da", "#2a2234", "#4a2a3a"],
    bottom: "#17141c",
    skins: ["#f1c9a5", "#e0b08a", "#8a5a3c", "#f5d6bc", "#c99a72", "#4a2e1f"],
    hair: ["bun", "low", "puff", "bun", "bald", "braids"],
    poses: ["still", "chat", "phone", "fold", "hold", "chat"],
    layer: "jacket",
    accent: "#b3243a",
    order: [4, 1, 3, 0, 5, 2],
    brick: "render",
    plate: { text: "RUE DE NUIT", ground: "#1d3a7a", ink: "#efe8da" },
  },
  {
    id: "tokyo",
    label: "Tokyo night out",
    tops: ["#17141c", "#efe8da", "#e9a0b8", "#3a3f4a", "#9fc4dc", "#2a2234"],
    bottom: "#17141c",
    skins: ["#f1d2b0", "#e8c39b", "#f5d6bc", "#dcb48c", "#eccaa6", "#e0b892"],
    hair: ["bun", "low", "cap", "bun", "low", "puff"],
    poses: ["phone", "still", "phone", "selfie", "hold", "still"],
    layer: "jacket",
    accent: "#e9a0b8",
    order: [0, 3, 1, 4, 2, 5],
    brick: "render",
  },
  {
    id: "rio",
    label: "Rio night out",
    tops: ["#e9b52a", "#2c6e49", "#efe8da", "#e07a2a", "#3b4a8f", "#b3243a"],
    bottom: "#3b4a8f",
    skins: ["#c99a72", "#6b4430", "#e0b08a", "#3b2417", "#a8754f", "#f1c9a5", "#8a5a3c"],
    hair: ["puff", "locs", "low", "braids", "bun", "cap"],
    poses: ["dance", "selfie", "dance", "chat", "phone", "dance"],
    layer: "tee",
    accent: "#efe8da",
    order: [5, 3, 1, 0, 2, 4],
    brick: "render",
  },
  {
    id: "mumbai",
    label: "Mumbai night out",
    tops: ["#b3243a", "#e9b52a", "#2c6e49", "#8f6bff", "#efe8da", "#1f3a4a"],
    bottom: "#17141c",
    skins: ["#a8754f", "#8a5a3c", "#c99a72", "#6b4430", "#d9a07a", "#4a2e1f"],
    hair: ["bun", "low", "braids", "bun", "cap", "low"],
    poses: ["chat", "selfie", "phone", "hold", "dance", "still"],
    layer: "shirt",
    accent: "#cfa349",
    order: [1, 3, 5, 0, 2, 4],
    brick: "render",
  },
];

export function crowdAt(index: number): Crowd {
  return CROWDS[index] ?? CROWDS[0];
}

type Look = { skin: string; top: string; bottom: string; hair: Hair; hairColor: string; outfit: Outfit; pose: Pose; accent?: string; broad?: boolean };

/**
 * One person redressed for a crowd. `i` is their place in the queue. A dress stays a dress; everyone else
 * wears the crowd's layer. The original crowd is returned as drawn.
 */
export function crowdLook<T extends Look>(crowd: Crowd, look: T, i: number, keepPose = false): T {
  if (crowd.original) return look;
  const outfit: Outfit = look.outfit === "dress" ? "dress" : crowd.layer;
  return {
    ...look,
    outfit,
    top: crowd.tops[i % crowd.tops.length],
    bottom: crowd.bottom,
    skin: crowd.skins[i % crowd.skins.length],
    hair: crowd.hair[i % crowd.hair.length],
    pose: keepPose ? look.pose : crowd.poses[i % crowd.poses.length],
    accent: outfit === "jacket" ? crowd.accent : look.accent,
  };
}
