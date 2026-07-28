// ============================================================
// LicenseSection — activate the AI layer on this machine
// ============================================================
// The key is verified offline against the public key embedded in the app, so
// activating works without an internet connection and nothing is reported back.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Check, Loader2, AlertCircle, ExternalLink, Trash2 } from "lucide-react";

interface LicenseInfo { email: string; issuedAt: string; product: string }

const SITE = process.env.NEXT_PUBLIC_LANDING_URL ?? "https://astrotrader.app";

export default function LicenseSection() {
    const t = useTranslations("license");
    const [info, setInfo] = useState<LicenseInfo | null>(null);
    const [key, setKey] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    const load = useCallback(async () => {
        try {
            const d = await fetch("/api/license").then((r) => r.json());
            setInfo(d.info ?? null);
        } catch { /* offline-first: absence of a licence is the safe default */ }
        finally { setLoaded(true); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const activate = async () => {
        if (!key.trim()) return;
        setBusy(true); setError(null);
        try {
            const res = await fetch("/api/license", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: key.trim() }),
            });
            const d = await res.json();
            if (!res.ok) { setError(t("invalid")); }
            else { setInfo(d.info); setKey(""); }
        } catch {
            setError(t("invalid"));
        } finally { setBusy(false); }
    };

    const deactivate = async () => {
        setBusy(true);
        try {
            await fetch("/api/license", { method: "DELETE" });
            setInfo(null);
        } catch { /* nothing to do — the file is local */ }
        finally { setBusy(false); }
    };

    if (!loaded) return null;

    return (
        <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} style={{ color: "var(--accent-violet)" }} />
                <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                    {t("title")}
                </h2>
            </div>

            {info ? (
                /* ── Active ── */
                <div className="rounded-xl p-4" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.22)" }}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-2.5 min-w-0">
                            <Check size={16} className="mt-0.5 shrink-0" style={{ color: "var(--signal-strong-buy)" }} />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold" style={{ color: "var(--signal-strong-buy)" }}>{t("activeTitle")}</p>
                                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                    {t("activeMeta", { email: info.email, date: info.issuedAt })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={deactivate}
                            disabled={busy}
                            title={t("deactivate")}
                            className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-white/5 shrink-0"
                        >
                            <Trash2 size={14} style={{ color: "var(--text-muted)" }} />
                        </button>
                    </div>
                    <p className="text-[11px] mt-3 pt-3" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
                        {t("activeNote")}
                    </p>
                </div>
            ) : (
                /* ── Locked ── */
                <div className="rounded-xl p-4" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                        {t("lockedIntro")}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={key}
                            onChange={(e) => { setKey(e.target.value); setError(null); }}
                            placeholder="ATI1.…"
                            spellCheck={false}
                            className="flex-1 text-xs font-mono px-3 py-2.5 rounded-lg outline-none"
                            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                        />
                        <button
                            onClick={activate}
                            disabled={busy || !key.trim()}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))", color: "white" }}
                        >
                            {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            {t("activate")}
                        </button>
                    </div>

                    {error && (
                        <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: "var(--signal-avoid)" }}>
                            <AlertCircle size={11} /> {error}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-3.5 pt-3.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                        <a
                            href={`${SITE}/#precio`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold inline-flex items-center gap-1 hover:underline"
                            style={{ color: "var(--accent-violet)" }}
                        >
                            {t("buy")} <ExternalLink size={10} />
                        </a>
                        <a
                            href={`${SITE}/licencia`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] inline-flex items-center gap-1 hover:underline"
                            style={{ color: "var(--text-muted)" }}
                        >
                            {t("recover")} <ExternalLink size={10} />
                        </a>
                    </div>
                </div>
            )}
        </section>
    );
}
