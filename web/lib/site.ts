/** The public address of the site, for canonical links, the sitemap, and preview images. Null when it is not known. */
export function siteUrl(): URL | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const raw = explicit || (vercel ? `https://${vercel}` : "");
  try {
    return raw ? new URL(raw) : null;
  } catch {
    return null;
  }
}
