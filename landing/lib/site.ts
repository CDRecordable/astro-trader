// ============================================================
// Site map — the single source of truth for navigation
// ============================================================
// The nav menu, the footer index and sitemap.xml all read from here, so a new
// page can never be added to one and forgotten in the others.

export interface SitePage {
    href: string;
    label: string;
    /** One-line description shown in the mega-menu and the footer index. */
    blurb: string;
    /** Grouping in the navigation menu. */
    group: "analisis" | "esoterico" | "cuenta";
    priority: number;   // sitemap priority
}

export const PAGES: SitePage[] = [
    {
        href: "/acciones",
        label: "Acciones",
        blurb: "Valoración por valor de empresa, solvencia, dilución y timing.",
        group: "analisis",
        priority: 0.9,
    },
    {
        href: "/cripto",
        label: "Cripto",
        blurb: "Tokenomics, ballenas on-chain, comisiones reales del protocolo.",
        group: "analisis",
        priority: 0.9,
    },
    {
        href: "/etfs",
        label: "ETFs",
        blurb: "57 fondos UCITS: coste real, qué hay dentro y a qué precio.",
        group: "analisis",
        priority: 0.9,
    },
    {
        href: "/esoterico",
        label: "Análisis esotérico",
        blurb: "Siete dimensiones sobre efemérides astronómicas reales — con la estadística que dice cuándo no funcionan.",
        group: "esoterico",
        priority: 0.9,
    },
    {
        href: "/licencia",
        label: "Mi licencia",
        blurb: "Comprueba o recupera tu clave. Sin cuentas ni contraseñas.",
        group: "cuenta",
        priority: 0.5,
    },
];

export const GROUP_LABEL: Record<SitePage["group"], string> = {
    analisis: "Análisis fundamental",
    esoterico: "Exploración esotérica",
    cuenta: "Tu licencia",
};

/** Anchors on the home page, also surfaced in the menu. */
export const HOME_ANCHORS = [
    { href: "/#demo", label: "Demo interactiva" },
    { href: "/#precio", label: "Precio" },
    { href: "/#descargar", label: "Descargar" },
];

export const GITHUB = "https://github.com/CDRecordable/astro-trader";
