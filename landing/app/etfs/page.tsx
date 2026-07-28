import type { Metadata } from "next";
import AnalyzerPage from "@/components/AnalyzerPage";
import { ETF_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Análisis de ETFs UCITS · Coste real, cartera y valoración",
    description:
        "57 ETFs UCITS comprables desde España, analizados por coste (TER real del folleto), qué contienen de verdad (concentración del top-10, P/E de la cesta, sectores) y momentum. Economías, sectores, temáticos y oro.",
    keywords: ["ETF UCITS", "análisis ETF", "TER", "MSCI World", "S&P 500 UCITS", "ETF acumulación distribución", "invertir ETFs España"],
    alternates: { canonical: "/etfs" },
};

export default function EtfPage() {
    return (
        <AnalyzerPage
            eyebrow="ETFs"
            title={<>Qué compras<br /><span className="grad">cuando compras un ETF</span></>}
            lead="Un ETF parece una caja negra barata. Esto la abre: cuánto te cuesta de verdad, qué hay dentro, a qué precio cotiza esa cesta y si tu «diversificación» son en realidad siete empresas."
            accent="var(--violet)"
            voxels={ETF_VOXELS}
            pillars={[
                { name: "Coste y vehículo", weight: 30, detail: "TER, patrimonio, antigüedad, rotación y clase de acumulación. El coste es lo único garantizado de tu inversión." },
                { name: "Cartera y valoración", weight: 40, detail: "Concentración del top-10, P/E y P/B de la cesta subyacente y diversificación sectorial real." },
                { name: "Momentum y timing", weight: 30, detail: "Posición frente a la media de 200 sesiones, retornos, volatilidad anualizada y caída desde máximos." },
            ]}
            signals={[
                { name: "TER real", detail: "Tomado del folleto (KID) del emisor, no del dato incompleto que devuelven las APIs para los UCITS." },
                { name: "Patrimonio (AUM)", detail: "Por debajo de 100 M hay riesgo real de cierre del fondo y de que te fuercen a vender." },
                { name: "Peso del top-10", detail: "Si las diez mayores posiciones pesan más del 50%, tu ETF «global» es una apuesta concentrada." },
                { name: "P/E de la cesta", detail: "Si la economía o el sector que estás comprando cotiza caro o barato por dentro." },
                { name: "Sector dominante", detail: "El sector con más peso. En un fondo amplio, más del 45% en uno solo es una apuesta encubierta." },
                { name: "Acumulación vs distribución", detail: "Clave fiscal en España: acumular reinvierte sin peaje anual; distribuir tributa cada año." },
                { name: "Rotación de cartera", detail: "Cuánto compra y vende el fondo al año. Un indexado puro apenas rota; rotar mucho son costes ocultos." },
                { name: "Precio vs media 200", detail: "Ligeramente por encima es tendencia sana; muy por encima, extendido; muy por debajo, tendencia rota." },
                { name: "Caída desde máximos", detail: "En un índice amplio, una corrección moderada suele ser mejor entrada que comprar en máximos." },
                { name: "Volatilidad anualizada", detail: "Cuánto se mueve en un año típico: la calidad del viaje, no solo el destino." },
            ]}
            differentiator={{
                title: "UCITS primero: solo lo que puedes comprar de verdad",
                body: "La mayoría de herramientas analizan ETFs estadounidenses que un inversor minorista europeo no puede comprar. El universo aquí son 57 fondos UCITS reales, verificados uno a uno, listados en Xetra, Londres, Ámsterdam, París o Milán. Cuando el listado europeo no publica su cartera, se completa con la del fondo americano equivalente —misma cesta subyacente— y la ficha lo dice abiertamente en lugar de disimularlo. Y los fondos sectoriales o temáticos no se penalizan por estar concentrados: eso es exactamente lo que el comprador eligió.",
            }}
            faq={[
                { q: "¿Qué ETFs incluye?", a: "Global (MSCI World, FTSE All-World), EE.UU. (S&P 500, Nasdaq, Russell 2000), Europa, emergentes, países sueltos (India, China, Japón, Brasil, Corea, España), los nueve sectores del S&P, temáticos (semiconductores, IA, defensa, ciberseguridad, agua, robótica, baterías), factores y oro físico." },
                { q: "¿Puedo analizar un ETF que no esté en la lista?", a: "El screener recorre el universo curado por categorías, pero la ficha funciona con cualquier símbolo que Yahoo reconozca. La lista curada existe para garantizar TER correctos y que sean comprables desde Europa." },
                { q: "¿Por qué el TER es «curado» y no automático?", a: "Porque Yahoo devuelve 0% para la mayoría de UCITS, y un coste mal leído arruina toda la comparación. Se toman del folleto oficial del emisor y conviene revisarlos una vez al año." },
                { q: "¿Sirve para construir una cartera indexada?", a: "Sí, y para vigilarla: puedes replicar tus posiciones reales por porcentaje en la cartera simulada y seguir su evolución con una curva de valor." },
            ]}
        />
    );
}
