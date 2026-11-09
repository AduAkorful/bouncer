import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** The public pages. Door pages change every night, so they are found through /home and its door list. */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteUrl();
  if (!site) return [];
  return ["/", "/home", "/fame", "/sponsors", "/vip"].map((path) => ({ url: new URL(path, site).toString(), changeFrequency: "daily" as const }));
}
