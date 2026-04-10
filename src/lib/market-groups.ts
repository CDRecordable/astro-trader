// ============================================================
// Market Groups - Shared between client and server
// ============================================================

export type MarketGroupId = "us_large" | "us_mid" | "us_small" | "eu_major" | "ibex_mc" | "sp500_top";

export interface MarketGroup {
    id: MarketGroupId;
    label: string;
    flag: string;
    description: string;
    tickers: string[];
}

// US Large-Caps: Mega & large companies everyone knows
const US_LARGE_CAP = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
    "JPM", "V", "UNH", "MA", "HD", "PG", "JNJ", "ABBV", "XOM", "KO",
    "PEP", "COST", "MRK", "LLY", "AVGO", "ADBE", "CRM", "NFLX",
    "AMD", "INTC", "CSCO", "ORCL", "TXN", "QCOM", "WMT", "DIS",
    "NKE", "SBUX", "BA", "GE", "CAT", "DE",
];

// US Mid-Caps: Growth & value opportunities
const US_MID_CAP = [
    "CROX", "DECK", "DDOG", "CELH", "DUOL", "AXON", "TOST", "BIRK",
    "ZS", "HUBS", "TWLO", "SNAP", "PINS", "ROKU", "ETSY", "DOCU",
    "SQ", "SOFI", "HOOD", "COIN", "MARA", "RIOT", "AFRM", "UPST",
    "NET", "DKNG", "RBLX", "U", "PATH", "CFLT",
    "SWKS", "MCHP", "ON", "WOLF", "ENPH", "SEDG", "PLUG", "FSLR",
    "RIVN", "LCID", "NIO", "XPEV", "LI", "CHPT",
    "ABNB", "DASH", "LYFT", "UBER", "GRAB", "SE",
    "BILL", "PAYC", "WIX", "SHOP", "GLOB", "EPAM",
    "WDAY", "VEEV", "ZM", "OKTA", "MDB", "SNOW",
    "PANW", "CRWD", "FTNT", "S", "CYBR",
    "TTD", "MGNI", "PUBM", "DV",
];

// US Small-Caps: Deep value & growth gems
const US_SMALL_CAP = [
    "CLAR", "CORT", "KTOS", "CALM", "RMBS", "LNTH", "SUPN", "PRGS",
    "ANDE", "PLAB", "SIG", "MGRC", "CARG", "IOSP", "HLIT", "NSIT",
    "AEIS", "CVLT", "PLXS", "TTMI", "QLYS", "VCEL", "TGTX", "PCRX",
    "EXLS", "BOOT", "GMS", "IPAR", "TILE", "CENTA", "PATK", "UFPT",
    "WDFC", "HQY", "EPAC", "PRIM", "SHOO", "EAT", "BKE", "SKY",
    "CNXC", "USLM", "BCPC", "ROCK", "ARCH", "MATX", "RXO", "FOXF",
    "DLX", "CPRX", "IRTC", "GSHD", "AMPH", "FIZZ", "LQDT",
    "SMCI", "SOUN", "IONQ", "RGTI", "QUBT",
];

// Europe Major: Top EU companies (Frankfurt, Amsterdam, Paris, London, Milan)
const EU_MAJOR = [
    "SAP.DE", "SIE.DE", "ALV.DE", "DTE.DE", "BAS.DE", "MBG.DE", "BMW.DE", "ADS.DE",
    "ASML.AS", "PHIA.AS", "UNA.AS", "INGA.AS", "HEIA.AS",
    "MC.PA", "OR.PA", "AI.PA", "SAN.PA", "BNP.PA", "AIR.PA", "TTE.PA",
    "SHEL.L", "AZN.L", "ULVR.L", "HSBA.L", "BP.L", "RIO.L", "GSK.L",
    "ENEL.MI", "ISP.MI", "UCG.MI", "ENI.MI",
    "NESN.SW", "NOVN.SW", "ROG.SW",
];

