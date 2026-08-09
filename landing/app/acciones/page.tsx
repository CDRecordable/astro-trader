import type { Metadata } from "next";
import AnalyzerPage from "@/components/AnalyzerPage";
import { STOCK_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Análisis fundamental de acciones · Valoración, solvencia y timing",
    description:
        "Puntúa cualquier acción cotizada del mundo: valoración por valor de empresa (FCF/EV), filtros de solvencia, dilución, devengos, revisiones de consenso y compras de directivos. Los datos que faltan puntúan neutro, nunca como fallo.",
    keywords: ["análisis fundamental acciones", "screener bolsa", "FCF EV", "valoración empresas", "deuda EBITDA", "value investing"],
    alternates: { canonical: "/acciones" },
};

export default function StocksPage() {
    return (
        <AnalyzerPage
            eyebrow="Acciones"
            title={<>Lo que un balance<br /><span className="grad">dice de una empresa</span></>}
            lead="Cualquier acción cotizada del mundo, puntuada con criterios de inversor value: qué caja genera, cuánta deuda esconde y si el precio ya lo descuenta todo."
            accent="var(--cyan)"
            voxels={STOCK_VOXELS}
            pillars={[
                { name: "Valoración", weight: 40, detail: "Rentabilidad sobre el valor de empresa, no solo sobre el precio. Incluye la deuda en la ecuación, que es donde se esconden las trampas." },
                { name: "Calidad y tendencia", weight: 30, detail: "Márgenes, retorno sobre capital y su evolución interanual: si el negocio mejora o se deteriora por dentro." },
                { name: "Timing", weight: 30, detail: "Posición frente a la media móvil y al rango de 52 semanas. Comprar bueno y caro sigue siendo comprar caro." },
            ]}
            signals={[
                { name: "FCF / EV", detail: "Caja libre entre valor de empresa. La medida de valoración que la deuda no puede maquillar." },
                { name: "Deuda neta / EBITDA", detail: "Años de beneficio operativo para pagar la deuda. Negativo significa caja neta." },
                { name: "Cobertura de intereses", detail: "Cuántas veces el beneficio operativo paga los intereses. Por debajo de 2 es frágil." },
                { name: "Margen EBIT y bruto", detail: "Qué parte de cada venta sobrevive hasta el beneficio operativo, y cómo cambia." },
                { name: "ROE y ROC", detail: "Rentabilidad sobre fondos propios y sobre capital invertido, con su delta interanual." },
                { name: "Dilución de acciones", detail: "Crecimiento anualizado del número de acciones: tu porción del pastel, encogiendo." },
                { name: "Devengos (accruals)", detail: "Distancia entre beneficio contable y caja real. Alta = contabilidad agresiva." },
                { name: "Revisiones de consenso", detail: "Si los analistas están subiendo o bajando estimaciones en los últimos 30 días." },
                { name: "Compras de directivos", detail: "Operaciones de insiders a 6 meses. Las compras son señal; las ventas, ruido." },
                { name: "Valor contable tangible", detail: "Qué queda si descuentas fondo de comercio e intangibles." },
            ]}
            differentiator={{
                title: "Las small-caps no suspenden por ser pequeñas",
                body: "Una empresa con datos escasos no es una mala empresa: es una empresa con datos escasos. La mayoría de screeners rellenan el hueco con un cero y la hunden en el ranking. Aquí lo que falta se excluye del cálculo y el pilar se renormaliza sobre lo que sí se conoce, marcado en ámbar como «N/D». Además, cada métrica se interpreta en contexto: una cobertura de intereses de −33× no es «cobertura baja», son pérdidas operativas, y la app lo dice con esas palabras.",
            }}
            faq={[
                { q: "¿De dónde salen los datos?", a: "De Yahoo Finance, en directo y desde tu propio ordenador. Como la app se instala en tu máquina, las peticiones salen de tu conexión: no hay servidor intermediario ni cuotas compartidas." },
                { q: "¿Puedo analizar acciones europeas y españolas?", a: "Sí. La búsqueda es global y en vivo, así que cualquier valor cotizado es analizable, incluido el Mercado Continuo y el IBEX. El screener trae universos precargados de EE.UU., Europa e IBEX." },
                { q: "¿Necesito pagar para usar esto?", a: "No. Todo el análisis fundamental es gratuito y para siempre. El pago único de 9,90 € desbloquea solo la capa cualitativa de IA, que además funciona con tu propia API key." },
                { q: "¿Me dice qué comprar?", a: "No, y desconfía de quien lo haga. Te da una puntuación razonada, te enseña cada número que la compone y te dice qué no sabe. La decisión es tuya; esto no es asesoramiento financiero." },
            ]}
        />
    );
}
