import type { MetadataRoute } from "next";
import { PAGES } from "@/lib/site";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://astrotrader.app";

/** Built from the same page registry the navigation uses, so a new page is
 *  indexed the moment it appears in the menu — the two can't drift apart. */
export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
        ...PAGES.map((p) => ({
            url: `${SITE}${p.href}`,
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: p.priority,
        })),
    ];
}
