import type { Metadata } from "next";
import FeaturePage from "@/components/FeaturePage";
import { WATCHLIST_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Watchlist de inversión con memoria · Seguimiento, notas y descartes",
    description:
        "Una lista de seguimiento que trabaja: puntuaciones al día, notas de por qué te interesa cada activo, análisis de IA guardados, y una pila de descartes que recuerda cuándo y por qué dijiste que no.",
    keywords: ["watchlist acciones", "lista seguimiento bolsa", "organizar inversiones", "diario de inversión", "seguimiento cartera"],
    alternates: { canonical: "/watchlist" },
};

export default function WatchlistPage() {
    return (
        <FeaturePage
            eyebrow="Watchlist"
            title={<>Tu criterio también<br /><span className="grad">merece memoria</span></>}
            lead="Investigar sin registrar es investigar dos veces. La watchlist guarda cada activo con su puntuación, tus notas y sus análisis de IA — y la pila de descartes recuerda qué rechazaste, cuándo y por qué, para que no vuelvas a hacer el mismo trabajo dentro de seis meses."
            accent="var(--amber)"
            voxels={WATCHLIST_VOXELS}
            steps={[
                { title: "Guarda desde cualquier ficha", detail: "Analizas un activo — acción, cripto o ETF — y lo fijas con la estrella. El descarte tiene su propio botón, porque decir que no también es una decisión." },
                { title: "Todo queda al día sin re-trabajo", detail: "Los scores se guardan en tu disco y cargan al instante; refrescas cuando tú quieres, no en cada visita. Insignias marcan qué activos ya tienen análisis de IA." },
                { title: "Filtra y reencuentra", detail: "Por tipo de activo, por sector, o buscando en tu propia lista. Pestañas separadas para lo vigilado, lo descartado y los análisis de IA acumulados." },
            ]}
            features={[
                { name: "Tres clases de activo juntas", detail: "Acciones, criptomonedas y ETFs UCITS en la misma lista, cada uno con el score de su propio motor." },
                { name: "Notas en cada activo", detail: "Un campo de texto libre para registrar por qué te interesa — la tesis en una frase, que es lo primero que se olvida." },
                { name: "Descartes con memoria", detail: "Cada descarte guarda fecha y motivo. Si el activo reaparece en una búsqueda, la app te avisa de que ya lo rechazaste — y hace cuánto." },
                { name: "Flechas de refuerzo de IA", detail: "Si un activo tiene análisis cualitativo guardado, sus flechas de refuerzo aparecen sobre el score directamente en la fila." },
                { name: "Vista agregada de análisis IA", detail: "Todos los análisis generados, ordenados por fecha, en una pestaña propia — tu biblioteca de research." },
                { name: "Todo local, todo tuyo", detail: "La lista vive en un JSON en tu disco. Sin cuentas, sin nube, exportable con copiar un archivo." },
            ]}
            differentiator={{
                title: "La pila de descartes es la mitad del valor",
                body: "Cualquier app tiene watchlist; casi ninguna tiene memoria de los noes. Y sin ella repites análisis, o peor: te convence un activo que ya habías rechazado con buenos motivos que has olvidado. Aquí el descarte es un ciudadano de primera — con fecha, con motivo, con aviso si el activo se cruza de nuevo en tu camino. Y como las decisiones envejecen, la app te marca los descartes antiguos para que los revises en vez de heredarlos ciegamente.",
            }}
            faq={[
                { q: "¿Dónde se guarda mi watchlist?", a: "En archivos JSON dentro de la carpeta de datos de tu propio ordenador. Nada se sube a ningún servidor: puedes copiarla, versionarla o borrarla tú mismo." },
                { q: "¿Los precios se actualizan solos?", a: "Los scores quedan cacheados para que abrir la lista sea instantáneo, y se refrescan cuando pulsas actualizar — fila a fila o toda la lista. Tú controlas cuándo se consulta el mercado." },
                { q: "¿Cuántos activos puedo seguir?", a: "No hay límite artificial. La única restricción práctica es el tiempo de refrescar listas muy largas, porque cada activo consulta sus datos en vivo." },
                { q: "¿Puedo recuperar un descarte?", a: "Sí, con un clic desde la pestaña de descartados vuelve a estar disponible. El historial es para informarte, no para atarte." },
            ]}
            related={[
                { href: "/cartera", label: "Cartera simulada" },
                { href: "/ia", label: "Capa de IA" },
                { href: "/screener", label: "Screener" },
            ]}
        />
    );
}
