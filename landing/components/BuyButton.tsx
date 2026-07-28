// ============================================================
// BuyButton — routes to the hosted checkout, or explains the wait
// ============================================================
// Server component: it reads the configured checkout link at render time. When
// no provider is wired yet the button degrades into an honest "coming soon"
// rather than a dead link that erodes trust on the pricing card.

import Link from "next/link";
import { checkoutUrl, PRICE_LABEL } from "@/lib/payments";

export default function BuyButton() {
    const url = checkoutUrl();

    if (!url) {
        return (
            <div className="mt-6">
                <div
                    className="w-full py-3 rounded-xl text-sm font-semibold text-center"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-mute)", border: "1px solid var(--border)" }}
                >
                    Disponible muy pronto
                </div>
                <p className="text-[11px] text-center mt-2.5" style={{ color: "var(--text-mute)" }}>
                    Mientras tanto, todo el análisis heurístico ya es tuyo:{" "}
                    <Link href="/#descargar" className="underline" style={{ color: "var(--cyan)" }}>descárgalo gratis</Link>.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-6">
            <a
                href={url}
                className="block w-full py-3 rounded-xl text-sm font-semibold text-center transition-transform hover:scale-[1.02]"
                style={{ background: "linear-gradient(120deg, var(--violet), var(--cyan))", color: "#06080d" }}
            >
                Desbloquear por {PRICE_LABEL}
            </a>
            <p className="text-[11px] text-center mt-2.5" style={{ color: "var(--text-mute)" }}>
                Pago único · IVA incluido · ¿Ya la tienes?{" "}
                <Link href="/licencia" className="underline" style={{ color: "var(--cyan)" }}>Recupera tu clave</Link>
            </p>
        </div>
    );
}
