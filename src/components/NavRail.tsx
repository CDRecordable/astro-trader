// ============================================================
// NavRail — the 72px icon rail listing every section
// ============================================================
// Replaces the old two-array sidebar with its Esoteric/Analysis mode toggle.
// Every section is now reachable in one click and nothing is hidden behind a
// mode: the esoteric side keeps its identity through a violet accent instead
// of by making the rest of the app disappear.
//
// Hover flyouts are gone too. They forced the pointer down a narrow corridor,
// vanished if it strayed, and simply don't exist on a touch screen — a
// section's children now open in the persistent sub-sidebar beside the rail.

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Rocket } from "lucide-react";
import { NAV_SECTIONS, activeSection, RAIL_WIDTH, type NavSection } from "@/lib/nav";

function RailItem({ section, active }: { section: NavSection; active: boolean }) {
    const t = useTranslations("nav");
    const accent = section.accent ?? "var(--accent-cyan)";

    return (
        <Link
            href={section.href}
            title={t(section.tKey)}
            aria-current={active ? "page" : undefined}
            className="relative flex flex-col items-center gap-1 px-1 py-2.5 rounded-xl transition-all duration-200 group w-full"
            style={{
                background: active ? "var(--glass-bg)" : "transparent",
                border: active ? "1px solid var(--border-active)" : "1px solid transparent",
            }}
        >
            {/* Active marker on the rail edge — readable without relying on color alone */}
            {active && (
                <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
                    style={{ width: 3, height: 20, background: accent }}
                />
            )}
            <section.icon
                size={19}
                style={{ color: active ? accent : "var(--text-muted)" }}
                className="group-hover:scale-110 transition-transform duration-200"
            />
            <span
                className="text-[9px] font-medium text-center leading-tight px-0.5"
                style={{ color: active ? "var(--text-primary)" : "var(--text-muted)" }}
            >
                {t(section.tKey)}
            </span>
        </Link>
    );
}

export default function NavRail() {
    const pathname = usePathname();
    const t = useTranslations("nav");
    const current = activeSection(pathname);

    const main = NAV_SECTIONS.filter((s) => !s.utility);
    const utility = NAV_SECTIONS.filter((s) => s.utility);

    return (
        <aside
            aria-label={t("primaryNav")}
            className="fixed top-0 left-0 h-full flex flex-col items-center py-4 px-1.5 z-50 overflow-y-auto"
            style={{
                width: RAIL_WIDTH,
                background: "var(--bg-secondary)",
                borderRight: "1px solid var(--border-subtle)",
            }}
        >
            <Link href="/" title={t("home")} className="mb-4 flex flex-col items-center gap-1 group">
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{
                        background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
                        boxShadow: "var(--shadow-glow-cyan)",
                    }}
                >
                    <Rocket size={18} className="text-white" />
                </div>
            </Link>

            <nav className="flex flex-col gap-1 w-full">
                {main.map((s) => (
                    <RailItem key={s.id} section={s} active={current?.id === s.id} />
                ))}
            </nav>

            <div className="flex flex-col gap-1 w-full mt-auto pt-3">
                <div className="h-[1px] w-7 mx-auto mb-1" style={{ background: "var(--border-subtle)" }} />
                {utility.map((s) => (
                    <RailItem key={s.id} section={s} active={current?.id === s.id} />
                ))}
                <span className="text-[9px] mt-2 text-center" style={{ color: "var(--text-muted)" }}>v0.6</span>
            </div>
        </aside>
    );
}