// IBEX 35 & Mercado Continuo: Spain
const IBEX_MC = [
    // IBEX 35 core
    "SAN.MC", "BBVA.MC", "ITX.MC", "IBE.MC", "TEF.MC", "REP.MC", "FER.MC",
    "AMS.MC", "CABK.MC", "GRF.MC", "ENG.MC", "ACS.MC", "MAP.MC", "IAG.MC",
    "CLNX.MC", "FLR.MC", "SAB.MC", "REE.MC", "MRL.MC", "ELE.MC",
    "LOG.MC", "MEL.MC", "ACX.MC", "ROVI.MC", "PHM.MC", "VIS.MC",
    // Mercado Continuo extras
    "CIE.MC", "CAF.MC", "EDR.MC", "TRE.MC", "NHH.MC", "ALM.MC",
    "SCYR.MC", "A3M.MC", "AENA.MC", "COL.MC", "SLR.MC", "DOM.MC",
];

// S&P 500 Top 50 (by index weight — curated)
const SP500_TOP50 = [
    "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "BRK-B", "LLY",
    "AVGO", "JPM", "TSLA", "UNH", "XOM", "V", "MA", "PG", "COST",
    "JNJ", "HD", "ABBV", "MRK", "NFLX", "CRM", "BAC", "AMD", "KO",
    "PEP", "ORCL", "WMT", "TMO", "CSCO", "ACN", "LIN", "MCD", "ABT",
    "PM", "DHR", "ADBE", "TXN", "ISRG", "NEE", "QCOM", "GE", "INTU",
    "AMGN", "CMCSA", "AMAT", "PFE", "BKNG", "NOW",
];

export const MARKET_GROUPS: Record<MarketGroupId, MarketGroup> = {
    us_large: { id: "us_large", label: "US Large-Cap", flag: "🇺🇸", description: "Apple, Google, Tesla and the biggest US companies", tickers: US_LARGE_CAP },
    us_mid: { id: "us_mid", label: "US Mid-Cap", flag: "🇺🇸", description: "Growth & tech mid-caps: Shopify, CrowdStrike, Coinbase...", tickers: US_MID_CAP },
    us_small: { id: "us_small", label: "US Small-Cap", flag: "🔍", description: "Deep-value hidden gems under $2B market cap", tickers: US_SMALL_CAP },
    eu_major: { id: "eu_major", label: "Europe Major", flag: "🇪🇺", description: "SAP, ASML, LVMH, Shell, Nestlé — top EU companies", tickers: EU_MAJOR },
    ibex_mc: { id: "ibex_mc", label: "IBEX 35 & Mercado Continuo", flag: "🇪🇸", description: "Santander, Inditex, Iberdrola, Repsol — Spanish markets", tickers: IBEX_MC },
    sp500_top: { id: "sp500_top", label: "S&P 500 Top 50", flag: "📊", description: "The 50 heaviest companies in the S&P 500 index", tickers: SP500_TOP50 },
};

// Get all tickers for a given market group (convenience)
export function getTickersForMarket(market: MarketGroupId): string[] {
    return MARKET_GROUPS[market]?.tickers ?? [];
}

// ── Crypto Groups (CoinGecko Categories) ─────────────────────
export type CryptoGroupId = "all" | "layer-1" | "decentralized-finance-defi" | "artificial-intelligence" | "gaming" | "meme-token";

export const CRYPTO_GROUPS: Record<CryptoGroupId, MarketGroup> = {
    "all": { id: "all" as any, label: "Top 250 Global", flag: "🌍", description: "The largest cryptocurrencies by market cap", tickers: [] },
    "layer-1": { id: "layer-1" as any, label: "Layer 1 Blockchains", flag: "⛓️", description: "Base layer networks like Ethereum, Solana, and Avalanche", tickers: [] },
    "decentralized-finance-defi": { id: "decentralized-finance-defi" as any, label: "DeFi Protocols", flag: "🏦", description: "Decentralized exchanges, lending, and yield platforms", tickers: [] },
    "artificial-intelligence": { id: "artificial-intelligence" as any, label: "AI & Compute", flag: "🤖", description: "Tokens powering artificial intelligence and decentralized compute", tickers: [] },
    "gaming": { id: "gaming" as any, label: "GameFi & Metaverse", flag: "🎮", description: "Gaming economies and virtual world assets", tickers: [] },
    "meme-token": { id: "meme-token" as any, label: "Memecoins", flag: "🐕", description: "High-risk, community and momentum-driven tokens", tickers: [] },
};
