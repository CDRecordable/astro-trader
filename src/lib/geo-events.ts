// ============================================================
// Geopolitical Events Database
// ============================================================
// A registry of major macro events mapped to their approximate astrological signatures.

export type EventCategory = "crisis" | "war" | "tech_boom" | "policy";

export interface GeoEvent {
    id: string;
    date: string; // YYYY-MM-DD
    title: string;
    description: string;
    category: EventCategory;
    astrologicalSignatures?: string[];
}

export const GEO_EVENTS: GeoEvent[] = [
    {
        id: "dotcom_crash",
        date: "2000-03-10",
        title: "Dot-Com Bubble Burst",
        description: "The peak and subsequent collapse of extreme speculation in internet-based businesses.",
        category: "crisis",
        astrologicalSignatures: ["Saturn-Uranus Square"],
    },
    {
        id: "sept_11",
        date: "2001-09-11",
        title: "September 11 Attacks",
        description: "Global geopolitical shock leading to massive market sell-offs.",
        category: "war",
        astrologicalSignatures: ["Saturn-Pluto Opposition"],
    },
    {
        id: "afghan_war",
        date: "2001-10-07",
        title: "War in Afghanistan",
        description: "US-led invasion begins the prolonged global War on Terror.",
        category: "war",
        astrologicalSignatures: ["Saturn-Pluto Opposition"],
    },
    {
        id: "iraq_war",
        date: "2003-03-20",
        title: "Invasion of Iraq",
        description: "US-led coalition invades Iraq, spiking global oil volatility.",
        category: "war",
        astrologicalSignatures: ["Saturn-Pluto Trine"],
    },
    {
        id: "lehman_collapse",
        date: "2008-09-15",
        title: "Lehman Brothers Collapse",
        description: "The climax of the subprime mortgage crisis, triggering the Great Recession.",
        category: "crisis",
        astrologicalSignatures: ["Saturn-Uranus Opposition", "Pluto enters Capricorn"],
    },
    {
        id: "eu_debt_crisis",
        date: "2010-05-02",
        title: "European Debt Crisis",
        description: "Bailout of Greece triggering fears of sovereign debt contagion across the Eurozone.",
        category: "crisis",
        astrologicalSignatures: ["Jupiter-Uranus Conjunction", "Saturn-Pluto Square"],
    },
    {
        id: "arab_spring_syria",
        date: "2011-03-15",
        title: "Arab Spring & Syrian War",
        description: "Widespread uprisings across the Middle East escalating into prolonged civil war.",
        category: "war",
        astrologicalSignatures: ["Uranus enters Aries"],
    },
    {
        id: "taper_tantrum",
        date: "2013-05-22",
        title: "Taper Tantrum",
        description: "Market panic triggered by the US Federal Reserve announcing the reduction of quantitative easing.",
        category: "policy",
        astrologicalSignatures: ["Uranus-Pluto Square"],
    },
    {
        id: "brexit_vote",
        date: "2016-06-23",
        title: "Brexit Referendum",
        description: "The UK votes to leave the European Union, causing extreme volatility in the Sterling and global markets.",
        category: "policy",
        astrologicalSignatures: ["Saturn-Neptune Square"],
    },
    {
        id: "covid_crash",
        date: "2020-03-09",
        title: "COVID-19 Market Crash",
        description: "Global pandemic shutdowns trigger the fastest, deepest market crash in modern history.",
        category: "crisis",
        astrologicalSignatures: ["Saturn-Pluto Conjunction in Capricorn"],
    },
    {
        id: "fed_rate_hike_cycle",
        date: "2022-03-16",
        title: "Aggressive Fed Hiking",
        description: "Central banks begin aggressively raising interest rates to combat sticky global inflation.",
        category: "policy",
        astrologicalSignatures: ["Saturn-Uranus Square"],
    },
    {
        id: "ukraine_war",
        date: "2022-02-24",
        title: "Invasion of Ukraine",
        description: "Major geopolitical conflict shocking global energy and commodities markets.",
        category: "war",
        astrologicalSignatures: ["US Pluto Return", "Saturn-Uranus Square"],
    },
    {
        id: "israel_hamas_war",
        date: "2023-10-07",
        title: "Israel-Hamas War",
        description: "Sudden escalation in the Middle East threatening regional stability and supply chains.",
        category: "war",
        astrologicalSignatures: ["Pluto stations Direct in Capricorn (Square Nodes)"],
    },
    {
        id: "ai_boom",
        date: "2023-01-15",
        title: "The Generative AI Boom",
        description: "Explosive capital rotation into artificial intelligence following the release of ChatGPT.",
        category: "tech_boom",
        astrologicalSignatures: ["Pluto enters Aquarius (Preview)"],
    },
    {
        id: "spot_etf_approval",
        date: "2024-01-10",
        title: "Bitcoin Spot ETFs Approved",
        description: "Institutionalization of digital assets triggers a massive influx of Wall Street capital.",
        category: "policy",
        astrologicalSignatures: ["Jupiter-Uranus Conjunction (Approaching)"],
    }
];
