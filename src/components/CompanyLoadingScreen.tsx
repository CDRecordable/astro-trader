// ============================================================
// CompanyLoadingScreen — intermediate loading screen for the Explorer
// ============================================================
// Shown between hitting search and the detail appearing. The fetch is a
// single request (no granular progress), so the bar ramps toward ~92% and
// the parent unmounts this when the data arrives — a friendly, clear wait.

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Search, Building2, Bitcoin } from "lucide-react";

export default function CompanyLoadingScreen({
    ticker,
    assetClass,
}: {
    ticker: string | null;
    assetClass: "stocks" | "crypto";
}) {
    const t = useTranslations("explorerLanding");
    const isCrypto = assetClass === "crypto";

    const steps = isCrypto
        ? [t("loadStepCryptoFind"), t("loadStepCryptoOnchain"), t("loadStepCryptoPillars"), t("loadStepReady")]
        : [t("loadStepMarket"), t("loadStepFundamentals"), t("loadStepValuation"), t("loadStepScoring"), t("loadStepReady")];

    const [progress, setProgress] = useState(8);
    const [step, setStep] = useState(0);

    // Ramp the bar toward ~92%, decelerating (real completion unmounts us).
    useEffect(() => {
        const id = setInterval(() => {
            setProgress((p) => (p < 92 ? p + Math.max(0.6, (92 - p) * 0.07) : p));
        }, 110);
        return () => clearInterval(id);
    }, []);

    // Cycle the status messages.
    useEffect(() => {
        const id = setInterval(() => {
            setStep((s) => (s + 1 < steps.length ? s + 1 : s));
        }, 750);
        return () => clearInterval(id);
    }, [steps.length]);

    const Icon = isCrypto ? Bitcoin : Building2;
    const accent = isCrypto ? "var(--accent-amber)" : "var(--accent-cyan)";

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-5">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md text-center"
            >
                {/* Pulsing icon */}
                <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                    style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
                >
                    <Icon size={28} style={{ color: accent }} />
                </motion.div>

                {/* Ticker */}
                <div className="flex items-center justify-center gap-2 mb-1">
                    <Search size={14} style={{ color: "var(--text-muted)" }} />
                    <span className="text-lg font-bold font-mono" style={{ color: accent }}>
                        {ticker ? ticker.toUpperCase() : t("loadAnalyzing")}
                    </span>
                </div>
                <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>{t("loadAnalyzing")}</p>

                {/* Progress bar */}
                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "var(--bg-tertiary)" }}>
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${accent}, var(--accent-violet))` }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "easeOut", duration: 0.3 }}
                    />
                </div>

                {/* Percentage + current step */}
                <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: "var(--text-secondary)" }}>{steps[step]}</span>
                    <span className="font-mono font-bold" style={{ color: accent }}>{Math.round(progress)}%</span>
                </div>
            </motion.div>
        </div>
    );
}
