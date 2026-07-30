// ============================================================
// Site map — the single source of truth for navigation
// ============================================================
// The mega-menu, the footer index and sitemap.xml all read from here, so a
// new page can never be added to one and forgotten in the others. The SEO
// plan behind this structure lives in landing/SEO.md.

export interface SitePage {
    href: string;
    label: string;
    /** One-line description shown in the mega-menu and the footer index. */
    blurb: string;
    /** Column in the navigation menu. */
    group: "analisis" | "herramientas" | "esoterico" | "cuenta";
    /** Hub page this one nests under in the menu (e.g. the esoteric dimensions). */
    parent?: string;
    priority: number;   // sitemap priority
}

export const PAGES: SitePage[] = [
    // ── Análisis fundamental ───────────────────────────────────
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
        blurb: "Tokenomics, ballenas on-chain y comisiones reales del protocolo.",
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
        href: "/screener",
        label: "Screener",
        blurb: "Escanea un universo entero y deja que el algoritmo ordene.",
        group: "analisis",
        priority: 0.8,
    },
    {
        href: "/economia",
        label: "Economía",
        blurb: "EE.UU., Eurozona y España: empleo, inflación y sesgo del banco central.",
        group: "analisis",
        priority: 0.8,
    },
    {
        href: "/vix",
        label: "Volatilidad (VIX)",
        blurb: "Qué hizo históricamente el mercado después de cada nivel de miedo.",
        group: "analisis",
        priority: 0.8,
    },

    // ── Herramientas ───────────────────────────────────────────
    {
        href: "/watchlist",
        label: "Watchlist",
        blurb: "Tu seguimiento con notas, descartes con memoria y análisis guardados.",
        group: "herramientas",
        priority: 0.8,
    },
    {
        href: "/cartera",
        label: "Cartera simulada",
        blurb: "Compra y vende con dinero ficticio a precios reales. Valida tu criterio.",
        group: "herramientas",
        priority: 0.8,
    },
    {
        href: "/ia",
        label: "Capa de IA",
        blurb: "Análisis cualitativo con tu propia API key. Sin predicciones de precio.",
        group: "herramientas",
        priority: 0.8,
    },

    // ── Exploración esotérica ──────────────────────────────────
    {
        href: "/esoterico",
        label: "Análisis esotérico",
        blurb: "Siete dimensiones sobre efemérides reales — con la estadística que dice cuándo no funcionan.",
        group: "esoterico",
        priority: 0.9,
    },
    {
        href: "/esoterico/turbulencia-astral",
        label: "Turbulencia astral",
        blurb: "Aspectos duros de Saturno, Urano y Plutón como índice de tensión.",
        group: "esoterico",
        parent: "/esoterico",
        priority: 0.7,
    },
    {
        href: "/esoterico/ciclos-lunares",
        label: "Ciclos lunares",
        blurb: "Retornos por fase lunar con la metodología de Dichev & Janes.",
        group: "esoterico",
        parent: "/esoterico",
        priority: 0.7,
    },
    {
        href: "/esoterico/mercurio-retrogrado",
        label: "Mercurio retrógrado",
        blurb: "El clásico del folclore financiero, medido de verdad.",
        group: "esoterico",
        parent: "/esoterico",
        priority: 0.7,
    },
    {
        href: "/esoterico/actividad-solar",
        label: "Actividad solar",
        blurb: "Manchas solares del SILSO frente a los regímenes del mercado.",
        group: "esoterico",
        parent: "/esoterico",
        priority: 0.7,
    },
    {
        href: "/esoterico/rotacion-sectorial",
        label: "Rotación sectorial",
        blurb: "Cada sector con su regente planetario tradicional, contrastado con ETFs.",
        group: "esoterico",
        parent: "/esoterico",
        priority: 0.7,
    },
    {
        href: "/esoterico/confluencia-fibonacci",
        label: "Confluencia Fibonacci",
        blurb: "Retrocesos que coinciden con eventos astrológicos, contra un baseline.",
        group: "esoterico",
        parent: "/esoterico",
        priority: 0.7,
    },
    {
        href: "/esoterico/backtester",
        label: "Backtester astral",
        blurb: "«¿Y si operaras con las estrellas?» Simulado contra Buy & Hold.",
        group: "esoterico",
        parent: "/esoterico",
        priority: 0.7,
    },

    // ── Cuenta ─────────────────────────────────────────────────
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
    herramientas: "Herramientas",
    esoterico: "Exploración esotérica",
    cuenta: "Empezar",
};

/** Top-level entries of a group (children hang from their parent in the menu). */
export function topLevel(group: SitePage["group"]): SitePage[] {
    return PAGES.filter((p) => p.group === group && !p.parent);
}

/** Children of a hub page. */
export function childrenOf(href: string): SitePage[] {
    return PAGES.filter((p) => p.parent === href);
}

/** Anchors on the home page, also surfaced in the menu. */
export const HOME_ANCHORS = [
    { href: "/#demo", label: "Demo interactiva" },
    { href: "/#precio", label: "Precio" },
    { href: "/#descargar", label: "Descargar" },
];

export const GITHUB = "https://github.com/CDRecordable/astro-trader";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://astrotrader.app";
