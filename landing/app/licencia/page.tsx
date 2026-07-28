import type { Metadata } from "next";
import Link from "next/link";
import LicenseClient from "./LicenseClient";
import { VoxelScene, KEY_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Mi licencia · Astro Trader Insights",
    description: "Comprueba o recupera tu clave de licencia de la capa de IA.",
    alternates: { canonical: "/licencia" },
};

export default function LicensePage() {
    return (
        <main className="min-h-screen">
            <nav className="border-b" style={{ borderColor: "var(--border)" }}>
                <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <VoxelScene cubes={[{ x: 0, y: 0, z: 0, tone: "cyan" }, { x: 0, y: 1, z: 0, tone: "violet" }]} size={26} shadow={false} />
                        <span className="text-sm font-bold tracking-tight">Astro Trader</span>
                    </Link>
                    <Link href="/#precio" className="text-xs hover:text-white transition-colors" style={{ color: "var(--text-soft)" }}>
                        Comprar licencia
                    </Link>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-5 py-14">
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-5">
                        <VoxelScene cubes={KEY_VOXELS} size={110} className="floaty" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-3">Mi licencia</h1>
                    <p className="text-sm max-w-lg mx-auto" style={{ color: "var(--text-soft)" }}>
                        Tu clave es tu licencia: no hay cuenta que crear ni contraseña que recordar.
                        La app la verifica en tu propio ordenador, sin conectarse a nosotros.
                    </p>
                </div>

                <LicenseClient />

                <div className="glass rounded-2xl p-6 mt-5">
                    <h2 className="text-sm font-bold mb-3">Cómo activarla</h2>
                    <ol className="space-y-2.5">
                        {[
                            "Abre Astro Trader en tu ordenador.",
                            "Ve a Ajustes → Capa de IA.",
                            "Pega la clave y guarda. Listo, para siempre.",
                        ].map((s, i) => (
                            <li key={s} className="flex gap-3 items-start text-xs" style={{ color: "var(--text-soft)" }}>
                                <span className="mono text-[10px] w-5 h-5 rounded flex items-center justify-center shrink-0"
                                    style={{ background: "rgba(34,211,238,0.12)", color: "var(--cyan)" }}>{i + 1}</span>
                                {s}
                            </li>
                        ))}
                    </ol>
                    <p className="text-[11px] mt-4 pt-4" style={{ color: "var(--text-mute)", borderTop: "1px solid var(--border)" }}>
                        Recuerda: la licencia desbloquea la capa de IA, pero los análisis los genera
                        <strong style={{ color: "var(--text-soft)" }}> tu propia API key</strong> de Claude, Gemini o DeepSeek.
                        Nosotros no intermediamos ni cobramos por tokens.
                    </p>
                </div>
            </div>
        </main>
    );
}
