"use client";

// ============================================================
// SiteNav — shared navigation with an indexed mega-menu
// ============================================================
// Every page in lib/site.ts appears here automatically, grouped and described,
// so the menu doubles as a human-readable index of the site.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PAGES, GROUP_LABEL, HOME_ANCHORS, type SitePage } from "@/lib/site";
import { VoxelScene, MARK_VOXELS } from "./Voxel";

const GROUPS: SitePage["group"][] = ["analisis", "esoterico", "cuenta"];

export default function SiteNav() {
    const [open, setOpen] = useState(false);

    // Close the menu on Escape and whenever the route changes under it.
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
                <Link href="/" className="flex items-center gap-2.5 shrink-0">
                    <VoxelScene cubes={MARK_VOXELS} size={26} shadow={false} />
                    <span className="text-sm font-bold tracking-tight">Astro Trader</span>
                </Link>

                <div className="flex items-center gap-1 sm:gap-4">
                    {/* Mega-menu trigger */}
                    <button
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={open}
                        aria-haspopup="true"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors hover:bg-white/[0.06]"
                        style={{ color: "var(--text-soft)" }}
                    >
                        Explorar
                        <span
                            className="inline-block transition-transform text-[9px]"
                            style={{ transform: open ? "rotate(180deg)" : "none" }}
                        >
                            ▼
                        </span>
                    </button>

                    <Link
                        href="/#demo"
                        className="hidden sm:block text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                        style={{ color: "var(--text-soft)" }}
                    >
                        Demo
                    </Link>
                    <Link
                        href="/#precio"
                        className="hidden sm:block text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
                        style={{ color: "var(--text-soft)" }}
                    >
                        Precio
                    </Link>
                    <Link
                        href="/#descargar"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-transform hover:scale-[1.03]"
                        style={{ background: "linear-gradient(120deg, var(--cyan), var(--violet))", color: "#06080d" }}
                    >
                        Descargar
                    </Link>
                </div>
            </div>

            {/* Mega-menu: the full site index */}
            {open && (
                <>
                    <button
                        aria-label="Cerrar menú"
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-40 cursor-default"
                        style={{ background: "rgba(0,0,0,0.4)", top: 56 }}
                    />
                    <div
                        className="absolute left-0 right-0 z-50 rise"
                        style={{ background: "var(--bg-soft)", borderBottom: "1px solid var(--border-strong)" }}
                    >
                        <div className="max-w-6xl mx-auto px-5 py-7 grid md:grid-cols-3 gap-7">
                            {GROUPS.map((g) => {
                                const items = PAGES.filter((p) => p.group === g);
                                if (items.length === 0) return null;
                                return (
                                    <div key={g}>
                                        <p
                                            className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-3"
                                            style={{ color: g === "esoterico" ? "var(--violet)" : "var(--cyan)" }}
                                        >
                                            {GROUP_LABEL[g]}
                                        </p>
                                        <ul className="space-y-1">
                                            {items.map((p) => (
                                                <li key={p.href}>
                                                    <Link
                                                        href={p.href}
                                                        onClick={() => setOpen(false)}
                                                        className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                                                    >
                                                        <span className="text-sm font-semibold block mb-0.5">{p.label}</span>
                                                        <span className="text-[11px] leading-snug block" style={{ color: "var(--text-mute)" }}>
                                                            {p.blurb}
                                                        </span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}

                            <div className="md:col-span-3 pt-4 flex flex-wrap gap-x-6 gap-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                                {HOME_ANCHORS.map((a) => (
                                    <Link
                                        key={a.href}
                                        href={a.href}
                                        onClick={() => setOpen(false)}
                                        className="text-xs hover:text-white transition-colors"
                                        style={{ color: "var(--text-soft)" }}
                                    >
                                        {a.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </nav>
    );
}
