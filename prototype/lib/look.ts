// A bouncer's appearance, built from parts. Looks are cosmetic only: they never change a verdict.

export const SKINS = ["#3b2417", "#4a2e1f", "#6b4430", "#8a5a3c", "#a8754f", "#c99a72"] as const;

export type Build = "broad" | "stocky" | "wiry";
export type Head = "bald" | "lowcut" | "afro" | "braids" | "duku" | "cap" | "beanie";
export type Eyewear = "shades" | "readers" | "none";
export type Outfit = "suit" | "bomber" | "kente" | "hivis" | "irongate";
export type Extra = "none" | "lanyard" | "toothpick" | "flashlight";
export type Neon = "uv" | "rope" | "chalk";

export interface Look {
  name: string;
  catchphrase: string;
  build: Build;
  skin: number;
  head: Head;
  headColor: string;
  eyewear: Eyewear;
  outfit: Outfit;
  earpiece: boolean;
  extra: Extra;
}

export const SAM: Look = {
  name: "Big Sam",
  catchphrase: "Invoice or walk.",
  build: "broad",
  skin: 1,
  head: "bald",
  headColor: "#2a1a10",
  eyewear: "shades",
  outfit: "suit",
  earpiece: true,
  extra: "none",
};

export const PAT: Look = {
  name: "Auntie Pat",
  catchphrase: "I read every line, my dear.",
  build: "stocky",
  skin: 3,
  head: "duku",
  headColor: "#b3243a",
  eyewear: "readers",
  outfit: "bomber",
  earpiece: true,
  extra: "none",
};

// Madam Efua keeps the back office on boss nights: the second gate.
export const EFUA: Look = {
  name: "Madam Efua",
  catchphrase: "Mm. Invoice.",
  build: "wiry",
  skin: 0,
  head: "afro",
  headColor: "#1c120c",
  eyewear: "readers",
  outfit: "kente",
  earpiece: false,
  extra: "none",
};

export interface Option<T> {
  value: T;
  label: string;
  /** Earned items show how to unlock them; nothing here can be bought for an advantage. */
  locked?: string;
}

export const PARTS = {
  build: [
    { value: "broad", label: "Broad" },
    { value: "stocky", label: "Stocky" },
    { value: "wiry", label: "Wiry" },
  ] as Option<Build>[],
  head: [
    { value: "bald", label: "Bald" },
    { value: "lowcut", label: "Low cut" },
    { value: "afro", label: "Afro" },
    { value: "braids", label: "Braids" },
    { value: "duku", label: "Duku" },
    { value: "cap", label: "Cap" },
    { value: "beanie", label: "Beanie" },
  ] as Option<Head>[],
  eyewear: [
    { value: "shades", label: "Shades" },
    { value: "readers", label: "Readers" },
    { value: "none", label: "None" },
  ] as Option<Eyewear>[],
  outfit: [
    { value: "suit", label: "Black suit" },
    { value: "bomber", label: "Bomber" },
    { value: "kente", label: "Kente trim" },
    { value: "hivis", label: "Hi-vis" },
    { value: "irongate", label: "Iron Gate", locked: "Survive 7 nights uncracked" },
  ] as Option<Outfit>[],
  extra: [
    { value: "none", label: "None" },
    { value: "lanyard", label: "Lanyard" },
    { value: "toothpick", label: "Toothpick" },
    { value: "flashlight", label: "Flashlight" },
  ] as Option<Extra>[],
};

export const HEAD_COLORS = ["#2a1a10", "#b3243a", "#3b4a8f", "#2c6e49", "#efe8da", "#8f6bff"];

export const NEONS: { value: Neon; label: string; stroke: string; fill: string }[] = [
  { value: "uv", label: "UV", stroke: "#b9a2ff", fill: "#cbb8ff" },
  { value: "rope", label: "Red", stroke: "#ff6b82", fill: "#ff9aab" },
  { value: "chalk", label: "White", stroke: "#efe8da", fill: "#fff8ea" },
];
