import type { Metadata } from "next";
import FeaturePage from "@/components/FeaturePage";
import { SCREENER_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Screener de acciones y ETFs gratis · Escanea universos enteros",
    description:
        "Escanea universos completos (EE.UU. large/mid/small, Europa, IBEX, categorías de ETFs UCITS) y deja que el algoritmo fundamental los ordene por puntuación. Filtros por recomendación, score mínimo y vista de dispersión con regresión.",
    keywords: ["screener acciones gratis", "screener bolsa", "filtrar acciones fundamentales", "screener ETF UCITS", "buscador de acciones baratas"],
    alternates: { canonical: "/screener" },
};

export default function ScreenerPage() {
    return (
        <FeaturePage
            eyebrow="Screener"
            title={<>Deja de analizar de uno en uno.<br /><span className="grad">Escanea el universo entero.</span></>}
            lead="Eliges un mercado —o una categoría de ETFs— y el algoritmo puntúa cada valor con los mismos criterios fundamentales, devolviéndote una tabla ordenada de la que salen los candidatos. De «analizar lo que ya conozco» a «que el algoritmo me proponga»."
            accent="var(--cyan)"
            voxels={SCREENER_VOXELS}
            steps={[
                { title: "Elige un universo", detail: "EE.UU. grande, mediano o pequeño, Europa, IBEX y Mercado Continuo, top del S&P 500 — o una categoría entera de ETFs UCITS: países, sectores, temáticos, oro." },
                { title: "El algoritmo lo puntúa todo", detail: "Cada valor pasa por los tres pilares (valoración, calidad, timing) con datos en vivo. Los que suspenden los filtros duros quedan señalados." },
                { title: "Filtra, ordena y abre la ficha", detail: "Score mínimo, solo Buy o Strong Buy, ordenar por cualquier pilar. Un clic en la fila abre el informe completo del valor." },
            ]}
            features={[
                { name: "Universos de acciones curados", detail: "Listas mantenidas de EE.UU. (large, mid, small caps), Europa e IBEX + Mercado Continuo, listas para escanear." },
                { name: "Modo ETF por categorías", detail: "Escanea todos los UCITS de una categoría (países, sectores, temáticos…) y compáralos por coste, cartera y momentum." },
                { name: "Vista de dispersión", detail: "Cambia la tabla por un gráfico 2D: cualquier par de métricas con recta de regresión y R², con los outliers etiquetados — quién está caro o barato frente a su grupo." },
                { name: "Cuadrantes buy-box", detail: "Divide el universo por medianas y colorea por recomendación: el cuadrante bueno se ve de un vistazo." },
                { name: "Filtros que no engañan", detail: "El botón «solo los que pasan filtros duros» separa los baratos de los baratos-por-algo." },
                { name: "Resultados con memoria", detail: "Los escaneos se cachean: repetir un universo es instantáneo y no vuelve a machacar las APIs." },
            ]}
            differentiator={{
                title: "Un screener que no castiga lo que no sabe",
                body: "Los screeners convencionales tratan un dato ausente como un cero, así que las small-caps con cobertura pobre acaban siempre al fondo de la tabla — no por malas, sino por opacas. Aquí cada pilar se renormaliza sobre los datos que existen: una empresa con la mitad de métricas compite en igualdad sobre esa mitad, y la ficha te dice exactamente qué falta. El ranking refleja calidad, no cantidad de datos.",
            }}
            faq={[
                { q: "¿Cuántos valores puede escanear de una vez?", a: "Los universos curados van de 34 a 71 valores por mercado, y las categorías de ETFs de 3 a 10 fondos. El escaneo corre desde tu propio ordenador con pausas entre lotes para ser respetuoso con las fuentes de datos." },
                { q: "¿Puedo añadir mis propios universos?", a: "Las listas viven en un archivo del código abierto (src/lib/market-groups.ts) — editarlas es trivial y hay instrucciones en el repositorio. En el roadmap está poder definirlas desde la interfaz." },
                { q: "¿El screener da señales de compra?", a: "Da puntuaciones razonadas y transparentes, no señales. Cada número es auditable: abres la ficha y ves exactamente qué métricas lo componen y cuáles faltan. La decisión sigue siendo tuya." },
                { q: "¿Cuánto cuesta?", a: "Nada. El screener completo forma parte del análisis heurístico, que es gratuito para siempre. Solo la capa cualitativa de IA requiere la licencia única de 9,90 €." },
            ]}
            related={[
                { href: "/acciones", label: "Análisis de acciones" },
                { href: "/etfs", label: "Análisis de ETFs" },
                { href: "/watchlist", label: "Watchlist" },
            ]}
        />
    );
}
