"use client";

// ============================================================
// Licence portal — check a key, or recover a lost one
// ============================================================
// This is the "login" for a lifetime licence: no passwords, no sessions.
// There is nothing to log into — the key IS the entitlement.

import React, { useState } from "react";

type CheckState =
    | { s: "idle" }
    | { s: "checking" }
    | { s: "valid"; issuedAt: string; emailHint: string }
    | { s: "invalid" };

export default function LicenseClient() {
    const [key, setKey] = useState("");
    const [check, setCheck] = useState<CheckState>({ s: "idle" });

    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState<string | null>(null);

    const verify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) return;
        setCheck({ s: "checking" });
        try {
            const res = await fetch("/api/license/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: key.trim() }),
            });
            const d = await res.json();
            setCheck(d.valid ? { s: "valid", issuedAt: d.issuedAt, emailHint: d.emailHint } : { s: "invalid" });
        } catch {
            setCheck({ s: "invalid" });
        }
    };

    const recover = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setSending(true);
        setSent(null);
        try {
            const res = await fetch("/api/license/recover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });
            const d = await res.json();
            setSent(d.message ?? "Listo.");
        } catch {
            setSent("No hemos podido procesar la solicitud. Inténtalo de nuevo.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-5">
            {/* Verify a key */}
            <section className="glass rounded-2xl p-6">
                <h2 className="text-base font-bold mb-1.5">Comprobar una clave</h2>
                <p className="text-xs mb-5" style={{ color: "var(--text-soft)" }}>
                    Pega tu clave para confirmar que es válida antes de activarla en la app.
                </p>
                <form onSubmit={verify}>
                    <textarea
                        value={key}
                        onChange={(e) => { setKey(e.target.value); setCheck({ s: "idle" }); }}
                        placeholder="ATI1.…"
                        rows={3}
                        spellCheck={false}
                        className="mono w-full text-[11px] rounded-xl px-3 py-2.5 outline-none resize-none"
                        style={{ background: "rgba(0,0,0,0.35)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <button
                        type="submit"
                        disabled={check.s === "checking" || !key.trim()}
                        className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
                        style={{ background: "linear-gradient(120deg, var(--cyan), var(--violet))", color: "#06080d" }}
                    >
                        {check.s === "checking" ? "Comprobando…" : "Comprobar"}
                    </button>
                </form>

                {check.s === "valid" && (
                    <div className="mt-4 rounded-xl px-3.5 py-3 rise"
                        style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.22)" }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: "var(--emerald)" }}>Licencia válida ✓</p>
                        <p className="text-[11px]" style={{ color: "var(--text-soft)" }}>
                            Capa de IA de por vida · emitida el {check.issuedAt} · {check.emailHint}
                        </p>
                    </div>
                )}
                {check.s === "invalid" && (
                    <div className="mt-4 rounded-xl px-3.5 py-3 rise"
                        style={{ background: "rgba(251,113,133,0.07)", border: "1px solid rgba(251,113,133,0.22)" }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: "var(--rose)" }}>Clave no válida</p>
                        <p className="text-[11px]" style={{ color: "var(--text-soft)" }}>
                            Revisa que la hayas copiado entera, incluido el prefijo <span className="mono">ATI1.</span>
                        </p>
                    </div>
                )}
            </section>

            {/* Recover */}
            <section className="glass rounded-2xl p-6">
                <h2 className="text-base font-bold mb-1.5">He perdido mi clave</h2>
                <p className="text-xs mb-5" style={{ color: "var(--text-soft)" }}>
                    Escribe el correo con el que compraste y te la reenviamos. No hay cuentas
                    ni contraseñas que recordar.
                </p>
                <form onSubmit={recover}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full text-sm rounded-xl px-3.5 py-2.5 outline-none"
                        style={{ background: "rgba(0,0,0,0.35)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <button
                        type="submit"
                        disabled={sending || !email.trim()}
                        className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer glass transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                    >
                        {sending ? "Enviando…" : "Reenviar mi clave"}
                    </button>
                </form>
                {sent && (
                    <p className="mt-4 text-[11px] leading-relaxed rise" style={{ color: "var(--text-soft)" }}>{sent}</p>
                )}
            </section>
        </div>
    );
}
