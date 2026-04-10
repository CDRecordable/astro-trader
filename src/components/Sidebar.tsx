// ============================================================
// Sidebar - Main navigation sidebar (Link-based routing)
// ============================================================

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAppStore } from "@/lib/store";
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
} from "lucide-react";

const NAV_ITEMS: { icon: typeof LayoutDashboard; tKey: string; href: string }[] = [
    { icon: Globe2, tKey: "macro", href: "/macro" },
    { icon: LayoutDashboard, tKey: "explorer", href: "/explorer" },
    { icon: Telescope, tKey: "screener", href: "/screener" },
    { icon: TrendingUp, tKey: "watchlist", href: "/macro" }, // placeholder
    { icon: BookOpen, tKey: "wiki", href: "/wiki" },
    { icon: Settings, tKey: "settings", href: "/macro" }, // placeholder
];

export default function Sidebar() {
    const pathname = usePathname();
    const t = useTranslations("nav");
    const { assetClass, setAssetClass } = useAppStore();

    // Determine active section from pathname
    // Pattern: /[locale]/[section]/... → segment at index 2
    const segments = pathname.split("/");
    const activeSection = segments[2] || "macro";

    return (
        <>
            {/* ── Primary Sidebar (72px) ─────────────────────────── */}
            <aside
                className="fixed top-0 left-0 h-full flex flex-col items-center py-6 px-2 z-50"
                style={{
                    width: 72,
                    background: "var(--bg-secondary)",
                    borderRight: "1px solid var(--border-subtle)",
                }}
            >
                {/* Logo */}
                <div className="mb-8 flex flex-col items-center gap-1">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
                            boxShadow: "var(--shadow-glow-cyan)",
                        }}
                    >
                        <Rocket size={20} className="text-white" />
                    </div>
                    <span
                        className="text-[9px] font-bold uppercase tracking-[0.15em]"
                        style={{ color: "var(--accent-cyan)" }}
                    >
                        Astro
                    </span>
                </div>

                {/* Nav Items */}
                <nav className="flex flex-col gap-2 flex-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeSection === item.tKey ||
                            (item.tKey === "macro" && activeSection === "macro");
                        // Disable placeholder items
                        const isPlaceholder = item.tKey === "watchlist" || item.tKey === "settings";

                        if (isPlaceholder) {
                            return (
                                <div
                                    key={item.tKey}
                                    className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl opacity-40 cursor-not-allowed"
                                >
                                    <item.icon
                                        size={20}
                                        style={{ color: "var(--text-muted)" }}
                                    />
                                    <span
                                        className="text-[10px] font-medium"
                                        style={{ color: "var(--text-muted)" }}
                                    >
                                        {t(item.tKey)}
                                    </span>
                                </div>
                            );
                        }

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
                                    style={{
                                        color: isActive ? "var(--accent-cyan)" : "var(--text-muted)",
                                    }}
                                    className="group-hover:scale-110 transition-transform duration-200"
                                />
                                <span
                                    className="text-[10px] font-medium"
                                    style={{
                                        color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                                    }}
                                >
                                    {t(item.tKey)}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Global Context Toggle */}
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

                {/* Version */}
                <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                    v0.4
                </span>
            </aside>
        </>
    );
}
