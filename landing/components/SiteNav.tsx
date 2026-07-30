"use client";

// ============================================================
// SiteNav — full-width mega-menu, one entry per product landing
// ============================================================
// Golfmanager-style: "Explorar" opens a four-column panel where every feature
// of the product has its own described link. The columns and their contents
// come from lib/site.ts, so the menu is always in sync with the sitemap.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { topLevel, childrenOf, GROUP_LABEL, HOME_ANCHORS, type SitePage } from "@/lib/site";
import { VoxelScene, MARK_VOXELS } from "./Voxel";

const COLUMNS: { group: SitePage["group"]; accent: string }[] = [
    { group: "analisis", accent: "var(--cyan)" },
    { group: "herramientas", accent: "var(--emerald)" },
    { group: "esoterico", accent: "var(--violet)" },
    { group: "cuenta", accent: "var(--amber)" },
];

function MenuEntry({ page, accent, compact, onNavigate }: {
    page: SitePage; accent: string; compact?: boolean; onNavigate: () => void;
}) {
    return (
        <Link
            href={page.href}
            onClick={onNavigate}
            className={`block rounded-lg transition-colors hover:bg-white/[0.05] ${compact ? "px-2.5 py-1.5" : "px-3 py-2.5"}`}
        >
            <span className={`font-semibold block ${compact ? "text-xs" : "text-sm mb-0.5"}`}>
                {compact && <span className="mr-1.5" style={{ color: accent }}>·</span>}
                {page.label}
            </span>
            {!compact && (
                <span className="text-[11px] leading-snug block" style={{ color: "var(--text-mute)" }}>
                    {page.blurb}
                </span>
            )}
        </Link>
    );
}

export default function SiteNav() {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    return (
        <nav
            className="sticky top-0 z-50 backdrop-blur-xl"
            style={{ background: "rgba(10,12,18,0.78)", borderBottom: "1px solid var(--border)" }}
        >
            <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={close}>
                    <VoxelScene cubes={MARK_VOXELS} size={26} shadow={false} />
                    <span className="text-sm font-bold tracking-tight">Astro Trader</span>
                </Link>

                <div className="flex items-center gap-1 sm:gap-4">
                    <button
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={open}
                        aria-haspopup="true"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:bg-white/[0.06]"
                        style={{ color: open ? "var(--text)" : "var(--text-soft)" }}
                    >
                        Producto
                        <span className="inline-block transition-transform text-[9px]" style={{ transform: open ? "rotate(180deg)" : "none" }}>▼</span>
                    </button>

                    <Link href="/#demo" onClick={close} className="hidden sm:block text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-white/[0.06]" style={{ color: "var(--text-soft)" }}>
                        Demo
                    </Link>
                    <Link href="/#precio" onClick={close} className="hidden sm:block text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-white/[0.06]" style={{ color: "var(--text-soft)" }}>
                        Precio
                    </Link>
                    <Link
                        href="/#descargar"
                        onClick={close}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-transform hover:scale-[1.03]"
                        style={{ background: "linear-gradient(120deg, var(--cyan), var(--violet))", color: "#06080d" }}
                    >
                        Descargar
                    </Link>
                </div>
            </div>

            {/* Mega-menu */}
            {open && (
                <>
                    <button
                        aria-label="Cerrar menú"
                        onClick={close}
                        className="fixed inset-0 z-40 cursor-default"
                        style={{ background: "rgba(0,0,0,0.45)", top: 56 }}
                    />
                    <div
                        className="absolute left-0 right-0 z-50 rise max-h-[calc(100vh-56px)] overflow-y-auto"
                        style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border-strong)" }}
                    >
                        <div className="max-w-6xl mx-auto px-5 py-7 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-7">
                            {COLUMNS.map(({ group, accent }) => {
                                const items = topLevel(group);
                                if (items.length === 0) return null;
                                return (
                                    <div key={group}>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-3 px-3" style={{ color: accent }}>
                                            {GROUP_LABEL[group]}
                                        </p>
                                        <ul className="space-y-0.5">
                                            {items.map((p) => {
                                                const kids = childrenOf(p.href);
                                                return (
                                                    <li key={p.href}>
                                                        <MenuEntry page={p} accent={accent} onNavigate={close} />
                                                        {kids.length > 0 && (
                                                            <ul className="mt-1 mb-2 ml-2 pl-2 space-y-px" style={{ borderLeft: "1px solid var(--border)" }}>
                                                                {kids.map((k) => (
                                                                    <li key={k.href}>
                                                                        <MenuEntry page={k} accent={accent} compact onNavigate={close} />
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                            {group === "cuenta" && HOME_ANCHORS.map((a) => (
                                                <li key={a.href}>
                                                    <Link href={a.href} onClick={close}
                                                        className="block rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/[0.05]">
                                                        {a.label}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
}
