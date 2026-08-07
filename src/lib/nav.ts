// ============================================================
// Navigation registry — ONE source of truth for the app menu
// ============================================================
// The menu used to be defined in three unrelated places: two arrays in
// Sidebar.tsx that swapped wholesale on an "app mode" toggle, hover flyouts
// for the grouped entries, and a hand-rolled 180px sub-nav hardcoded inside
// the /macro layout. Sixteen destinations reached through three different
// mechanisms, with half of them invisible at any given moment.
//
// Now: the rail lists every SECTION, and a section with children opens them
// in a persistent secondary sidebar — the pattern /macro already proved,
// generalized. Mirrors what landing/lib/site.ts does for the public site.

import {
    LayoutDashboard, Telescope, Settings, TrendingUp, BookOpen, Gauge,
    Moon, Wallet, Landmark, Activity, Search, Home, Sun, RotateCcw,
    FlaskConical, Sparkles, Waves, Spline, CandlestickChart,
} from "lucide-react";

export type NavIcon = typeof LayoutDashboard;

export interface NavChild {
    /** Key inside the section's i18n namespace. */
    tKey: string;
    href: string;
    icon: NavIcon;
}

export interface NavSection {
    /** Stable id, also used to resolve the active section from the URL. */
    id: string;
    icon: NavIcon;
    /** Key inside the `nav` i18n namespace. */
    tKey: string;
    /** Destination when the section itself is clicked. */
    href: string;
    /** Rendered in the secondary sidebar. Empty → the section is a plain link. */
    children?: NavChild[];
    /** i18n key (namespace `nav`) for the blurb under the sub-sidebar title. */
    blurbKey?: string;
    /** Utility sections are pinned to the bottom of the rail. */
    utility?: boolean;
    /** Accent used for the section in the rail and sub-sidebar. */
    accent?: string;
}

export const NAV_SECTIONS: NavSection[] = [
    { id: "home", icon: Home, tKey: "home", href: "/" },
    {
        id: "explore",
        icon: Search,
        tKey: "explorerGroup",
        href: "/explorer",
        children: [
            { tKey: "explorerSingle", href: "/explorer", icon: LayoutDashboard },
            { tKey: "screener", href: "/screener", icon: Telescope },
        ],
    },
    {
        id: "market",
        icon: Activity,
        tKey: "macroIndicatorsFull",
        href: "/vix",
        children: [
            { tKey: "vix", href: "/vix", icon: Gauge },
            { tKey: "economy", href: "/economy", icon: Landmark },
        ],
    },
    { id: "technical", icon: CandlestickChart, tKey: "technical", href: "/technical" },
    { id: "watchlist", icon: TrendingUp, tKey: "watchlist", href: "/watchlist" },
    { id: "portfolio", icon: Wallet, tKey: "portfolio", href: "/portfolio" },
    {
        // The esoteric side is no longer hidden behind a mode toggle: it is a
        // section like any other, marked out by its own violet accent.
        id: "esoteric",
        icon: Moon,
        tKey: "esoteric",
        href: "/macro",
        accent: "var(--accent-violet)",
        blurbKey: "esotericBlurb",
        children: [
            { tKey: "overview", href: "/macro", icon: Sparkles },
            { tKey: "turbulence", href: "/macro/turbulence", icon: Waves },
            { tKey: "lunar", href: "/macro/lunar", icon: Moon },
            { tKey: "mercury", href: "/macro/mercury", icon: RotateCcw },
            { tKey: "solar", href: "/macro/solar", icon: Sun },
            { tKey: "sectors", href: "/macro/sectors", icon: Activity },
            { tKey: "fibonacci", href: "/macro/fibonacci", icon: Spline },
            { tKey: "backtest", href: "/macro/backtest", icon: FlaskConical },
        ],
    },
    { id: "wiki", icon: BookOpen, tKey: "wiki", href: "/wiki", utility: true },
    { id: "settings", icon: Settings, tKey: "settings", href: "/settings", utility: true },
];

/**
 * The esoteric children live under /macro/* and are labelled in the
 * `macroNav` namespace; everything else is labelled in `nav`.
 */
export function childNamespace(section: NavSection): "nav" | "macroNav" {
    return section.id === "esoteric" ? "macroNav" : "nav";
}

/** First path segment after the locale: "/es/macro/lunar" → "macro". */
export function sectionSlug(pathname: string): string {
    return pathname.split("/")[2] ?? "";
}

const SLUG_TO_SECTION: Record<string, string> = {
    "": "home",
    explorer: "explore",
    screener: "explore",
    vix: "market",
    economy: "market",
    technical: "technical",
    watchlist: "watchlist",
    portfolio: "portfolio",
    macro: "esoteric",
    wiki: "wiki",
    settings: "settings",
};

export function activeSection(pathname: string): NavSection | undefined {
    const id = SLUG_TO_SECTION[sectionSlug(pathname)];
    return NAV_SECTIONS.find((s) => s.id === id);
}

/**
 * Which child is active. Compares full paths so `/macro` (overview) doesn't
 * light up for `/macro/lunar`, and ignores the locale prefix.
 */
export function isChildActive(pathname: string, href: string): boolean {
    const withoutLocale = "/" + pathname.split("/").slice(2).join("/");
    return withoutLocale.replace(/\/$/, "") === href.replace(/\/$/, "");
}

/**
 * Sections where the stocks / crypto / ETFs switch means something. It is a
 * content FILTER, not a destination, so it belongs in the content header
 * rather than in the navigation rail where it used to sit.
 */
export const ASSET_AWARE_SECTIONS = new Set(["explore", "watchlist", "portfolio"]);

// ── Layout constants (shared by the shell and its panels) ────
export const RAIL_WIDTH = 72;
export const SUBSIDEBAR_WIDTH = 208;
