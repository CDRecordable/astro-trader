import type { Metadata } from "next";
import DimensionPage from "@/components/DimensionPage";

export const metadata: Metadata = {
    title: "Mercurio retrógrado y la bolsa · El mito, medido con datos",
    description:
        "¿Cae el mercado cuando Mercurio va retrógrado? Ventanas retrógradas calculadas astronómicamente, retornos dentro y fuera comparados con test de significancia, y el calendario de próximos periodos. El folclore financiero más famoso, auditado.",
    keywords: ["mercurio retrógrado bolsa", "invertir mercurio retrógrado", "mercurio retrógrado 2026", "mercurio retrógrado significado mercados"],
    alternates: { canonical: "/esoterico/mercurio-retrogrado" },
};

export default function Page() {
    return (
        <DimensionPage
            slug="/esoterico/mercurio-retrogrado"
            name="Mercurio retrógrado"
            eyebrow="Dimensión 03"
            title={<>Mercurio retrógrado,<br /><span className="grad">el chivo expiatorio favorito</span></>}
            lead="Tres o cuatro veces al año, Mercurio parece retroceder en el cielo y las redes se llenan de avisos: no firmes contratos, no compres acciones. Es la creencia astro-financiera más citada del mundo — lo que la convierte en la más divertida de auditar."
            hypothesis="Mercurio rige la comunicación y el comercio; cuando va «hacia atrás», los malentendidos, los fallos técnicos y las malas decisiones se multiplican — y con ellos, la volatilidad y las caídas del mercado. Corolario popular: evita operar durante el retrógrado."
            measurement={[
                { title: "Retrógrados calculados, no copiados", detail: "El movimiento aparente de Mercurio se deriva de la efeméride: cuando su longitud eclíptica geocéntrica decrece, está retrógrado. Las ventanas salen del cálculo, incluida la sombra de entrada y salida." },
                { title: "Dentro contra fuera", detail: "Los retornos diarios del mercado se separan en sesiones dentro y fuera de las ventanas retrógradas, y se comparan medias, volatilidad y la distribución completa de ambos grupos." },
                { title: "El test que el folclore nunca pasa", detail: "Un test de permutación mide si la diferencia observada podría salir del puro azar de barajar los días. El gráfico sombrea cada ventana retrógrada sobre el precio para que además lo veas a ojo." },
            ]}
            verdict={{
                headline: "El mercado no ha leído su horóscopo",
                body: "Mercurio pasa retrógrado cerca del 20% del año — unas 50 sesiones anuales — así que dentro de sus ventanas caben subidas, bajadas y de todo, exactamente en la proporción que cabría esperar. En nuestros datos la diferencia de retornos entre dentro y fuera no se distingue del azar, y la app te lo dice con el p-valor en pantalla en lugar de dejarlo en anécdota. El calendario de próximos retrógrados se incluye igualmente: para que compruebes por ti mismo la próxima vez que alguien culpe al planeta." ,
            }}
            faq={[
                { q: "¿Qué significa que Mercurio esté «retrógrado»?", a: "Es una ilusión óptica: la Tierra y Mercurio orbitan a velocidades distintas y, al adelantarle, Mercurio parece retroceder contra el fondo de estrellas durante unas tres semanas. No cambia nada físico — el planeta nunca va hacia atrás." },
                { q: "¿Cuántas veces ocurre al año?", a: "Tres o cuatro periodos de unas tres semanas, alrededor del 20% de las sesiones de mercado. La app muestra el calendario de los próximos, calculado astronómicamente." },
                { q: "¿De verdad no hay ningún efecto?", a: "En nuestros datos, la diferencia entre operar dentro o fuera del retrógrado no supera un test de permutación — es indistinguible de barajar los días al azar. Si en algún periodo concreto aparece una brecha, el panel te muestra su tamaño y su p-valor para que la pongas en contexto." },
                { q: "¿Entonces por qué incluirlo?", a: "Porque es el mito de referencia: auditarlo con datos reales y metodología visible es la mejor vacuna contra el resto del folclore. Y porque hacerlo bien —efemérides reales, tests de verdad— es más interesante que burlarse de él." },
            ]}
        />
    );
}
