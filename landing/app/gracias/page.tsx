import type { Metadata } from "next";
import Link from "next/link";
import { VoxelScene, KEY_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Gracias · Astro Trader Insights",
    description: "Tu compra se ha completado. Activa la capa de IA en tu app.",
    robots: { index: false, follow: false },
};

export default function ThanksPage() {
    return (
        <main className="min-h-screen flex items-center justify-center px-5 py-16">
            <div className="max-w-lg w-full text-center">
                <div className="flex justify-center mb-6">
                    <VoxelScene cubes={KEY_VOXELS} size={140} className="floaty" />
                </div>

                <h1 className="text-3xl font-bold tracking-tight mb-3">Gracias 🙌</h1>
                <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-soft)" }}>
                    Tu licencia de por vida ya está emitida. Te la hemos enviado al correo de la
                    compra — busca un mensaje con tu clave <span className="mono" style={{ color: "var(--cyan)" }}>ATI1.…</span>
                </p>

                <div className="glass rounded-2xl p-6 text-left mb-6">
                    <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-mute)" }}>
                        Siguiente paso
                    </p>
                    <ol className="space-y-3">
                        {[
                            "Abre Astro Trader en tu ordenador",
                            "Ajustes → Capa de IA → pega la clave",
                            "Añade tu API key de Claude, Gemini o DeepSeek",
                        ].map((s, i) => (
                            <li key={s} className="flex gap-3 items-start text-xs" style={{ color: "var(--text-soft)" }}>
                                <span className="mono text-[10px] w-5 h-5 rounded flex items-center justify-center shrink-0"
                                    style={{ background: "rgba(167,139,250,0.14)", color: "var(--violet)" }}>{i + 1}</span>
                                {s}
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                    <Link href="/licencia" className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: "linear-gradient(120deg, var(--cyan), var(--violet))", color: "#06080d" }}>
                        Comprobar mi clave
                    </Link>
                    <Link href="/#descargar" className="px-5 py-2.5 rounded-xl text-sm font-semibold glass transition-colors hover:bg-white/[0.06]">
                        Descargar la app
                    </Link>
                </div>

                <p className="text-[11px] mt-8" style={{ color: "var(--text-mute)" }}>
                    ¿No te ha llegado? Recupérala en{" "}
                    <Link href="/licencia" className="underline" style={{ color: "var(--cyan)" }}>/licencia</Link>.
                </p>
            </div>
        </main>
    );
}
