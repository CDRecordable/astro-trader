// ============================================================
// UpdateNotice — "a new version is available" toast + one-click update
// ============================================================
// Checks GitHub (via git) for new commits on the tracked branch. If there are
// any, shows a toast with an "Update" button that runs git pull + npm install.
// Renders nothing when up to date or when the app wasn't installed via git.

"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, RefreshCw, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type State = "hidden" | "available" | "updating" | "done" | "error";

export default function UpdateNotice() {
    const t = useTranslations("update");
    const [state, setState] = useState<State>("hidden");
    const [behind, setBehind] = useState(0);
    const [latest, setLatest] = useState("");

    useEffect(() => {
        let active = true;
        fetch("/api/update")
            .then((r) => r.json())
            .then((d: { updateAvailable?: boolean; behind?: number; latestMsg?: string }) => {
                if (active && d.updateAvailable) {
                    setBehind(d.behind ?? 0);
                    setLatest(d.latestMsg ?? "");
                    setState("available");
                }
            })
            .catch(() => { });
        return () => { active = false; };
    }, []);

    const runUpdate = async () => {
        setState("updating");
        try {
            const res = await fetch("/api/update", { method: "POST" });
            const d = await res.json();
            setState(res.ok && d.ok ? "done" : "error");
        } catch { setState("error"); }
    };

    if (state === "hidden") return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-5 right-5 z-[120] w-80 rounded-2xl p-4"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-active)", boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 24px rgba(34,211,238,0.12)" }}
            >
                {/* Available */}
                {state === "available" && (
                    <>
                        <div className="flex items-start gap-2.5 mb-3">
                            <Download size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent-cyan)" }} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("title")}</p>
                                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                    {t("summary", { count: behind })}{latest ? ` · ${latest}` : ""}
                                </p>
                            </div>
                            <button onClick={() => setState("hidden")} className="p-0.5 rounded cursor-pointer"><X size={14} style={{ color: "var(--text-muted)" }} /></button>
                        </div>
                        <button onClick={runUpdate} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all"
                            style={{ background: "var(--accent-cyan)", color: "var(--bg-primary)" }}>
                            <RefreshCw size={14} /> {t("update")}
                        </button>
                    </>
                )}

                {/* Updating */}
                {state === "updating" && (
                    <div className="flex items-center gap-2.5">
                        <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: "var(--accent-cyan)" }} />
                        <div>
                            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("updating")}</p>
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t("updatingHint")}</p>
                        </div>
                    </div>
                )}

                {/* Done */}
                {state === "done" && (
                    <div className="flex items-start gap-2.5">
                        <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--signal-strong-buy)" }} />
                        <div className="flex-1">
                            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("doneTitle")}</p>
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t("doneHint")}</p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {state === "error" && (
                    <div className="flex items-start gap-2.5">
                        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "var(--signal-avoid)" }} />
                        <div className="flex-1">
                            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{t("errorTitle")}</p>
                            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{t("errorHint")}</p>
                        </div>
                        <button onClick={() => setState("hidden")} className="p-0.5 rounded cursor-pointer"><X size={14} style={{ color: "var(--text-muted)" }} /></button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
