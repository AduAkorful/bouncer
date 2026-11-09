import type { Metadata } from "next";

/**
 * One screen's title and description, with a preview image drawn from the title. Unfinished pages pass
 * `{ index: false }`. A page that knows its own address passes `path`, which becomes its canonical link.
 */
export function screen(title: string, description: string, options?: { index?: boolean; path?: string; line?: string }): Metadata {
  const index = options?.index !== false;
  const image = `/og?t=${encodeURIComponent(title)}${options?.line ? `&l=${encodeURIComponent(options.line)}` : ""}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    ...(options?.path ? { alternates: { canonical: options.path } } : {}),
    ...(index ? {} : { robots: { index: false, follow: true } }),
  };
}
