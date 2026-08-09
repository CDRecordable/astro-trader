"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/** Plain-language reasons, so nobody has to interpret an error code. */
const ERRORS: Record<string, string> = {
    declined: "Has cancelado la conexión con Patreon. Puedes intentarlo otra vez cuando quieras.",
    missing_code: "Patreon no nos devolvió el código de acceso. Vuelve a intentarlo.",
    bad_state: "La sesión de conexión ha caducado o no coincide. Empieza de nuevo desde este botón.",
    patreon_unavailable:
        "No hemos podido consultar a Patreon en este momento. No es culpa tuya ni de tu suscripción: inténtalo en unos minutos.",
    not_active:
        "Tu cuenta de Patreon está conectada, pero la suscripción no aparece como activa. Si acabas de suscribirte, Patreon puede tardar unos minutos en confirmarlo.",
    not_configured: "El acceso PRO todavía no está configurado en el servidor.",
};

export default function ProClient() {
    const params = useSearchParams();
    const token = params.get("token");
    const error = params.get("error");
    const status = params.get("status");

    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(t);
    }, [copied]);

    return (
        <main className="mx-auto max-w-2xl px-6 py-20">
            <h1 className="text-3xl font-bold tracking-tight">Acceso PRO</h1>
            <p className="mt-3 text-sm leading-relaxed opacity-80">
                Si apoyas el proyecto en Patreon, la capa de análisis con IA funciona sin que
                configures ninguna clave: usa nuestra infraestructura. Incluye{" "}
                <strong>100 análisis al mes</strong>, que se renuevan el día 1.
            </p>

            {error && (
                <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed">
                    {ERRORS[error] ?? "Algo ha fallado al conectar con Patreon."}
                    {error === "not_active" && status && (
                        <span className="mt-2 block opacity-70">
                            Estado que nos ha devuelto Patreon: <code>{status}</code>
                        </span>
                    )}
                </div>
            )}

            {token ? (
                <section className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                        Listo, este es tu acceso
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed opacity-80">
                        Ábrelo en el programa: <strong>Ajustes → Capa de IA</strong>, pégalo y
                        guarda. Solo tienes que hacerlo una vez; a partir de ahí se renueva solo
                        mientras tu suscripción siga activa.
                    </p>
                    <textarea
                        readOnly
                        value={token}
                        rows={3}
                        onFocus={(e) => e.currentTarget.select()}
                        className="mt-4 w-full resize-none rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px] leading-relaxed"
                    />
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(token).then(() => setCopied(true));
                        }}
                        className="mt-3 rounded-lg bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                    >
                        {copied ? "Copiado ✓" : "Copiar acceso"}
                    </button>
                    <p className="mt-4 text-xs leading-relaxed opacity-60">
                        Guárdalo como guardarías una contraseña: quien lo tenga puede gastar tu
                        cuota mensual. Si sospechas que se ha filtrado, vuelve a conectar aquí y
                        el anterior dejará de servir en unos días.
                    </p>
                </section>
            ) : (
                <a
                    href="/api/patreon/start"
                    className="mt-8 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                >
                    Conectar con Patreon
                </a>
            )}

            <section className="mt-14 space-y-4 text-sm leading-relaxed opacity-70">
                <h2 className="text-xs font-semibold uppercase tracking-wider opacity-100">
                    Preguntas razonables
                </h2>
                <p>
                    <strong>¿Y si cancelo la suscripción?</strong> El acceso deja de funcionar en
                    unos días. No hay cargos ni sorpresas: simplemente el programa vuelve al modo
                    gratuito, con todo el análisis cuantitativo intacto.
                </p>
                <p>
                    <strong>¿Necesito Patreon para usar el programa?</strong> No. Todo el análisis
                    heurístico —las tres puntuaciones, el screener, la cartera, el módulo
                    esotérico— es gratis y siempre lo será. Patreon solo cubre la capa de IA.
                </p>
                <p>
                    <strong>¿Puedo usar mi propia clave en vez de esto?</strong> Sí, y sale más
                    barato si ya tienes una: la licencia de pago único te deja conectar tu propio
                    proveedor sin límite mensual.
                </p>
            </section>
        </main>
    );
}
