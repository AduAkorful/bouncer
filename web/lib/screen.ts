import type { Metadata } from "next";

/** One screen's title and description. No preview image. */
export function screen(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}
