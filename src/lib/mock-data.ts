// ============================================================
// Astro Trader Insights - Mock Data Generator
// ============================================================
// Generates realistic company data for UI development.

import type { Company, HistoricalDataPoint, MacroContext } from "./types";

function rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

function generateHistoricalData(months: number = 12): HistoricalDataPoint[] {
    const data: HistoricalDataPoint[] = [];
    const now = new Date();
    let price = rand(5, 80);

    for (let i = months; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        price = price * (1 + rand(-0.08, 0.10));

        data.push({
            date: date.toISOString().split("T")[0],
            price: Math.round(price * 100) / 100,
            ebitMargin: rand(0.02, 0.20),
            grossMargin: rand(0.20, 0.55),
            roe: rand(0.04, 0.25),
            roc: rand(0.03, 0.18),
            fcfYield: rand(0.01, 0.15),
        });
    }
    return data;
}

const COMPANY_TEMPLATES = [
    { name: "NovaTech Solutions", ticker: "NVTS", sector: "Technology", exchange: "NASDAQ", desc: "Cloud-native enterprise security platform for mid-market companies." },
    { name: "Alpine Materials", ticker: "ALPM", sector: "Materials", exchange: "NYSE", desc: "Specialty chemical compounds for EV battery manufacturers." },
    { name: "Meridian Health Systems", ticker: "MRDN", sector: "Healthcare", exchange: "NASDAQ", desc: "AI-powered diagnostic imaging for rural healthcare facilities." },
    { name: "Cascade Energy", ticker: "CSDE", sector: "Energy", exchange: "NYSE", desc: "Next-gen micro-grid solutions for commercial real estate." },
    { name: "Pinnacle Logistics", ticker: "PNCL", sector: "Industrials", exchange: "NYSE", desc: "Last-mile delivery optimization using autonomous drones." },
    { name: "Verdant AgriTech", ticker: "VRDT", sector: "Agriculture", exchange: "NASDAQ", desc: "Precision agriculture sensors and data analytics platform." },
    { name: "Cobalt Fintech", ticker: "CBLT", sector: "Financials", exchange: "NASDAQ", desc: "Embedded lending infrastructure for SaaS platforms." },
    { name: "Orion Semiconductors", ticker: "ORSM", sector: "Technology", exchange: "NASDAQ", desc: "Custom RISC-V chips for edge computing applications." },
    { name: "Beacon Therapeutics", ticker: "BCNT", sector: "Healthcare", exchange: "NASDAQ", desc: "Novel gene therapy treatments for rare pediatric diseases." },
    { name: "Redshift Digital", ticker: "RDSD", sector: "Technology", exchange: "NYSE", desc: "Enterprise content delivery and streaming optimization." },
    { name: "Ironclad Cybersec", ticker: "IRCS", sector: "Technology", exchange: "NASDAQ", desc: "Zero-trust network security for government contractors." },
    { name: "TerraVolt Power", ticker: "TVLT", sector: "Utilities", exchange: "NYSE", desc: "Distributed solar micro-grid installations." },
    { name: "Durable Brands", ticker: "DBRN", sector: "Consumer", exchange: "NYSE", desc: "Premium workwear and outdoor apparel direct-to-consumer." },
    { name: "Quantum Biomedical", ticker: "QBMD", sector: "Healthcare", exchange: "NASDAQ", desc: "Point-of-care blood testing with lab-grade accuracy." },
    { name: "StoneArch Realty", ticker: "STAR", sector: "Real Estate", exchange: "NYSE", desc: "Mixed-use developments in secondary metro markets." },
    { name: "Vulcan Data Corp", ticker: "VLCN", sector: "Technology", exchange: "NASDAQ", desc: "GPU-cluster-as-a-service for ML model training." },
    { name: "Magellan Transport", ticker: "MGLN", sector: "Industrials", exchange: "NYSE", desc: "Intermodal freight brokerage with proprietary routing AI." },
    { name: "Solaris Optics", ticker: "SLRS", sector: "Technology", exchange: "NASDAQ", desc: "LiDAR components for autonomous vehicle systems." },
    { name: "Crest Water Tech", ticker: "CWTR", sector: "Utilities", exchange: "NYSE", desc: "IoT-enabled water treatment and monitoring systems." },
    { name: "Apex Nutrition", ticker: "APXN", sector: "Consumer", exchange: "NASDAQ", desc: "Personalized vitamin packs with at-home biomarker kits." },
    { name: "Citadel Aerospace", ticker: "CTDL", sector: "Industrials", exchange: "NYSE", desc: "Sub-orbital payload delivery for satellite constellation deployment." },
    { name: "Lighthouse Insurance", ticker: "LHIS", sector: "Financials", exchange: "NYSE", desc: "Parametric insurance products for climate risk." },
    { name: "Ember Robotics", ticker: "EMBR", sector: "Industrials", exchange: "NASDAQ", desc: "Collaborative robots for warehouse automation." },
    { name: "Frost Mining Tech", ticker: "FRMT", sector: "Materials", exchange: "NYSE", desc: "Autonomous extraction systems for rare-earth minerals." },
    { name: "Nimbus Cloud Inc", ticker: "NMBS", sector: "Technology", exchange: "NASDAQ", desc: "Multi-cloud orchestration and cost-optimization platform." },
    { name: "Helix Genomics", ticker: "HLXG", sector: "Healthcare", exchange: "NASDAQ", desc: "Consumer pharmacogenomics testing and personalized drug selection." },
    { name: "Flux Payments", ticker: "FLXP", sector: "Financials", exchange: "NASDAQ", desc: "Real-time cross-border B2B payments using stablecoin rails." },
    { name: "Granite Construction Tech", ticker: "GRNT", sector: "Industrials", exchange: "NYSE", desc: "4D BIM software for large-scale civil engineering." },
    { name: "Nordic Sustainable Foods", ticker: "NSFD", sector: "Consumer", exchange: "NASDAQ", desc: "Cell-cultured seafood for European restaurant chains." },
    { name: "Zenith Defense Systems", ticker: "ZNTH", sector: "Industrials", exchange: "NYSE", desc: "Counter-UAS electronic warfare modules." },
    { name: "Polaris Education", ticker: "PLRS", sector: "Education", exchange: "NASDAQ", desc: "Adaptive learning platforms for K-12 STEM subjects." },
    { name: "Vector EV Components", ticker: "VEVC", sector: "Automotive", exchange: "NYSE", desc: "High-density silicon-carbide inverters for electric drivetrains." },
    { name: "Atlas Data Centers", ticker: "ATLS", sector: "Real Estate", exchange: "NYSE", desc: "Edge data center REITs in Tier-2 metro markets." },
    { name: "Catalyst Pharma", ticker: "CTLP", sector: "Healthcare", exchange: "NASDAQ", desc: "Inhaled biologics delivery platform for respiratory diseases." },
    { name: "Prism Media Labs", ticker: "PRML", sector: "Technology", exchange: "NASDAQ", desc: "AI-generated localized advertising for streaming platforms." },
    { name: "Bedrock Mining", ticker: "BDRK", sector: "Materials", exchange: "NYSE", desc: "Low-impact lithium extraction from geothermal brine." },
    { name: "Tide Maritime Tech", ticker: "TDMT", sector: "Industrials", exchange: "NYSE", desc: "Autonomous navigation systems for container vessels." },
    { name: "Oasis Water Solutions", ticker: "OASW", sector: "Utilities", exchange: "NYSE", desc: "Atmospheric water generation for arid agriculture." },
    { name: "SkyNet Satellite", ticker: "SKNT", sector: "Technology", exchange: "NASDAQ", desc: "Low-earth-orbit broadband for underserved markets." },
    { name: "Forge Industrial AI", ticker: "FRAI", sector: "Technology", exchange: "NYSE", desc: "Predictive maintenance platform for heavy manufacturing." },
    { name: "Crimson BioEnergy", ticker: "CRBE", sector: "Energy", exchange: "NASDAQ", desc: "Algae-based biofuel for marine shipping decarbonization." },
    { name: "Summit Cybernetics", ticker: "SMTC", sector: "Technology", exchange: "NASDAQ", desc: "Neuromorphic computing chips for real-time pattern recognition." },
    { name: "Pioneer AgTech", ticker: "PNAT", sector: "Agriculture", exchange: "NYSE", desc: "Vertical farming modules powered by recycled wastewater." },
    { name: "Echo Financial", ticker: "ECHF", sector: "Financials", exchange: "NASDAQ", desc: "API-first wealth management infrastructure for neobanks." },
    { name: "Stratos Aviation", ticker: "STVA", sector: "Industrials", exchange: "NYSE", desc: "Hydrogen fuel cell propulsion for regional aviation." },
    { name: "Cyan Therapeutics", ticker: "CYNT", sector: "Healthcare", exchange: "NASDAQ", desc: "Psilocybin-derived treatments for treatment-resistant depression." },
    { name: "Basalt Infrastructure", ticker: "BSLT", sector: "Industrials", exchange: "NYSE", desc: "Modular bridge systems for disaster-relief logistics." },
    { name: "Lumen Smart Glass", ticker: "LMSG", sector: "Materials", exchange: "NASDAQ", desc: "Electrochromic window films for commercial energy savings." },
    { name: "Nexus Supply Chain", ticker: "NXSC", sector: "Industrials", exchange: "NYSE", desc: "Blockchain-verified provenance tracking for food & pharma." },
    { name: "Quasar Space Mining", ticker: "QSRM", sector: "Materials", exchange: "NASDAQ", desc: "In-space resource utilization R&D for asteroid prospecting." },
];

