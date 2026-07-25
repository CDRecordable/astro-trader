// ============================================================
// ETF registry — curated UCITS universe (hybrid UCITS-first)
// ============================================================
// Each entry is a UCITS ETF the user can actually buy from Europe, listed
// under its most liquid Yahoo symbol (Xetra .DE / LSE .L / Amsterdam .AS /
// Paris .PA / Milan .MI). Yahoo's coverage of UCITS listings is patchier
// than for US funds, so entries carry:
//   • a curated TER (Yahoo often reports 0 for UCITS),
//   • an optional US-listed proxy used ONLY to enrich portfolio data
//     (holdings, sector weights, underlying P/E) when the UCITS listing
//     lacks it — clearly flagged in the UI as an equivalence.
// TER values are decimals (0.0022 = 0.22%) from the issuers' KIDs; they
// change rarely but should be re-checked once a year.

export type EtfCategory =
    | "global"      // world / all-country
    | "usa"         // US broad market
    | "europe"      // Europe broad
    | "emerging"    // EM broad
    | "country"     // single-country
    | "sector"      // GICS-style sector
    | "thematic"    // megatrend / niche
    | "factor"      // momentum / quality / value / dividend
    | "gold";       // physical gold ETCs

export interface EtfEntry {
    /** Yahoo symbol of the UCITS listing (e.g. "VWCE.DE"). */
    symbol: string;
    name: string;
    category: EtfCategory;
    /** Human label of the tracked index. */
    index: string;
    /** Curated TER as a decimal (0.0022 = 0.22%). */
    ter: number;
    /** US-listed equivalent used to enrich portfolio data when missing. */
    usProxy?: string;
    /** true = accumulating (Acc), false = distributing (Dist). */
    accumulating: boolean;
    /** For country ETFs: the country/region label. */
    region?: string;
}

