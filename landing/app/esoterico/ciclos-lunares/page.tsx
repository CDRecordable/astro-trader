import type { Metadata } from "next";
import DimensionPage from "@/components/DimensionPage";

export const metadata: Metadata = {
    title: "Ciclos lunares y bolsa · ¿Rinde distinto el mercado con luna llena?",
    description:
        "Retornos diarios del mercado clasificados por fase lunar real siguiendo la metodología académica de Dichev & Janes, con más de 6.000 sesiones y test de significancia. El resultado, sin adornos.",
    keywords: ["luna llena bolsa", "ciclos lunares mercado", "Dichev Janes lunar", "fase lunar inversión", "luna nueva mercados"],
    alternates: { canonical: "/esoterico/ciclos-lunares" },
};

export default function Page() {
    return (
        <DimensionPage
            slug="/esoterico/ciclos-lunares"
            name="Ciclos lunares"
            eyebrow="Dimensión 02"
            title={<>La luna sobre<br /><span className="grad">los mercados</span></>}
            lead="Es la hipótesis esotérica con más pedigrí académico: dos profesores de finanzas —Dichev y Janes— publicaron en 2003 que los retornos alrededor de la luna nueva parecían mayores que alrededor de la llena. Replicamos su metodología con datos actuales y dejamos que los números hablen."
            hypothesis="El ciclo lunar afecta al estado de ánimo colectivo —sueño, humor, apetito por el riesgo— y eso se filtra a los precios: mercados más alegres cerca de la luna nueva, más sombríos cerca de la llena. Si fuera cierto, bastaría inclinar la exposición según el calendario lunar."
            measurement={[
                { title: "Fase lunar astronómica por sesión", detail: "Cada día de mercado recibe su fase calculada astronómicamente (no un calendario aproximado), y se asigna a la mitad «luna nueva» o «luna llena» del ciclo, tal como hace el estudio original." },
                { title: "Metodología Dichev & Janes", detail: "Retornos diarios agregados por régimen sobre más de 6.000 sesiones, con el retorno anualizado de cada mitad del ciclo — lo que ganarías por año invirtiendo solo en cada régimen." },
                { title: "Significancia, no anécdota", detail: "La diferencia entre regímenes pasa por un test de permutación: barajamos las etiquetas miles de veces y medimos qué fracción del azar produce una brecha igual o mayor. Ese es el p-valor que ves." },
            ]}
            verdict={{
                headline: "Una rareza estadística que no da para estrategia",
                body: "En muestras largas puede aparecer una diferencia entre mitades del ciclo — el propio paper la reportó. Lo que la app te enseña es lo que el paper también reconocía y el marketing lunar omite: la brecha es pequeña, inestable entre periodos y, tras costes de transacción, no sostiene una estrategia. Cuando en nuestros datos la diferencia no se distingue del azar, el panel lo dice; cuando aparece, te muestra su tamaño real para que juzgues si te cambia la vida. Spoiler: no.",
            }}
            faq={[
                { q: "¿Quiénes son Dichev y Janes?", a: "Dos académicos de finanzas que publicaron en 2003 «Lunar cycle effects in stock returns», encontrando retornos mayores alrededor de la luna nueva en varios índices. Es el punto de partida serio de esta hipótesis, y por eso replicamos su método y no uno inventado." },
                { q: "¿Cómo se determina la fase lunar de cada día?", a: "Con cálculo astronómico real de la elongación Sol-Luna para la fecha de cada sesión — no con un calendario impreso. La frontera entre regímenes cae exactamente donde cae el ciclo." },
                { q: "¿Sale el mismo resultado que en el paper?", a: "Depende del periodo y el índice: el efecto es débil e inestable, que es justamente la conclusión honesta. La app te muestra el resultado sobre los datos cargados, con su p-valor, en lugar de citarte el paper como si fuera ley." },
                { q: "¿Puedo operar con esto?", a: "Poder, puedes — el backtester te deja añadir el filtro lunar a una estrategia y ver el resultado con costes. Verlo en tu propia simulación es más pedagógico que cualquier advertencia nuestra." },
            ]}
        />
    );
}
