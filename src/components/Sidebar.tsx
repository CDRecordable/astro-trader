// ============================================================
// Sidebar — Main navigation, split into two app modes:
//   · Esoteric  (cosmic / astro)   → /macro, /wiki
//   · Serious   (fundamental)      → /explorer, /screener, /watchlist, /vix
// ============================================================

"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAppStore } from "@/lib/store";
import type { AppMode } from "@/lib/store";
import {
    LayoutDashboard,
    Telescope,
    Settings,
    TrendingUp,
    Rocket,
    BookOpen,
    Building2,
    Bitcoin,
    Globe2,
    Gauge,
    Moon,
    LineChart,
} from "lucide-react";

type NavItem = { icon: typeof LayoutDashboard; tKey: string; href: string };

const ESOTERIC_NAV: NavItem[] = [
    { icon: Globe2, tKey: "macro", href: "/macro" },
    { icon: BookOpen, tKey: "wiki", href: "/wiki" },
    { icon: Settings, tKey: "settings", href: "/settings" },
];

const SERIOUS_NAV: NavItem[] = [
    { icon: LayoutDashboard, tKey: "explorer", href: "/explorer" },
    { icon: Telescope, tKey: "screener", href: "/screener" },
    { icon: TrendingUp, tKey: "watchlist", href: "/watchlist" },
    { icon: Gauge, tKey: "vix", href: "/vix" },
    { icon: Settings, tKey: "settings", href: "/settings" },
];

/** Which mode a route section belongs to (null = neutral, e.g. wiki/settings). */
function sectionMode(section: string): AppMode | null {
    if (["explorer", "screener", "watchlist", "vix"].includes(section)) return "serious";
    if (section === "macro") return "esoteric";
    return null;
}

export default function Sidebar() {
    const pathname = usePathname();
    const t = useTranslations("nav");
    const { assetClass, setAssetClass, appMode, setAppMode } = useAppStore();

    // Active section from pathname: /[locale]/[section]/...  ("" = home).
    const segments = pathname.split("/");
    const activeSection = segments[2] ?? "";

    // Keep appMode in sync ONLY when deep-linking to a mode-specific route.
    // The home/wiki/settings are neutral → they keep the current mode
    // (default = serious), so entering the app shows the Analysis menu.
    useEffect(() => {
        const m = sectionMode(activeSection);
        if (m && m !== appMode) setAppMode(m);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection]);

    const navItems = appMode === "esoteric" ? ESOTERIC_NAV : SERIOUS_NAV;

    return (
        <aside
            className="fixed top-0 left-0 h-full flex flex-col items-center py-6 px-2 z-50"
            style={{
                width: 72,
                background: "var(--bg-secondary)",
                borderRight: "1px solid var(--border-subtle)",
            }}
        >
            {/* Logo → Home */}
            <Link href="/" title={t("home")} className="mb-5 flex flex-col items-center gap-1 group cursor-pointer">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{
                        background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
                        boxShadow: "var(--shadow-glow-cyan)",
                    }}
                >
                    <Rocket size={20} className="text-white" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--accent-cyan)" }}>
                    Astro
                </span>
            </Link>

            {/* ── App-mode switch ────────────────────────────────── */}
            <div
                className="flex flex-col gap-1 w-full mb-5 p-1 rounded-2xl"
                style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}
            >
                <Link
                    href="/macro"
                    onClick={() => setAppMode("esoteric")}
                    title={t("esoteric")}
                    className="flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all cursor-pointer"
                    style={{
                        background: appMode === "esoteric" ? "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(34,211,238,0.12))" : "transparent",
                        border: appMode === "esoteric" ? "1px solid var(--accent-violet)" : "1px solid transparent",
                    }}
                >
                    <Moon size={16} style={{ color: appMode === "esoteric" ? "var(--accent-violet)" : "var(--text-muted)" }} />
                    <span className="text-[8px] font-semibold" style={{ color: appMode === "esoteric" ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {t("esoteric")}
                    </span>
                </Link>
                <Link
                    href="/explorer"
                    onClick={() => setAppMode("serious")}
                    title={t("serious")}
                    className="flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all cursor-pointer"
                    style={{
                        background: appMode === "serious" ? "linear-gradient(135deg, rgba(52,211,153,0.22), rgba(34,211,238,0.12))" : "transparent",
                        border: appMode === "serious" ? "1px solid var(--accent-emerald)" : "1px solid transparent",
                    }}
                >
                    <LineChart size={16} style={{ color: appMode === "serious" ? "var(--accent-emerald)" : "var(--text-muted)" }} />
                    <span className="text-[8px] font-semibold" style={{ color: appMode === "serious" ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {t("serious")}
                    </span>
                </Link>
            </div>

            {/* Nav Items */}
            <nav className="flex flex-col gap-2 flex-1 w-full">
                {navItems.map((item) => {
                    const isActive = activeSection === item.tKey;
                    return (
                        <Link
                            key={item.tKey}
                            href={item.href}
                            className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl transition-all duration-200 group"
                            style={{
                                background: isActive ? "var(--glass-bg)" : "transparent",
                                border: isActive ? "1px solid var(--border-active)" : "1px solid transparent",
                            }}
                        >
                            <item.icon
                                size={20}
                                style={{ color: isActive ? "var(--accent-cyan)" : "var(--text-muted)" }}
                                className="group-hover:scale-110 transition-transform duration-200"
                            />
                            <span
                                className="text-[10px] font-medium text-center leading-tight"
                                style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}
                            >
                                {t(item.tKey)}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Asset-class toggle — only relevant in serious (analysis) mode */}
            {appMode === "serious" && (
                <div className="flex flex-col gap-2 mt-auto mb-4 w-full">
                    <button
                        onClick={() => setAssetClass("stocks")}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all group cursor-pointer"
                        style={{
                            background: assetClass === "stocks" ? "var(--glass-bg)" : "transparent",
                            border: assetClass === "stocks" ? "1px solid var(--border-active)" : "1px solid transparent",
                        }}
                    >
                        <Building2 size={18} style={{ color: assetClass === "stocks" ? "var(--accent-cyan)" : "var(--text-muted)" }} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-medium" style={{ color: assetClass === "stocks" ? "var(--text-primary)" : "var(--text-muted)" }}>{t("stocks")}</span>
                    </button>
                    <div className="h-[1px] w-8 mx-auto" style={{ background: "var(--border-subtle)" }} />
                    <button
                        onClick={() => setAssetClass("crypto")}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all group cursor-pointer"
                        style={{
                            background: assetClass === "crypto" ? "var(--glass-bg)" : "transparent",
                            border: assetClass === "crypto" ? "1px solid var(--border-active, #f59e0b)" : "1px solid transparent",
                        }}
                    >
                        <Bitcoin size={18} style={{ color: assetClass === "crypto" ? "var(--accent-orange, #f59e0b)" : "var(--text-muted)" }} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-medium" style={{ color: assetClass === "crypto" ? "var(--text-primary)" : "var(--text-muted)" }}>{t("crypto")}</span>
                    </button>
                </div>
            )}

            {/* Version */}
            <span className="text-[9px] mt-3" style={{ color: "var(--text-muted)" }}>v0.5</span>
        </aside>
    );
}