export const ETF_REGISTRY: EtfEntry[] = [
    // ── Global / All-World ─────────────────────────────────────
    { symbol: "VWCE.DE", name: "Vanguard FTSE All-World (Acc)", category: "global", index: "FTSE All-World", ter: 0.0022, usProxy: "VT", accumulating: true },
    { symbol: "VGWL.DE", name: "Vanguard FTSE All-World (Dist)", category: "global", index: "FTSE All-World", ter: 0.0022, usProxy: "VT", accumulating: false },
    { symbol: "EUNL.DE", name: "iShares Core MSCI World (Acc)", category: "global", index: "MSCI World", ter: 0.0020, usProxy: "URTH", accumulating: true },
    { symbol: "XDWD.DE", name: "Xtrackers MSCI World (Acc)", category: "global", index: "MSCI World", ter: 0.0019, usProxy: "URTH", accumulating: true },
    { symbol: "SPYI.DE", name: "SPDR MSCI ACWI IMI (Acc)", category: "global", index: "MSCI ACWI IMI", ter: 0.0017, usProxy: "ACWI", accumulating: true },
    { symbol: "IUSN.DE", name: "iShares MSCI World Small Cap (Acc)", category: "global", index: "MSCI World Small Cap", ter: 0.0035, accumulating: true },

    // ── USA broad ──────────────────────────────────────────────
    { symbol: "SXR8.DE", name: "iShares Core S&P 500 (Acc)", category: "usa", index: "S&P 500", ter: 0.0007, usProxy: "SPY", accumulating: true },
    { symbol: "VUAA.DE", name: "Vanguard S&P 500 (Acc)", category: "usa", index: "S&P 500", ter: 0.0007, usProxy: "VOO", accumulating: true },
    { symbol: "SPYL.DE", name: "SPDR S&P 500 (Acc)", category: "usa", index: "S&P 500", ter: 0.0003, usProxy: "SPY", accumulating: true },
    { symbol: "SXRV.DE", name: "iShares Nasdaq 100 (Acc)", category: "usa", index: "Nasdaq-100", ter: 0.0033, usProxy: "QQQ", accumulating: true },
    { symbol: "XRS2.DE", name: "Xtrackers Russell 2000 (Acc)", category: "usa", index: "Russell 2000 (small caps)", ter: 0.0030, usProxy: "IWM", accumulating: true },
    { symbol: "SPY4.DE", name: "SPDR S&P 400 US Mid Cap (Acc)", category: "usa", index: "S&P MidCap 400", ter: 0.0030, usProxy: "MDY", accumulating: true },
    { symbol: "VUSA.AS", name: "Vanguard S&P 500 (Dist)", category: "usa", index: "S&P 500", ter: 0.0007, usProxy: "VOO", accumulating: false },

    // ── Europe broad ───────────────────────────────────────────
    { symbol: "EXSA.DE", name: "iShares STOXX Europe 600 (Dist)", category: "europe", index: "STOXX Europe 600", ter: 0.0020, usProxy: "IEUR", accumulating: false },
    { symbol: "MEUD.PA", name: "Amundi Core STOXX Europe 600 (Acc)", category: "europe", index: "STOXX Europe 600", ter: 0.0007, usProxy: "IEUR", accumulating: true },
    { symbol: "SXRT.DE", name: "iShares Core EURO STOXX 50 (Acc)", category: "europe", index: "EURO STOXX 50", ter: 0.0010, usProxy: "FEZ", accumulating: true },
    { symbol: "EXS1.DE", name: "iShares Core DAX (Acc)", category: "europe", index: "DAX 40", ter: 0.0016, usProxy: "EWG", accumulating: true, region: "Alemania" },
    { symbol: "IMEU.L", name: "iShares Core MSCI Europe (Dist)", category: "europe", index: "MSCI Europe", ter: 0.0012, usProxy: "IEUR", accumulating: false },

    // ── Emerging markets ───────────────────────────────────────
    { symbol: "IS3N.DE", name: "iShares Core MSCI EM IMI (Acc)", category: "emerging", index: "MSCI EM IMI", ter: 0.0018, usProxy: "IEMG", accumulating: true },
    { symbol: "VFEA.DE", name: "Vanguard FTSE Emerging Markets (Acc)", category: "emerging", index: "FTSE Emerging", ter: 0.0022, usProxy: "VWO", accumulating: true },
    { symbol: "XMME.DE", name: "Xtrackers MSCI Emerging Markets (Acc)", category: "emerging", index: "MSCI Emerging Markets", ter: 0.0018, usProxy: "EEM", accumulating: true },

    // ── Countries / single economies ───────────────────────────
    { symbol: "FLXI.DE", name: "Franklin FTSE India (Acc)", category: "country", index: "FTSE India", ter: 0.0019, usProxy: "INDA", accumulating: true, region: "India" },
    { symbol: "QDV5.DE", name: "iShares MSCI India (Acc)", category: "country", index: "MSCI India", ter: 0.0065, usProxy: "INDA", accumulating: true, region: "India" },
    { symbol: "XCS6.DE", name: "Xtrackers MSCI China (Acc)", category: "country", index: "MSCI China", ter: 0.0065, usProxy: "MCHI", accumulating: true, region: "China" },
    { symbol: "36BZ.DE", name: "iShares MSCI China A (Acc)", category: "country", index: "MSCI China A (acciones onshore)", ter: 0.0040, usProxy: "ASHR", accumulating: true, region: "China" },
    { symbol: "XDJP.DE", name: "Xtrackers Nikkei 225 (Acc)", category: "country", index: "Nikkei 225", ter: 0.0009, usProxy: "EWJ", accumulating: true, region: "Japón" },
    { symbol: "EUNN.DE", name: "iShares Core MSCI Japan IMI (Acc)", category: "country", index: "MSCI Japan IMI", ter: 0.0012, usProxy: "EWJ", accumulating: true, region: "Japón" },
    { symbol: "4BRZ.DE", name: "iShares MSCI Brazil (Dist)", category: "country", index: "MSCI Brazil", ter: 0.0074, usProxy: "EWZ", accumulating: false, region: "Brasil" },
    { symbol: "LYXIB.MC", name: "Amundi IBEX 35 (Dist)", category: "country", index: "IBEX 35", ter: 0.0030, usProxy: "EWP", accumulating: false, region: "España" },
    { symbol: "FLXK.DE", name: "Franklin FTSE Korea (Acc)", category: "country", index: "FTSE Korea", ter: 0.0009, usProxy: "EWY", accumulating: true, region: "Corea del Sur" },
    { symbol: "VDPG.L", name: "Vanguard FTSE Developed Asia Pacific ex Japan (Acc)", category: "country", index: "FTSE Dev. Asia Pacific ex Japan", ter: 0.0015, usProxy: "EPP", accumulating: true, region: "Asia-Pacífico" },

    // ── Sectors (S&P 500 sectors, iShares UCITS on LSE, USD) ───
    { symbol: "IITU.L", name: "iShares S&P 500 Information Technology", category: "sector", index: "S&P 500 Info Tech", ter: 0.0015, usProxy: "XLK", accumulating: true, region: "Tecnología" },
    { symbol: "IHCU.L", name: "iShares S&P 500 Health Care", category: "sector", index: "S&P 500 Health Care", ter: 0.0015, usProxy: "XLV", accumulating: true, region: "Salud" },
    { symbol: "IUES.L", name: "iShares S&P 500 Energy", category: "sector", index: "S&P 500 Energy", ter: 0.0015, usProxy: "XLE", accumulating: true, region: "Energía" },
    { symbol: "IUFS.L", name: "iShares S&P 500 Financials", category: "sector", index: "S&P 500 Financials", ter: 0.0015, usProxy: "XLF", accumulating: true, region: "Financiero" },
    { symbol: "IUCM.L", name: "iShares S&P 500 Communication Sector", category: "sector", index: "S&P 500 Communication", ter: 0.0015, usProxy: "XLC", accumulating: true, region: "Comunicación" },
    { symbol: "IUIS.L", name: "iShares S&P 500 Industrials", category: "sector", index: "S&P 500 Industrials", ter: 0.0015, usProxy: "XLI", accumulating: true, region: "Industrial" },
    { symbol: "IUCD.L", name: "iShares S&P 500 Consumer Discretionary", category: "sector", index: "S&P 500 Cons. Discretionary", ter: 0.0015, usProxy: "XLY", accumulating: true, region: "Consumo discrecional" },
    { symbol: "IUCS.L", name: "iShares S&P 500 Consumer Staples", category: "sector", index: "S&P 500 Cons. Staples", ter: 0.0015, usProxy: "XLP", accumulating: true, region: "Consumo básico" },
    { symbol: "IUUS.L", name: "iShares S&P 500 Utilities", category: "sector", index: "S&P 500 Utilities", ter: 0.0015, usProxy: "XLU", accumulating: true, region: "Utilities" },

    // ── Thematics ──────────────────────────────────────────────
    { symbol: "VVSM.DE", name: "VanEck Semiconductor (Acc)", category: "thematic", index: "MVIS US Listed Semiconductor 10%", ter: 0.0035, usProxy: "SMH", accumulating: true, region: "Semiconductores" },
    { symbol: "XAIX.DE", name: "Xtrackers AI & Big Data (Acc)", category: "thematic", index: "Nasdaq Global AI & Big Data", ter: 0.0035, accumulating: true, region: "Inteligencia Artificial" },
    { symbol: "DFEN.DE", name: "VanEck Defense (Acc)", category: "thematic", index: "MarketVector Global Defense", ter: 0.0055, usProxy: "ITA", accumulating: true, region: "Defensa" },
    { symbol: "IQQH.DE", name: "iShares Global Clean Energy (Dist)", category: "thematic", index: "S&P Global Clean Energy", ter: 0.0065, usProxy: "ICLN", accumulating: false, region: "Energía limpia" },
    { symbol: "IQQQ.DE", name: "iShares Global Water (Dist)", category: "thematic", index: "S&P Global Water", ter: 0.0065, usProxy: "PHO", accumulating: false, region: "Agua" },
    { symbol: "ISPY.L", name: "L&G Cyber Security", category: "thematic", index: "Foxberry Tematica Cybersecurity", ter: 0.0069, usProxy: "CIBR", accumulating: true, region: "Ciberseguridad" },
    { symbol: "2B76.DE", name: "iShares Automation & Robotics (Acc)", category: "thematic", index: "iSTOXX FactSet Automation & Robotics", ter: 0.0040, usProxy: "BOTZ", accumulating: true, region: "Robótica" },
    { symbol: "W1TA.DE", name: "WisdomTree Battery Solutions (Acc)", category: "thematic", index: "WisdomTree Battery Solutions", ter: 0.0040, usProxy: "LIT", accumulating: true, region: "Baterías" },

    // ── Factors / dividend ─────────────────────────────────────
    { symbol: "XDEM.DE", name: "Xtrackers MSCI World Momentum (Acc)", category: "factor", index: "MSCI World Momentum", ter: 0.0025, usProxy: "MTUM", accumulating: true },
    { symbol: "XDEQ.DE", name: "Xtrackers MSCI World Quality (Acc)", category: "factor", index: "MSCI World Quality", ter: 0.0025, usProxy: "QUAL", accumulating: true },
    { symbol: "XDEV.DE", name: "Xtrackers MSCI World Value (Acc)", category: "factor", index: "MSCI World Enhanced Value", ter: 0.0025, usProxy: "VLUE", accumulating: true },
    { symbol: "VGWE.DE", name: "Vanguard FTSE All-World High Dividend (Acc)", category: "factor", index: "FTSE All-World High Dividend Yield", ter: 0.0029, usProxy: "VYM", accumulating: true },
    { symbol: "SPYD.DE", name: "SPDR S&P US Dividend Aristocrats (Dist)", category: "factor", index: "S&P High Yield Dividend Aristocrats", ter: 0.0035, usProxy: "NOBL", accumulating: false },
    { symbol: "SPYW.DE", name: "SPDR S&P Euro Dividend Aristocrats (Dist)", category: "factor", index: "S&P Euro High Yield Dividend Aristocrats", ter: 0.0030, accumulating: false },

    // ── Physical gold (ETCs) ───────────────────────────────────
    { symbol: "8PSG.DE", name: "Invesco Physical Gold ETC", category: "gold", index: "Oro físico (LBMA)", ter: 0.0012, usProxy: "GLD", accumulating: true },
    { symbol: "PPFB.DE", name: "iShares Physical Gold ETC", category: "gold", index: "Oro físico (LBMA)", ter: 0.0012, usProxy: "GLD", accumulating: true },
    { symbol: "4GLD.DE", name: "Xetra-Gold ETC", category: "gold", index: "Oro físico (entrega física)", ter: 0.0000, usProxy: "GLD", accumulating: true },
];

