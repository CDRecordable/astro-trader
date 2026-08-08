// ============================================================
// PrintReport — download the full analysis as a PDF
// ============================================================
// Uses the browser's own print-to-PDF rather than a PDF library: the report
// is already laid out on screen, so a dedicated print stylesheet (see the
// @media print block in globals.css) turns it into a clean light-theme
// document — no extra dependency, no server round-trip, and it keeps working
// as the detail views evolve.

"use client";

import React, { useEffect } from "react";
import { useTranslations } from "next-intl";
import { FileDown } from "lucide-react";

/** Button that triggers the browser's print/save-as-PDF dialog. */
export function PrintButton() {
    const t = useTranslations("printReport");

    // Charts size themselves to their container, and the print layout is
    // narrower than the screen. Nudging a resize on beforeprint lets the
    // auto-resizing chart instances re-measure before the snapshot is taken,
    // so they aren't clipped at the page margin.
    useEffect(() => {
        const nudge = () => window.dispatchEvent(new Event("resize"));
        window.addEventListener("beforeprint", nudge);
        window.addEventListener("afterprint", nudge);
        return () => {
            window.removeEventListener("beforeprint", nudge);
            window.removeEventListener("afterprint", nudge);
        };
    }, []);

    const print = () => {
        // Let the resize settle (and hover styles clear) before printing.
        window.dispatchEvent(new Event("resize"));
        setTimeout(() => window.print(), 150);
    };

    return (
        <button onClick={print} title={t("tooltip")} className="header-action">
            <FileDown size={14} style={{ color: "var(--accent-cyan)", opacity: 0.8 }} />
            <span>{t("button")}</span>
        </button>
    );
}

/**
 * Header and footer that exist only on the printed page: they give the PDF an
 * identity (asset, date, source) that the on-screen chrome would otherwise
 * provide, and carry the disclaimer onto every printed copy.
 */
export function PrintHeader({ ticker, name, subtitle }: {
    ticker: string;
    name: string;
    subtitle?: string;
}) {
    const t = useTranslations("printReport");
    // Rendered at print time by the browser; the date is stamped on the client.
    const today = new Date().toLocaleDateString("es-ES", {
        day: "2-digit", month: "long", year: "numeric",
    });

    return (
        <>
            <header className="print-only print-header">
                <div>
                    <p className="print-brand">Astro Trader Insights</p>
                    <h1 className="print-title">{ticker} · {name}</h1>
                    {subtitle && <p className="print-sub">{subtitle}</p>}
                </div>
                <p className="print-date">{t("generatedOn", { date: today })}</p>
            </header>
            <p className="print-only print-disclaimer">{t("disclaimer")}</p>
        </>
    );
}
