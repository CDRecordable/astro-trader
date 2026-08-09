import type { Metadata } from "next";
import DimensionPage from "@/components/DimensionPage";

export const metadata: Metadata = {
    title: "Actividad solar y mercados · Manchas solares frente a retornos",
    description:
        "El ciclo de manchas solares con datos oficiales del observatorio SILSO, cruzado con los retornos del mercado en regímenes de máximo, medio y mínimo solar. Una hipótesis con siglo y medio de historia, medida en serio.",
    keywords: ["manchas solares mercados", "ciclo solar economía", "actividad solar bolsa", "SILSO manchas solares", "Jevons ciclo solar"],
    alternates: { canonical: "/esoterico/actividad-solar" },
};

export default function Page() {
    return (
        <DimensionPage
            slug="/esoterico/actividad-solar"
            name="Actividad solar"
            eyebrow="Dimensión 04"
            title={<>El sol tiene ciclos.<br /><span className="grad">¿Los tiene tu cartera?</span></>}
            lead="La idea viene del siglo XIX: el economista William Jevons propuso que el ciclo solar de ~11 años gobernaba las cosechas y, con ellas, la economía entera. Hoy suena pintoresco, así que lo medimos con los datos oficiales de manchas solares y el mercado moderno."
            hypothesis="La actividad solar, medida en manchas solares, sigue ciclos de unos 11 años que afectarían al clima, al ánimo colectivo o incluso a la tecnología, y a través de ellos a la economía y los mercados: máximos solares eufóricos, mínimos deprimidos. Es la versión astro-física del ciclo económico."
            measurement={[
                { title: "Datos oficiales del SILSO", detail: "El recuento de manchas solares viene del SILSO (Real Observatorio de Bélgica), la fuente de referencia mundial que mantiene la serie desde el siglo XVIII. Nada de datos inventados o suavizados a conveniencia." },
                { title: "Tres regímenes solares", detail: "Cada periodo se clasifica en máximo, medio o mínimo solar según el nivel de actividad frente a su propio ciclo, y los retornos del mercado se agregan por régimen." },
                { title: "Comparación con baseline", detail: "Los retornos por régimen se comparan entre sí y con el conjunto, con test de significancia, porque tres medias siempre serán distintas; la pregunta es si más de lo que el azar produce." },
            ]}
            verdict={{
                headline: "Un ciclo precioso que el mercado ignora",
                body: "El ciclo solar es real, medible y regular, cosa rara en este pilar. Lo que no aparece es su transmisión a los precios: las diferencias de retorno entre regímenes solares no superan la significancia estadística en nuestros datos, y el panel lo muestra sin retoques. Jevons era un gran economista con una mala hipótesis; nosotros preferimos enseñarte sus números a repetir su error.",
            }}
            faq={[
                { q: "¿Qué son las manchas solares?", a: "Regiones más frías y oscuras de la superficie solar asociadas a actividad magnética intensa. Su número sube y baja en ciclos de ~11 años, y es el indicador clásico de actividad solar, con registros continuos desde el siglo XVIII." },
                { q: "¿Qué es el SILSO?", a: "El Sunspot Index and Long-term Solar Observations del Real Observatorio de Bélgica: el organismo que mantiene el recuento oficial internacional de manchas solares. Es la fuente que usa la app, en vivo." },
                { q: "¿No afecta el sol a los satélites y a la red eléctrica?", a: "Las tormentas solares extremas sí pueden dañar infraestructura: es un riesgo físico real y puntual. Otra cosa es que el ciclo de 11 años module sistemáticamente los retornos bursátiles, que es lo que aquí se mide y no aparece." },
                { q: "¿Por qué molestarse en medirlo?", a: "Porque es la hipótesis esotérica con mejor pedigrí histórico (la propuso un economista serio) y el mejor ejemplo de cómo un ciclo real puede no transmitirse a los precios. Distinguir «el fenómeno existe» de «el fenómeno es operable» es la lección entera de este pilar." },
            ]}
        />
    );
}
