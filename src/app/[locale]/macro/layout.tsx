"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    Moon,
    RotateCcw,
    FlaskConical,
    Sun,
} from "lucide-react";

const MACRO_SUB_ITEMS = [
    { icon: Activity, sub: "overview", emoji: "🎯", tKey: "overview" },
    { icon: Activity, sub: "turbulence", emoji: "⚡", tKey: "turbulence" },
    { icon: Moon, sub: "lunar", emoji: "🌑", tKey: "lunar" },
    { icon: RotateCcw, sub: "mercury", emoji: "☿", tKey: "mercury" },
    { icon: Sun, sub: "solar", emoji: "☀", tKey: "solar" },
    { icon: Activity, sub: "sectors", emoji: "📊", tKey: "sectors" },
    { icon: Activity, sub: "fibonacci", emoji: "🌀", tKey: "fibonacci" },
    { icon: FlaskConical, sub: "backtest", emoji: "🧪", tKey: "backtest" },
] as const;

export default function MacroLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const t = useTranslations("macroNav");

    // Determine active sub from pathname
    const pathSegments = pathname.split("/");
    // Pattern: /[locale]/macro/[sub] → segment at index 3
    const activeSub = pathSegments[3] || "overview";

    return (
        <div className="flex">
            {/* ── Macro Sub-Navigation (180px) ─────────── */}
            <AnimatePresence>
                <motion.aside
                    initial={{ x: -180, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -180, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed top-0 h-full z-40 flex flex-col py-6 px-3"
                    style={{
                        left: 72,
                        width: 180,
                        background: "var(--bg-primary)",
                        borderRight: "1px solid var(--border-subtle)",
                    }}
                >
                    <div className="mb-6">
                        <h2
                            className="text-[10px] font-bold uppercase tracking-[0.15em] px-2"
                            style={{ color: "var(--text-muted)" }}
                        >
                            {t("title")}
                        </h2>
                    </div>

                    <nav className="flex flex-col gap-1">
                        {MACRO_SUB_ITEMS.map((item) => {
                            const href =
                                item.sub === "overview"
                                    ? "/macro"
                                    : `/macro/${item.sub}`;
                            const isActive = activeSub === item.sub || (activeSub === "macro" && item.sub === "overview");
                            return (
                                <Link
                                    key={item.sub}
                                    href={href}
                                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group"
                                    style={{
                                        background: isActive
                                            ? "var(--glass-bg)"
                                            : "transparent",
                                        border: isActive
                                            ? "1px solid var(--border-active)"
                                            : "1px solid transparent",
                                    }}
                                >
                                    <span className="text-sm">
                                        {item.emoji}
                                    </span>
                                    <span
                                        className="text-xs font-medium"
                                        style={{
                                            color: isActive
                                                ? "var(--text-primary)"
                                                : "var(--text-muted)",
                                        }}
                                    >
                                        {t(item.tKey)}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Decorative separator */}
                    <div className="mt-6 px-2">
                        <div
                            className="h-[1px] w-full"
                            style={{ background: "var(--border-subtle)" }}
                        />
                        <p
                            className="text-[9px] mt-3 leading-relaxed"
                            style={{ color: "var(--text-muted)" }}
                        >
                            {t("description")}
                        </p>
                    </div>
                </motion.aside>
            </AnimatePresence>

            {/* ── Main content (offset by sidebar + sub-nav) ── */}
            <div style={{ marginLeft: 252, width: "calc(100% - 252px)" }}>
                {children}
            </div>
        </div>
    );
}
