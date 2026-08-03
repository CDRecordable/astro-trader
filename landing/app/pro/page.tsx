// ============================================================
// /pro — where a Patreon supporter picks up their PRO access
// ============================================================
// One screen, no account, no password: connect with Patreon, copy the token,
// paste it in the app once. The app renews it on its own from then on.

import type { Metadata } from "next";
import { Suspense } from "react";
import ProClient from "./client";

export const metadata: Metadata = {
    title: "Acceso PRO con Patreon · Astro Trader Insights",
    description:
        "Conecta tu cuenta de Patreon y desbloquea la capa de análisis con IA sin configurar ninguna clave: usa nuestra infraestructura, con 100 análisis al mes incluidos.",
};

export default function ProPage() {
    // The token arrives as a query parameter, so the interactive part reads
    // useSearchParams() and can only render on the client. The Suspense
    // boundary lets the rest of the page prerender as static HTML anyway.
    return (
        <Suspense
            fallback={
                <main className="mx-auto max-w-2xl px-6 py-20">
                    <h1 className="text-3xl font-bold tracking-tight">Acceso PRO</h1>
                    <p className="mt-3 text-sm opacity-60">Cargando…</p>
                </main>
            }
        >
            <ProClient />
        </Suspense>
    );
}
