import type { Metadata } from "next";
import DimensionPage from "@/components/DimensionPage";

export const metadata: Metadata = {
    title: "Backtester astral · ¿Y si hubieras operado con las estrellas?",
    description:
        "Simula una estrategia guiada por la turbulencia astral, los ciclos lunares o Mercurio retrógrado contra Buy & Hold, con costes de transacción, drawdown y CAGR reales — y un test de permutación que dicta el veredicto. Spoiler: la app te lo dice sin adornos.",
    keywords: ["backtest estrategia astrológica", "operar con las estrellas", "backtesting gratis", "buy and hold comparación", "estrategia astral bolsa"],
    alternates: { canonical: "/esoterico/backtester" },
};

export default function Page() {
    return (
        <DimensionPage
            slug="/esoterico/backtester"
            name="Backtester astral"
            eyebrow="Dimensión 07"
            title={<>¿Y si hubieras operado<br /><span className="grad">con las estrellas?</span></>}
            lead="Las otras seis dimensiones observan; ésta aprieta el gatillo. Construye una estrategia con las señales astrales —salir del mercado cuando la turbulencia sube, filtrar por luna o por Mercurio— y ejecútala sobre décadas de datos reales contra el rival imbatible: no hacer nada."
            hypothesis="Si alguna señal esotérica contiene información, una estrategia que la use debería batir a Buy & Hold —comprar y aguantar— en retorno, en riesgo, o en ambos. El backtest es el juicio final de todo el pilar: aquí las corazonadas se convierten en curvas de capital."
            measurement={[
                { title: "Estrategia configurable de verdad", detail: "Umbral de turbulencia deslizable, filtros opcionales de luna nueva y Mercurio retrógrado, y cuatro activos (S&P 500, Bitcoin, oro, Nasdaq) con décadas de datos diarios reales." },
                { title: "Costes y métricas de adulto", detail: "Cada entrada y salida paga su coste de transacción configurable. Se comparan retorno total, CAGR sobre calendario real, drawdown máximo y win-rate mensual — no solo la curva bonita." },
                { title: "El test que decide", detail: "Un test de permutación compara los retornos de los días dentro y fuera de mercado: si la señal vale algo, los días que evita deberían ser peores. Miles de permutaciones, p-valor, y un aviso explícito del sesgo de retrospección de las señales in-sample." },
            ]}
            verdict={{
                headline: "«La diferencia NO es distinguible del azar»",
                body: "Ese texto —literal— es lo que la app imprime cuando el filtro astral no separa días buenos de malos mejor que barajar las fechas. Y añade el aviso que ningún vendedor de sistemas te da: la señal de turbulencia se construye sobre aspectos que coinciden con crisis ya conocidas, así que su backtest está inflado por retrospección. Ocasionalmente una configuración parece ganar; con costes reales y fuera de muestra, la ventaja se evapora. Ese resultado no es un fallo del módulo: es el módulo.",
            }}
            faq={[
                { q: "¿Contra qué se compara la estrategia?", a: "Contra Buy & Hold del mismo activo en el mismo periodo: comprar el primer día y no tocar nada. Es el baseline correcto porque es la alternativa real de un inversor pasivo — y históricamente, dificilísimo de batir." },
                { q: "¿Por qué insistís tanto en los costes de transacción?", a: "Porque las estrategias de señales entran y salen decenas o cientos de veces, y cada operación cuesta. Un backtest sin costes es marketing; con un coste realista por operación, la mayoría de «sistemas» pierde su magia. El deslizador te deja verlo en directo." },
                { q: "¿Qué es el sesgo de retrospección aquí?", a: "Las fechas de los aspectos planetarios son conocidas y coinciden con crisis pasadas (2008, 2020), de modo que evaluar la señal sobre esos mismos años es examinarse con las respuestas delante. La app lo advierte en pantalla en vez de aprovecharse del efecto." },
                { q: "¿Puedo backtestear estrategias serias, no astrales?", a: "Este módulo está dedicado a las señales esotéricas — su gracia es someterlas a juicio. Para el análisis serio están los tres analizadores fundamentales, el screener y la cartera simulada, que es tu backtest hacia delante." },
            ]}
        />
    );
}
