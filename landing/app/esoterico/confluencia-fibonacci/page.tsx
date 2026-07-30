import type { Metadata } from "next";
import DimensionPage from "@/components/DimensionPage";

export const metadata: Metadata = {
    title: "Confluencia Fibonacci-astrológica · Retrocesos y eventos celestes, contra un baseline",
    description:
        "Zonas donde un retroceso de Fibonacci coincide en el tiempo con un evento astrológico, y la pregunta honesta: ¿revierte ahí el precio más que en cualquier otro sitio? Retrocesos multi-swing, 170+ eventos y tasa de reversión comparada con su baseline.",
    keywords: ["fibonacci trading", "retrocesos fibonacci", "fibonacci astrología", "confluencia fibonacci", "niveles fibonacci funcionan"],
    alternates: { canonical: "/esoterico/confluencia-fibonacci" },
};

export default function Page() {
    return (
        <DimensionPage
            slug="/esoterico/confluencia-fibonacci"
            name="Confluencia Fibonacci"
            eyebrow="Dimensión 06"
            title={<>Cuando Fibonacci<br /><span className="grad">se cruza con el cielo</span></>}
            lead="Los retrocesos de Fibonacci son el amuleto favorito del análisis técnico; los eventos astrológicos, el del esotérico. La hipótesis de confluencia dice que donde ambos coinciden, el precio gira. La medimos con la única pregunta que importa: ¿gira más que en cualquier otro punto?"
            hypothesis="Los precios respetan los niveles de Fibonacci (38,2%, 50%, 61,8% de un movimiento previo), y esa tendencia se amplifica cuando el nivel coincide en el tiempo con un evento astrológico relevante — un eclipse, una lunación, un cambio de estación. La doble señal marcaría zonas de giro de alta probabilidad."
            measurement={[
                { title: "Retrocesos multi-swing", detail: "Los niveles se calculan sobre varios movimientos relevantes del precio simultáneamente, no sobre un único swing elegido a posteriori — el truco clásico con el que Fibonacci «siempre acierta»." },
                { title: "Más de 170 eventos astrológicos", detail: "Eclipses, lunaciones, ingresos de signo y estaciones planetarias generados desde la efeméride, cruzados con las visitas del precio a cada nivel para marcar las confluencias." },
                { title: "Tasa de reversión contra baseline", detail: "La pregunta trampa no es «¿revirtió el precio en la confluencia?» sino «¿revierte ahí más que en un punto cualquiera?». Medimos la tasa de reversión en confluencias y la comparamos con la tasa base del mismo activo, con una tolerancia declarada y honesta." },
            ]}
            verdict={{
                headline: "El precio gira en todas partes — esa es la trampa",
                body: "Un mercado volátil «revierte» constantemente: con tolerancia generosa, casi cualquier punto parece soporte mágico. Por eso este módulo existe alrededor de un baseline: la tasa de giro en las confluencias se compara con la tasa de giro en cualquier otro sitio, con la misma vara. Cuando ambas quedan a la par —que es lo que muestran los datos—, la conclusión honesta es que la confluencia no añade información, y el panel la imprime en lugar de esconderla bajo un gráfico bonito con flechas." ,
            }}
            faq={[
                { q: "¿Qué es un retroceso de Fibonacci?", a: "Niveles horizontales trazados a porcentajes fijos (23,6%, 38,2%, 50%, 61,8%…) de un movimiento previo del precio, derivados de la proporción áurea. El análisis técnico los usa como soportes y resistencias potenciales." },
                { q: "¿Qué cuenta como «evento astrológico»?", a: "Eclipses solares y lunares, lunas nuevas y llenas, entradas de planetas en signo y estaciones (paso a retrógrado o directo) — más de 170 fechas generadas desde la efeméride real, no seleccionadas a mano." },
                { q: "¿Qué es la «tolerancia honesta»?", a: "El margen de precio y tiempo dentro del cual se considera que hubo reversión. Con tolerancia elástica todo revierte y la hipótesis es infalsificable; aquí el margen está fijado de antemano, declarado en el panel, y se aplica igual a confluencias y baseline." },
                { q: "¿Y si aún así quiero usar Fibonacci?", a: "El panel te da la versión más justa posible de la herramienta: niveles multi-swing y tasas medidas. Si con el baseline delante sigues viendo valor, al menos decides informado — que es todo lo que esta app promete." },
            ]}
        />
    );
}
