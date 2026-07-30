import type { Metadata } from "next";
import DimensionPage from "@/components/DimensionPage";

export const metadata: Metadata = {
    title: "Turbulencia astral · ¿Predicen los aspectos planetarios las crisis?",
    description:
        "Un índice de tensión construido con los aspectos duros reales de Saturno, Urano y Plutón — los ciclos generacionales que la tradición asocia a crisis — sometido a tests de permutación. Con su sesgo de retrospección explicado.",
    keywords: ["aspectos planetarios mercados", "Saturno Urano Plutón crisis", "astrología financiera", "cuadratura Urano Plutón 2008"],
    alternates: { canonical: "/esoterico/turbulencia-astral" },
};

export default function Page() {
    return (
        <DimensionPage
            slug="/esoterico/turbulencia-astral"
            name="Turbulencia astral"
            eyebrow="Dimensión 01"
            title={<>Los planetas lentos<br /><span className="grad">y las crisis rápidas</span></>}
            lead="Saturno, Urano y Plutón tardan décadas en recorrer el zodiaco, y la tradición astrológica asocia sus choques —cuadraturas, oposiciones, conjunciones— con las grandes rupturas colectivas. Convertimos esa idea en un índice medible y lo confrontamos con el mercado real."
            hypothesis="Cuando los planetas generacionales forman aspectos «duros» entre sí (ángulos de 0°, 90° o 180°), la tensión colectiva sube y los mercados sufren. La cuadratura Urano-Plutón acompañó la Gran Depresión de los años 30 y su repetición rondó 2008-2012: el folclore astro-financiero vive de esas coincidencias."
            measurement={[
                { title: "Efemérides de verdad, no fechas escogidas", detail: "Las posiciones planetarias se calculan con astronomy-engine —longitudes eclípticas reales para cualquier fecha—, de modo que los aspectos emergen del cielo calculado, no de una lista escrita a mano para que cuadre con las crisis." },
                { title: "Un índice continuo de tensión", detail: "Cada aspecto activo aporta tensión según su tipo y su orbe (lo exacto que es el ángulo). La suma diaria produce el índice de turbulencia 0-100 que se dibuja sobre el precio del S&P 500, Bitcoin, oro o Nasdaq." },
                { title: "Test de permutación sobre los retornos", detail: "Separamos los retornos diarios en días de alta y baja turbulencia y preguntamos: ¿son los días «turbulentos» realmente peores de lo que saldría barajando al azar? Miles de permutaciones, p-valor delante." },
            ]}
            verdict={{
                headline: "La app te avisa del truco antes de que te lo cuele",
                body: "Los aspectos generacionales coinciden con crisis célebres porque son lentísimos: cualquier ventana de varios años pilla alguna crisis dentro. La propia app lo advierte en pantalla — la señal se construye sobre fechas que coinciden con crisis ya conocidas (2008, 2020), así que evaluarla sobre esas mismas fechas es un test in-sample con sesgo de retrospección. Y cuando el test de permutación no distingue los días turbulentos del azar, lo dice con esas palabras. Es el módulo más espectacular de mirar y el más claro ejemplo de por qué mirar no basta.",
            }}
            faq={[
                { q: "¿Qué son los aspectos «duros»?", a: "Ángulos considerados tensos en astrología: la conjunción (0°), la cuadratura (90°) y la oposición (180°) entre dos planetas, medidos sobre sus longitudes eclípticas. El «orbe» es el margen de grados alrededor del ángulo exacto en el que el aspecto se considera activo." },
                { q: "¿Por qué solo los planetas lentos?", a: "Porque son los que definen ciclos de décadas —los «generacionales»— y por tanto los únicos candidatos plausibles a correlacionar con macro-crisis. Los rápidos (Luna, Mercurio, Venus) cambian de posición en días y tienen sus propios módulos." },
                { q: "¿El índice predijo 2008 o 2020?", a: "El índice estaba alto alrededor de ambas fechas — pero eso es precisamente el sesgo de retrospección que la app señala: los aspectos son tan largos que «acertar» una crisis dentro de una ventana de años no tiene mérito estadístico. El test honesto, sobre retornos diarios, no encuentra poder predictivo distinguible del azar." },
                { q: "¿Para qué sirve entonces?", a: "Como educación estadística de primera: es un caso perfecto de correlación espuria con narrativa seductora. Y como el índice también alimenta el backtester, puedes comprobar tú mismo qué pasa al operar con él — con costes incluidos." },
            ]}
        />
    );
}
