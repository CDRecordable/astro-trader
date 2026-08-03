// ============================================================
// SubSidebar — persistent secondary panel for a section's children
// ============================================================
// Generalizes the panel that only /macro had. Because it stays open instead
// of appearing on hover, there is room for readable labels, a section title
// and a blurb — and it works on a touch screen, which the old flyouts did not.
//
// Collapsible, because on a laptop 72 + 208px of chrome is a real bite out of
// a wide table. The choice is remembered.

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
    childNamespace, isChildActive, RAIL_WIDTH, SUBSIDEBAR_WIDTH, type NavSection,
} from "@/lib/nav";

export default function SubSidebar({
    section, collapsed, onToggle,
}: {
    section: NavSection;
    collapsed: boolean;
    onToggle: () => void;
}) {
    const pathname = usePathname();
    const tNav = useTranslations("nav");
    const tChild = useTranslations(childNamespace(section));
    const accent = section.accent ?? "var(--accent-cyan)";

    // Collapsed → a slim strip with just the re-open affordance, so the panel
    // can always be brought back from where it disappeared.
    if (collapsed) {
        return (
            <div
                className="no-print fixed top-0 h-full z-40 flex justify-center pt-4"
                style={{ left: RAIL_WIDTH, width: 20, borderRight: "1px solid var(--border-subtle)", background: "var(--bg-primary)" }}
            >
                <button
                    type="button"
                    onClick={onToggle}
                    title={tNav("expandPanel")}
                    aria-label={tNav("expandPanel")}
                    className="p-1 rounded-md transition-colors hover:bg-white/5 cursor-pointer"
                >
                    <PanelLeftOpen size={13} style={{ color: "var(--text-muted)" }} />
                </button>
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.aside
                key={section.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.16 }}
                aria-label={tNav(section.tKey)}
                className="fixed top-0 h-full z-40 flex flex-col py-4 px-2.5 overflow-y-auto"
                style={{
                    left: RAIL_WIDTH,
                    width: SUBSIDEBAR_WIDTH,
                    background: "var(--bg-primary)",
                    borderRight: "1px solid var(--border-subtle)",
                }}
            >
                <div className="flex items-center justify-between mb-3 px-1.5">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
                        {tNav(section.tKey)}
                    </h2>
                    <button
                        type="button"
                        onClick={onToggle}
                        title={tNav("collapsePanel")}
                        aria-label={tNav("collapsePanel")}
                        className="p-1 rounded-md transition-colors hover:bg-white/5 cursor-pointer"
                    >
                        <PanelLeftClose size={13} style={{ color: "var(--text-muted)" }} />
                    </button>
                </div>

                <nav className="flex flex-col gap-0.5">
                    {section.children?.map((child) => {
                        const active = isChildActive(pathname, child.href);
                        return (
                            <Link
                                key={child.href}
                                href={child.href}
                                aria-current={active ? "page" : undefined}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 group"
                                style={{
                                    background: active ? "var(--glass-bg)" : "transparent",
                                    border: active ? "1px solid var(--border-active)" : "1px solid transparent",
                                }}
                            >
                                <child.icon
                                    size={15}
                                    className="shrink-0 group-hover:scale-110 transition-transform"
                                    style={{ color: active ? accent : "var(--text-muted)" }}
                                />
                                <span
                                    className="text-[11.5px] font-medium leading-tight"
                                    style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
                                >
                                    {tChild(child.tKey)}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {section.blurbKey && (
                    <div className="mt-5 px-1.5">
                        <div className="h-[1px] w-full mb-2.5" style={{ background: "var(--border-subtle)" }} />
                        <p className="text-[9px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            {tNav(section.blurbKey)}
                        </p>
                    </div>
                )}
            </motion.aside>
        </AnimatePresence>
    );
}
