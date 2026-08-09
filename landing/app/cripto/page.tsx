import type { Metadata } from "next";
import AnalyzerPage from "@/components/AnalyzerPage";
import { CRYPTO_VOXELS } from "@/components/Voxel";

export const metadata: Metadata = {
    title: "Análisis fundamental de criptomonedas · Tokenomics y datos on-chain",
    description:
        "Analiza criptomonedas con criterios fundamentales: «P/S cripto» sobre comisiones reales del protocolo, dilución de supply, FDV/MC, TVL, concentración de ballenas on-chain y datos de red en vivo. Sin predicciones de precio.",
    keywords: ["análisis cripto fundamental", "tokenomics", "ballenas on-chain", "TVL", "FDV", "hedera TPS", "criptomonedas inversión"],
    alternates: { canonical: "/cripto" },
};

export default function CryptoPage() {
    return (
        <AnalyzerPage
            eyebrow="Cripto"
            title={<>Fundamentales<br /><span className="grad">en un mercado sin ellos</span></>}
            lead="En cripto casi todo es narrativa. Esto busca lo poco que es medible: qué ingresos reales genera el protocolo, cuánta emisión pende sobre el precio y qué hacen las ballenas."
            accent="var(--amber)"
            voxels={CRYPTO_VOXELS}
            pillars={[
                { name: "Tokenomics y valor", weight: 40, detail: "Si el token está caro respecto a los ingresos reales del protocolo, y cuánta dilución queda por llegar." },
                { name: "Red y on-chain", weight: 35, detail: "Actividad de desarrollo, valor bloqueado, número de holders y concentración: la salud que no depende del precio." },
                { name: "Momentum", weight: 25, detail: "Distancia al máximo histórico y tendencia a medio plazo, ajustado por el índice de miedo y codicia." },
            ]}
            signals={[
                { name: "«P/S cripto»", detail: "Capitalización entre comisiones anualizadas del protocolo. El equivalente al PER cuando el protocolo ingresa comisiones." },
                { name: "FDV / Market cap", detail: "Cuánta emisión futura pende sobre el precio. Cerca de 1 es sano; 5× es una losa." },
                { name: "Supply en circulación", detail: "Qué porcentaje del máximo ya circula. Bajo significa dilución pendiente." },
                { name: "MC / TVL", detail: "Capitalización frente al valor realmente bloqueado en el protocolo." },
                { name: "Concentración top-10", detail: "Qué parte del supply controlan las diez mayores carteras. On-chain, sin API de pago." },
                { name: "Acumulación de ballenas", detail: "Variación agregada de las grandes carteras, construida con instantáneas locales entre visitas." },
                { name: "Actividad de desarrollo", detail: "Commits y contribuidores recientes. Un cero suele significar «no rastreado», no «muerto», y se trata como tal." },
                { name: "Datos de red en vivo", detail: "Para cadenas con nodo público (p. ej. Hedera): transacciones por segundo reales, supply on-chain y cuentas nuevas al día." },
                { name: "Desbloqueos próximos", detail: "Calendario de vesting: emisión programada que puede tumbar el precio." },
                { name: "Miedo y codicia", detail: "Ajuste macro contrario y suave: el pánico extremo suma, la euforia resta." },
            ]}
            differentiator={{
                title: "Ningún dato inventado, ninguna predicción de precio",
                body: "La capa de IA tiene explícitamente prohibido dar precios objetivo o decir si algo «va a subir». Se dedica a lo que las APIs no capturan: qué hace realmente la tecnología, qué riesgos de gobernanza y centralización existen, quién compite. Y cuando un dato on-chain no está disponible (algo habitual fuera de las redes EVM), se marca como N/D y se excluye del cálculo, en lugar de castigar al activo por una limitación nuestra.",
            }}
            faq={[
                { q: "¿Qué criptomonedas puedo analizar?", a: "Cualquiera listada en CoinGecko, que son varios miles. Los datos on-chain de holders y concentración están disponibles en redes EVM vía Blockscout; en otras cadenas aparecen como N/D." },
                { q: "¿Necesito claves de API de pago?", a: "No. CoinGecko, DeFiLlama, Blockscout, el índice de miedo y codicia y el nodo de Hedera funcionan sin clave. Solo el calendario de catalizadores usa una clave gratuita opcional." },
                { q: "¿Qué es eso de la acumulación de ballenas?", a: "Los datos de holders son una foto del momento, no un histórico. La app guarda una instantánea local cada vez que consultas un activo y, con el tiempo, construye tu propio histórico para medir si las grandes carteras acumulan o distribuyen." },
                { q: "¿Sirve para hacer trading?", a: "No está pensado para eso. No hay señales de entrada ni salida, ni indicadores de corto plazo. Es una herramienta para decidir en qué proyectos merece la pena estar, no cuándo apretar el botón." },
            ]}
        />
    );
}
