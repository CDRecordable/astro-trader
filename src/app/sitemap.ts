import { MetadataRoute } from "next";

const BASE_URL = "https://astro-trader.vercel.app";

const locales = ["en", "es"];

const routes = [
    "/macro",
    "/macro/turbulence",
    "/macro/lunar",
    "/macro/mercury",
    "/macro/solar",
    "/macro/sectors",
    "/macro/fibonacci",
    "/macro/backtest",
    "/explorer",
    "/screener",
    "/wiki",
];

export default function sitemap(): MetadataRoute.Sitemap {
    const entries: MetadataRoute.Sitemap = [];

    for (const route of routes) {
        for (const locale of locales) {
            entries.push({
                url: `${BASE_URL}/${locale}${route}`,
                lastModified: new Date(),
                changeFrequency: route === "/macro" ? "daily" : "weekly",
                priority: route === "/macro" ? 1.0 : 0.8,
                alternates: {
                    languages: Object.fromEntries(
                        locales.map((l) => [l, `${BASE_URL}/${l}${route}`])
                    ),
                },
            });
        }
    }

    return entries;
}
