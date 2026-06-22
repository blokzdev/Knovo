import type { MetadataRoute } from "next";
import { listPublished } from "@/lib/artifacts/public";

const SITE = "https://www.knovo.ai";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await listPublished(1000);
  const artifactRoutes: MetadataRoute.Sitemap = items.map((a) => ({
    url: `${SITE}/a/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : undefined,
  }));

  return [
    { url: SITE },
    { url: `${SITE}/explore` },
    { url: `${SITE}/legal/privacy` },
    { url: `${SITE}/legal/terms` },
    ...artifactRoutes,
  ];
}
