// ============================================================
// AiLoadingBar — progress bar + rotating steps for AI generation
// ============================================================
// The qualitative analysis is one LLM call (news + model), so there's no
// granular progress: the bar ramps toward ~92% and cycles step labels until
// the response arrives. Shared by the stock and crypto AI sections.

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function AiLoadingBar({ steps }: { steps: string[] }) {
    const [progress, setProgress] = useState(6);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setProgress((p) => (p < 92 ? p + Math.max(0.4, (92 - p) * 0.045) : p));
        }, 150);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            setStep((s) => (s + 1 < steps.length ? s + 1 : s));
        }, 1100);
        return () => clearInterval(id);
    }, [steps.length]);

    return (
        <div className="py-2">
            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--bg-tertiary)" }}>
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, var(--accent-violet), var(--accent-cyan))" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut", duration: 0.35 }}
                />
            </div>
            <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: "var(--text-secondary)" }}>{steps[step]}</span>
                <span className="font-mono font-bold" style={{ color: "var(--accent-violet)" }}>{Math.round(progress)}%</span>
            </div>
        </div>
    );
}
