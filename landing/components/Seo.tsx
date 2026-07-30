// ============================================================
// Structured-data helpers
// ============================================================
// Small server components that emit JSON-LD. FAQs get FAQPage markup (eligible
// for rich results) and nested pages get a BreadcrumbList so search engines
// understand the hub → dimension hierarchy.

import { SITE_URL } from "@/lib/site";

export interface Faq { q: string; a: string }

export function FaqJsonLd({ faq }: { faq: Faq[] }) {
    if (faq.length === 0) return null;
    const data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
    };
    return (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
    );
}

export function BreadcrumbJsonLd({ trail }: { trail: { name: string; href: string }[] }) {
    const data = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: t.name,
            item: `${SITE_URL}${t.href}`,
        })),
    };
    return (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
    );
}