function generateCompany(
    template: (typeof COMPANY_TEMPLATES)[number],
    index: number
): Company {
    const historical = generateHistoricalData(12);
    const lastPrice = historical[historical.length - 1].price;
    const prices = historical.map((h) => h.price);
    const low = Math.min(...prices);
    const high = Math.max(...prices);

    // Vary metrics to produce interesting distribution
    const isValuePlay = index % 3 === 0;
    const isGrowthy = index % 5 === 0;

    const marketCap = isValuePlay
        ? rand(100, 600)
        : isGrowthy
            ? rand(800, 3500)
            : rand(150, 2000);

    const equity = index % 7 === 0 ? rand(-50, 10) : rand(20, 500);
    const operatingProfit = index % 9 === 0 ? rand(-20, 5) : rand(5, 120);

    return {
        id: `company_${index}`,
        ticker: template.ticker,
        name: template.name,
        sector: template.sector,
        exchange: template.exchange,
        description: template.desc,
        historicalData: historical,
        metrics: {
            marketCap,
            totalEquity: equity,
            operatingProfit,
            fcfYield: isValuePlay ? rand(0.04, 0.14) : rand(0.01, 0.08),
            bookToMarket: isValuePlay ? rand(0.35, 0.95) : rand(0.10, 0.50),
            ebitMargin: rand(0.02, 0.22),
            grossMargin: rand(0.20, 0.55),
            roe: rand(0.04, 0.25),
            roc: rand(0.03, 0.18),
            ebitMarginDelta: rand(-0.04, 0.06),
            grossMarginDelta: rand(-0.03, 0.05),
            roeDelta: rand(-0.03, 0.05),
            rocDelta: rand(-0.02, 0.04),
            assetGrowth: rand(-0.02, 0.15),
            ebitdaGrowth: rand(-0.05, 0.20),
            currentPrice: lastPrice,
            fiftyTwoWeekLow: low,
            fiftyTwoWeekHigh: high,
            oneMonthReturn: rand(-0.12, 0.15),
            threeMonthReturn: rand(-0.20, 0.25),
            sixMonthReturn: rand(-0.30, 0.40),
        },
    };
}

/** Generate the full mock dataset (deterministic seed not needed for demo) */
export function generateMockCompanies(): Company[] {
    return COMPANY_TEMPLATES.map((t, i) => generateCompany(t, i));
}

/** Default macro context for demo */
export function getDefaultMacroContext(): MacroContext {
    return {
        interestRateTrend: "stable",
        currentRate: 4.75,
    };
}
