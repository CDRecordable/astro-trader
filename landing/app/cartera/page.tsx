import type { Metadata } from "next";
import FeaturePage from "@/components/FeaturePage";
import { CARTERA_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Cartera simulada · Paper trading con precios reales, sin arriesgar dinero",
    description:
        "Compra y vende acciones, cripto y ETFs con 100.000 € ficticios a precios de mercado reales. Posiciones con P&L en vivo, historial de operaciones, curva de valor y réplica de tu cartera real por porcentajes.",
    keywords: ["cartera simulada", "paper trading español", "simulador bolsa sin dinero", "practicar invertir", "simulador de inversión", "curva de equity"],
    alternates: { canonical: "/cartera" },
};

export default function CarteraPage() {
    return (
        <FeaturePage
            eyebrow="Cartera simulada"
            title={<>Pon a prueba tu criterio<br /><span className="grad">antes que tu dinero</span></>}
            lead="Analizar está bien; comprobar si tus análisis aciertan es mejor. La cartera simulada te da 100.000 € ficticios para operar a precios reales desde cualquier ficha, y una curva de valor que responde, con el tiempo, la pregunta incómoda: ¿tu proceso funciona?"
            accent="var(--emerald)"
            voxels={CARTERA_VOXELS}
            steps={[
                { title: "Compra desde la ficha", detail: "Cada activo analizado tiene botones de comprar y vender junto a la watchlist. Indicas el importe en euros y la operación se ejecuta al precio de mercado del momento, con unidades fraccionadas." },
                { title: "Sigue tus posiciones", detail: "Cantidad, coste medio, valor actual y P&L no realizado de cada posición, valorados en vivo al abrir la cartera. Cada venta registra su ganancia o pérdida realizada." },
                { title: "Mide tu curva", detail: "Un registro diario del valor total dibuja tu curva de equity frente al capital inicial. Es tu proceso de decisión, convertido en un gráfico que no se deja engañar." },
            ]}
            features={[
                { name: "Tres clases de activo", detail: "Acciones, criptomonedas y ETFs UCITS en la misma cartera, comprados desde sus fichas de análisis." },
                { name: "Operativa por importe", detail: "Inviertes «500 €», no «3,7 acciones»: el fraccionamiento lo calcula la app, como en los brókers modernos." },
                { name: "Coste medio y P&L sin atajos", detail: "Las compras promedian el coste; las ventas realizan resultado contra ese promedio. Sin trucos de contabilidad creativa." },
                { name: "Historial completo", detail: "Cada operación con su fecha, precio, importe y resultado realizado, tu diario de operaciones automático." },
                { name: "Réplica tu cartera real", detail: "¿Ya inviertes? Configura tus posiciones reales por porcentaje y la simulación las compra a precio actual: desde entonces, tu cartera real tiene un espejo medible." },
                { name: "Reinicio limpio", detail: "Un botón devuelve los 100.000 € iniciales y borra la curva. Experimentar no deja cicatrices." },
            ]}
            differentiator={{
                title: "El circuito completo: analizar → decidir → medir",
                body: "Un simulador suelto no enseña nada: la gracia es que aquí la compra sale de la misma ficha donde acabas de ver el score, los filtros de solvencia y el análisis de IA. Cada posición es una decisión documentada: qué viste, qué puntuaba, qué decía la IA. Y la curva de equity es la nota final de ese proceso. Es la diferencia entre jugar a la bolsa y entrenar un criterio.",
            }}
            faq={[
                { q: "¿El dinero es real?", a: "No, y es intencionado. Son 100.000 € ficticios operando a precios reales de mercado. La app no se conecta a ningún bróker, no puede ejecutar órdenes reales y no toca tu dinero jamás." },
                { q: "¿Los precios son reales?", a: "Sí: cada operación se ejecuta al precio vigente del activo en ese momento, el mismo que ves en su ficha de análisis. La valoración de posiciones también usa precios en vivo." },
                { q: "¿Puedo simular mi cartera real?", a: "Sí. El configurador te deja buscar tus activos y asignarles el porcentaje que ocupan en tu cartera real; la simulación los compra a precio actual y desde ahí sigues su evolución con P&L y curva de valor." },
                { q: "¿Qué es la curva de equity?", a: "El gráfico del valor total de tu cartera (efectivo + posiciones) a lo largo del tiempo, frente a la línea del capital inicial. Se registra un punto por día de visita, así que crece contigo: empieza el día que empiezas, sin históricos inventados." },
            ]}
            related={[
                { href: "/watchlist", label: "Watchlist" },
                { href: "/acciones", label: "Análisis de acciones" },
                { href: "/etfs", label: "ETFs UCITS" },
            ]}
        />
    );
}
