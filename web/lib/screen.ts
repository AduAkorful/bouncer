import type { Metadata } from "next";

/** One screen's title and description. No preview image. Unfinished pages pass `{ index: false }`. */
export function screen(title: string, description: string, options?: { index?: boolean }): Metadata {
  const index = options?.index !== false;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}
