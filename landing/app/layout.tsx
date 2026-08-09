import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://astrotrader.app";
const TITLE = "Astro Trader Insights · Análisis de acciones, cripto y ETFs con la nota explicada";
const DESC =
    "Copiloto de inversión que se instala en tu ordenador: puntuación fundamental de acciones, cripto y ETFs UCITS. " +
    "Los datos que faltan puntúan NEUTRO, nunca como fallo. Gratis; la capa de IA se desbloquea una sola vez por 9,90 € y usa tu propia API key.";

export const metadata: Metadata = {
    metadataBase: new URL(SITE),
    title: TITLE,
    description: DESC,
    keywords: [
        "análisis fundamental", "screener de acciones", "análisis de ETFs UCITS",
        "análisis cripto", "tokenomics", "inversión", "software de inversión",
        "watchlist", "cartera simulada", "código abierto",
    ],
    authors: [{ name: "Víctor Balcells" }],
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        locale: "es_ES",
        url: SITE,
        siteName: "Astro Trader Insights",
        title: TITLE,
        description: DESC,
    },
    twitter: { card: "summary_large_image", title: TITLE, description: DESC },
    robots: { index: true, follow: true },
};

export const viewport: Viewport = {
    themeColor: "#0a0c12",
    width: "device-width",
    initialScale: 1,
};

/** Structured data so search engines understand this is a downloadable app. */
const JSON_LD = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Astro Trader Insights",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Windows, macOS, Linux",
    description: DESC,
    offers: [
        { "@type": "Offer", name: "Análisis heurístico", price: "0", priceCurrency: "EUR" },
        { "@type": "Offer", name: "Capa de IA (pago único, de por vida)", price: "9.90", priceCurrency: "EUR" },
    ],
    author: { "@type": "Person", name: "Víctor Balcells" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
                />
                {children}
            </body>
        </html>
    );
}
