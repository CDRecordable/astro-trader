// ============================================================
// SiteFooter — shared footer, doubles as the crawlable site index
// ============================================================

import Link from "next/link";
import { PAGES, GROUP_LABEL, HOME_ANCHORS, GITHUB, type SitePage } from "@/lib/site";
import { VoxelScene, MARK_VOXELS } from "./Voxel";

const GROUPS: SitePage["group"][] = ["analisis", "esoterico", "cuenta"];

export default function SiteFooter() {
    return (
        <footer style={{ borderTop: "1px solid var(--border)", background: "var(--bg-soft)" }}>
            <div className="max-w-6xl mx-auto px-5 py-11">
                {/* Index — real links, so crawlers reach every page from anywhere */}
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-7 mb-9">
                    <div>
                        <Link href="/" className="flex items-center gap-2.5 mb-3">
                            <VoxelScene cubes={MARK_VOXELS} size={24} shadow={false} />
                            <span className="text-sm font-bold">Astro Trader</span>
                        </Link>
                        <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-mute)" }}>
                            Análisis fundamental y exploración esotérica, en tu propio ordenador.
                        </p>
                    </div>

                    {GROUPS.map((g) => {
                        const items = PAGES.filter((p) => p.group === g);
                        if (items.length === 0) return null;
                        return (
                            <div key={g}>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: "var(--text-mute)" }}>
                                    {GROUP_LABEL[g]}
                                </p>
                                <ul className="space-y-1.5">
                                    {items.map((p) => (
                                        <li key={p.href}>
                                            <Link href={p.href} className="text-xs hover:text-white transition-colors" style={{ color: "var(--text-soft)" }}>
                                                {p.label}
                                            </Link>
                                        </li>
                                    ))}
                                    {g === "cuenta" && (
                                        <>
                                            {HOME_ANCHORS.map((a) => (
                                                <li key={a.href}>
                                                    <Link href={a.href} className="text-xs hover:text-white transition-colors" style={{ color: "var(--text-soft)" }}>
                                                        {a.label}
                                                    </Link>
                                                </li>
                                            ))}
                                            <li>
                                                <a href={GITHUB} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs hover:text-white transition-colors" style={{ color: "var(--text-soft)" }}>
                                                    GitHub
                                                </a>
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </div>
                        );
                    })}
                </div>

                <p className="text-[11px] leading-relaxed mb-3" style={{ color: "var(--text-mute)" }}>
                    <strong style={{ color: "var(--text-soft)" }}>Esto no es asesoramiento financiero.</strong> Astro Trader
                    Insights es una herramienta de investigación y educación. Los datos pueden estar incompletos o ser
                    erróneos; verifica siempre antes de invertir. Los mercados —y las criptomonedas muy en particular—
                    son altamente especulativos y puedes perder tu dinero.
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-mute)" }}>
                    © {new Date().getFullYear()} Víctor Balcells · Licencia MIT
                </p>
            </div>
        </footer>
    );
}
