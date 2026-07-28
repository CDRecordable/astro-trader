import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://astrotrader.app";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: SITE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ];
}
