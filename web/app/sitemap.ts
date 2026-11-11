import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { readPublicEnv } from "@/lib/config";
import { readDoorIndex } from "@/lib/door-index";
import { pageRpc } from "@/lib/page-rpc";
import { siteUrl } from "@/lib/site";

const PAGES = ["/", "/home", "/fame", "/how-it-works", "/sponsors", "/vip"];

/** The public pages, and each door that has been opened. A door the chain cannot be read for is left out, not guessed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The clock and the chain are read per request, so a door opened after the build is listed.
  await connection();
  const site = siteUrl();
  if (!site) return [];
  const entries: MetadataRoute.Sitemap = PAGES.map((path) => ({ url: new URL(path, site).toString(), changeFrequency: "daily" as const }));
  const labels = readPublicEnv(process.env);
  if (!labels.ok) return entries;
  const index = await readDoorIndex(pageRpc(labels.env), labels.env.contractId, Date.now()).catch(() => null);
  if (!index || !index.ok) return entries;
  for (const door of index.doors) {
    if (door.read) entries.push({ url: new URL(`/v/${encodeURIComponent(door.id)}`, site).toString(), changeFrequency: "daily" as const });
  }
  return entries;
}