/** Category → human label + emoji, for grouping in the UI. */
export const ETF_CATEGORY_META: Record<EtfCategory, { label: string; emoji: string }> = {
    global: { label: "Global", emoji: "🌍" },
    usa: { label: "EE.UU.", emoji: "🇺🇸" },
    europe: { label: "Europa", emoji: "🇪🇺" },
    emerging: { label: "Emergentes", emoji: "🌏" },
    country: { label: "Países", emoji: "🚩" },
    sector: { label: "Sectores", emoji: "🏭" },
    thematic: { label: "Temáticos", emoji: "🚀" },
    factor: { label: "Factores y dividendo", emoji: "📐" },
    gold: { label: "Oro", emoji: "🥇" },
};

/** Find a registry entry by Yahoo symbol (case-insensitive). */
export function findEtfEntry(symbol: string): EtfEntry | undefined {
    const s = symbol.toLowerCase();
    return ETF_REGISTRY.find((e) => e.symbol.toLowerCase() === s);
}

/** Fuzzy-search the ETF registry (symbol, name, index, region). */
export function searchEtfs(query: string, limit = 10): EtfEntry[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const scored = ETF_REGISTRY
        .filter((e) =>
            e.symbol.toLowerCase().includes(q) ||
            e.name.toLowerCase().includes(q) ||
            e.index.toLowerCase().includes(q) ||
            (e.region ?? "").toLowerCase().includes(q))
        .sort((a, b) => {
            const aStarts = a.symbol.toLowerCase().startsWith(q) || a.name.toLowerCase().startsWith(q) ? 0 : 1;
            const bStarts = b.symbol.toLowerCase().startsWith(q) || b.name.toLowerCase().startsWith(q) ? 0 : 1;
            return aStarts - bStarts;
        });
    return scored.slice(0, limit);
}
