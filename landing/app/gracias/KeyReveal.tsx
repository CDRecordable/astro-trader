"use client";

// ============================================================
// KeyReveal — shows the buyer's licence right after checkout
// ============================================================
// Stripe redirects to /gracias?session_id=cs_…; the webhook that issues the
// licence usually lands within seconds, so this polls until the key exists
// and then displays it with a copy button. No email round-trip required.

import React, { useEffect, useRef, useState } from "react";

type State =
    | { s: "none" }                                  // no session_id in the URL
    | { s: "polling"; tries: number }
    | { s: "ready"; key: string; email: string }
    | { s: "timeout" };

const MAX_TRIES = 15;        // ~45 s at 3 s per try
const INTERVAL_MS = 3000;

export default function KeyReveal() {
    const [state, setState] = useState<State>({ s: "none" });
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const sessionId = new URLSearchParams(window.location.search).get("session_id");
        if (!sessionId) return;             // plain visit: keep the generic page

        let tries = 0;
        let cancelled = false;
        setState({ s: "polling", tries: 0 });

        const poll = async () => {
            if (cancelled) return;
            tries += 1;
            try {
                const res = await fetch(`/api/license/by-session?session_id=${encodeURIComponent(sessionId)}`);
                const d = await res.json();
                if (cancelled) return;
                if (d.status === "ready") {
                    setState({ s: "ready", key: d.licenseKey, email: d.email });
                    return;
                }
            } catch { /* transient, keep polling */ }
            if (tries >= MAX_TRIES) { setState({ s: "timeout" }); return; }
            setState({ s: "polling", tries });
            timer.current = setTimeout(poll, INTERVAL_MS);
        };
        poll();

        return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); };
    }, []);

    const copy = async () => {
        if (state.s !== "ready") return;
        try {
            await navigator.clipboard.writeText(state.key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable, the key is selectable anyway */ }
    };

    if (state.s === "none") return null;

    if (state.s === "polling") {
        return (
            <div className="glass rounded-2xl p-6 mb-6 text-left rise">
                <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--text-mute)" }}>
                    Tu clave de licencia
                </p>
                <div className="flex items-center gap-3">
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                        style={{ borderColor: "var(--violet)", borderTopColor: "transparent" }} />
                    <p className="text-xs" style={{ color: "var(--text-soft)" }}>
                        Confirmando el pago y emitiendo tu clave… suele tardar unos segundos.
                    </p>
                </div>
            </div>
        );
    }

    if (state.s === "timeout") {
        return (
            <div className="glass rounded-2xl p-6 mb-6 text-left rise" style={{ border: "1px solid rgba(251,191,36,0.25)" }}>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-soft)" }}>
                    El pago está registrado pero la clave aún no aparece. No te preocupes: quedó
                    emitida a tu nombre, recupérala en un minuto desde{" "}
                    <a href="/licencia" className="underline" style={{ color: "var(--cyan)" }}>/licencia</a>{" "}
                    con el correo de la compra.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl p-6 mb-6 text-left rise"
            style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.28)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--emerald)" }}>
                Tu clave de licencia · {state.email}
            </p>
            <code className="mono block text-[11px] leading-relaxed break-all rounded-xl px-3.5 py-3 mb-3 select-all"
                style={{ background: "rgba(0,0,0,0.4)", color: "var(--emerald)", border: "1px solid var(--border)" }}>
                {state.key}
            </code>
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={copy}
                    className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-transform hover:scale-[1.02]"
                    style={{ background: "var(--emerald)", color: "#06080d" }}
                >
                    {copied ? "Copiada ✓" : "Copiar clave"}
                </button>
                <p className="text-[11px]" style={{ color: "var(--text-mute)" }}>
                    Guárdala: es tu licencia de por vida. También podrás recuperarla con tu email.
                </p>
            </div>
        </div>
    );
}
