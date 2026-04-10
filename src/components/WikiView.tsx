// ============================================================
// WikiView - Educational section with two main pillars:
// 1. Macro Hub (esoteric/astrological analysis)
// 2. Search Algorithm (fundamental metrics-based scoring)
// ============================================================

"use client";

import React, { useState } from "react";
import {
    BookOpen,
    Target,
    TrendingUp,
    Globe,
    BarChart3,
    Timer,
    Shield,
    ChevronDown,
    ChevronRight,
    Layers,
    Moon,
    RotateCcw,
    FlaskConical,
    Activity,
    ArrowRight,
    ArrowLeft,
    Sigma,
    Sun,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// ── Types ────────────────────────────────────────────────────

interface WikiSection {
    id: string;
    icon: typeof Target;
    title: string;
    color: string;
    items: WikiItem[];
}

interface WikiItem {
    term: string;
    definition: string;
    formula?: string;
    interpretation?: string;
}

// ── Pillar Definitions ───────────────────────────────────────

type WikiPillar = "landing" | "macro" | "algorithm";

const MACRO_SECTIONS: WikiSection[] = [
    {
        id: "macro_overview",
        icon: Target,
        title: "Cosmic Fluidity Score (Overview)",
        color: "#7c3aed",
        items: [
            {
                term: "What is the Cosmic Fluidity Score?",
                definition: "A composite indicator (0-100) that aggregates three independent astrological signals — Astro Turbulence (40%), Lunar Phase (35%), and Mercury Status (25%) — into a single real-time reading of market 'cosmic conditions.'",
                interpretation: "Score ≥ 80 = Peak Fluidity (historically favorable). 60-80 = Favorable. 40-60 = Neutral. 20-40 = Cautious. < 20 = High Risk. Think of it as a 'weather report' for markets, not a crystal ball.",
            },
            {
                term: "How are weights determined?",
                definition: "Turbulence gets 40% because it captures slow-moving planetary cycles that correlate with macro economic cycles. Lunar gets 35% due to the robust Dichev & Janes (2001) academic evidence. Mercury gets 25% as the weakest but most popular esoteric signal.",
                interpretation: "The weights reflect each signal's backtested contribution. You can verify this in the Backtesting Engine — turbulence alone outperforms the combined strategy.",
            },
        ],
    },
    {
        id: "macro_turbulence",
        icon: Activity,
        title: "Astrological Turbulence Index",
        color: "var(--accent-amber)",
        items: [
            {
                term: "What is the Turbulence Index?",
                definition: "A composite score (0-100) mapping slow-moving planetary cycles (Saturn, Uranus, Neptune, Pluto conjunctions and oppositions) to historical geopolitical and market volatility periods.",
                interpretation: "This is NOT a prediction — it's a 'macro weather forecast.' Readings above 70 correlate with historically turbulent periods (wars, crises). Below 30 = historically calm growth phases.",
            },
            {
                term: "Tension Peaks",
                definition: "Planetary alignments associated with increased geopolitical stress: Saturn-Pluto conjunctions (2020, 2053), Uranus-Neptune-Pluto hard aspects, etc.",
                formula: "Impact = Gaussian(daysSincePeak, intensity, spreadDays)",
                interpretation: "Each peak radiates influence over its spread window. Multiple overlapping peaks create extreme readings (e.g., 2008 = Saturn-Uranus opposition + Pluto ingress).",
            },
            {
                term: "Fluidity Peaks (Negative Tension)",
                definition: "Alignments associated with innovation and liquidity expansion: Jupiter-Saturn conjunctions (Air Era 2020), Uranus-Pluto trines, Neptune sextiles.",
                interpretation: "These LOWER the turbulence index, creating windows of opportunity. The 2020 Air Era conjunction is one of the strongest fluidity signals in 800 years.",
            },
            {
                term: "Geopolitical Overlay",
                definition: "Historical events (Financial Crises, Wars, Tech Booms, Policy Shifts) plotted on the turbulence chart.",
                interpretation: "The overlay lets you visually verify whether turbulence peaks align with real geopolitical disruptions. Toggle each category on/off to isolate patterns.",
            },
        ],
    },
    {
        id: "turbulence_methodology",
        icon: Sigma,
        title: "Turbulence Engine — Methodology",
        color: "#f59e0b",
        items: [
            {
                term: "Core Formula",
                definition: "Every transit's intensity is computed as: Intensity = AspectWeight × PairWeight × 100. No manual calibration — the same type of aspect ALWAYS produces the same intensity regardless of which historical period it falls in.",
                formula: "intensity = ASPECT_WEIGHT[type] × PAIR_WEIGHT[pair] × 100",
                interpretation: "This eliminates hindsight bias. A Saturn-Uranus Square always has intensity 72 — whether it occurred in 2000, 2022, or will occur in 2043.",
            },
            {
                term: "Aspect Type Weights",
                definition: "Based on classical astrological hierarchy of angular relationships: ◆ Conjunction (0°) = 1.00 — maximum power, planets merge energies. ◆ Opposition (180°) = 0.90 — full polarity tension. ◆ Square (90°) = 0.80 — friction and conflict. ◆ Trine (120°) = 0.65 — harmony and flow. ◆ Sextile (60°) = 0.50 — cooperation and opportunity.",
                interpretation: "These weights follow millennia of astrological tradition. Conjunction is the strongest because both planets occupy the same degree. Trine and Sextile are 'soft' aspects that reduce turbulence.",
            },
            {
                term: "Planetary Pair Weights",
                definition: "Slower outer planets produce more powerful effects: ◆ Saturn-Pluto = 1.00 (structure vs. transformation). ◆ Uranus-Pluto = 0.95 (disruption vs. transformation). ◆ Saturn-Uranus = 0.90 (old vs. new paradigm). ◆ Saturn-Neptune = 0.85 (reality vs. illusion). ◆ Jupiter-Pluto = 0.70 (expansion meets power). ◆ Jupiter-Saturn = 0.70 (growth meets structure). ◆ Jupiter-Uranus = 0.65 (expansion meets innovation). ◆ Jupiter-Neptune = 0.60 (expansion meets dreams).",
                interpretation: "The weight reflects each planet's orbital period and historical macro impact. Pluto (248-year orbit) produces civilization-level shifts. Jupiter (12-year orbit) produces business-cycle effects.",
            },
            {
                term: "Orbital Spread (Days in Orb)",
                definition: "The Gaussian bell curve 'width' is determined by how long each aspect stays within 5° orb, based on the slower planet's orbital speed: ◆ Uranus-Pluto = 500 days (both extremely slow). ◆ Saturn-Pluto = 400 days. ◆ Saturn-Neptune = 380 days. ◆ Saturn-Uranus = 350 days. ◆ Jupiter-Pluto = 250 days. ◆ Jupiter-Saturn = 200 days. ◆ Jupiter-Uranus = 180 days.",
                interpretation: "This models the real astrological concept of 'applying' and 'separating' orbs. The influence builds gradually, peaks at exactitude, and fades as planets separate — forming the Gaussian arcs you see in the chart.",
            },
            {
                term: "Complete Transit Registry (Computed Values)",
                definition: "Tension transits: ◆ Saturn-Uranus Sq (2000, 2022) → Intensity: 72, Spread: 350d. ◆ Saturn-Pluto Opp (2001) → Intensity: 90, Spread: 400d. ◆ Saturn-Uranus Opp (2008) → Intensity: 81, Spread: 350d. ◆ Saturn-Pluto Sq (2010, 2029) → Intensity: 80, Spread: 400d. ◆ Uranus-Pluto Sq (2014) → Intensity: 76, Spread: 500d. ◆ Saturn-Pluto Conj (2020) → Intensity: 100, Spread: 400d. ◆ Saturn-Neptune Conj (2026) → Intensity: 85, Spread: 380d. ◆ Saturn-Uranus Conj (2032) → Intensity: 90, Spread: 350d.",
                formula: "Example: Saturn-Pluto Conj = 1.00 (Conj) × 1.00 (Sat-Plu) × 100 = 100",
                interpretation: "Fluidity transits: ◆ Jupiter-Uranus Trine (2004) → -42. ◆ Jupiter-Pluto Trine (2007) → -46. ◆ Jupiter-Saturn Trine (2013) → -46. ◆ Jupiter-Pluto Sextile (2018) → -35. ◆ Jupiter-Saturn Conj Air (2021) → -70. ◆ Jupiter-Uranus Conj (2024) → -65. ◆ Uranus-Pluto Trine Air (2027) → -62.",
            },
            {
                term: "Gaussian Model",
                definition: "Each transit emits a bell curve of influence: impact(t) = intensity × e^(−d²/2σ²), where d = days from peak date and σ = spreadDays. The total turbulence at any point is the sum of all active Gaussians plus a baseline of 45 and ±2 points of deterministic cosmic noise.",
                formula: "turbulence(t) = 45 + Σ gaussian(t, peak_i) + noise(t), clamped [0, 100]",
                interpretation: "The baseline of 45 represents 'slightly cautious neutral.' When no transits are nearby, the index hovers around 43-47. Tension pushes it toward 100; fluidity drags it toward 0.",
            },
        ],
    },
    {
        id: "lunar_cycles",
        icon: Moon,
        title: "Lunar Cycle Analysis (Dichev & Janes)",
        color: "#a855f7",
        items: [
            {
                term: "The Lunar Effect Hypothesis",
                definition: "Academic research (Dichev & Janes, 2001; Yuan, Zheng & Zhu, 2006) found that stock returns in the 15 days around new moons are statistically higher than around full moons across 25+ years and 48 countries.",
                interpretation: "The annualized difference is 3-5%. The hypothesis is NOT gravitational — it's behavioral: collective mood shifts may affect aggregate risk appetite.",
            },
            {
                term: "Daily Regime Classification",
                definition: "Each trading day is classified as 'New Moon Half' (phase 0.75-0.25) or 'Full Moon Half' (phase 0.25-0.75). Daily returns are computed and aggregated by regime.",
                formula: "Phase = (daysSinceReference / 29.53) mod 1 → 0=🌑, 0.5=🌕",
                interpretation: "With 6,600+ S&P 500 trading days analyzed, we find a ~6.9% annualized yield gap favoring the New Moon Half. Bitcoin shows an even larger ~19.8% gap.",
            },
            {
                term: "How to Use It",
                definition: "Concentrate purchases near new moons. If doing monthly DCA, schedule it near the new moon. Use as a confirmation filter alongside fundamental analysis.",
                interpretation: "Don't trade based on this alone. Use it as a timing overlay: if your analysis says 'buy' AND it's new moon half → higher conviction.",
            },
        ],
    },
    {
        id: "mercury_retrograde",
        icon: RotateCcw,
        title: "Mercury Retrograde Monitor",
        color: "#ef4444",
        items: [
            {
                term: "What is Mercury Retrograde?",
                definition: "An optical illusion occurring 3-4 times per year for ~3 weeks when Mercury appears to move backward. In astrology, it governs communication, contracts, and technology.",
                interpretation: "Markets may experience: unexpected earnings revisions, failed M&A deals, tech outages. Our daily analysis shows S&P 500 loses ~8%/year during retrograde vs gains ~10%/year during direct periods.",
            },
            {
                term: "Daily Return Analysis",
                definition: "We classify every trading day as Retrograde or Direct using astronomically precise windows (2000-2030) and compute daily returns by regime.",
                interpretation: "With ~1,300 retrograde days and ~5,300 direct days for S&P 500, the sample is large enough for statistical significance. Retrograde shows negative annualized returns across multiple assets.",
            },
            {
                term: "How to Use It",
                definition: "Consider reducing position sizes before Mercury retrograde begins. Avoid initiating major trades or signing contracts during these windows.",
                interpretation: "Even if average returns are similar in some periods, higher σ (volatility) during retrograde means more unpredictable outcomes — higher risk per unit of return.",
            },
        ],
    },
    {
        id: "solar_activity",
        icon: Sun,
        title: "Solar Activity (Sunspot Cycles)",
        color: "#f59e0b",
        items: [
            {
                term: "What is the Sunspot Number (SSN)?",
                definition: "The International Sunspot Number is a daily measure of solar magnetic activity published by SILSO (Royal Observatory of Belgium). It follows an ~11-year cycle, ranging from 0 at solar minimum to 150-250+ at solar maximum.",
                interpretation: "The solar cycle is one of the most predictable natural phenomena. We currently track Solar Cycles 23 (peak 2000), 24 (peak 2014), and 25 (peak 2024). Each cycle takes ~11 years from minimum to minimum.",
            },
            {
                term: "The Solar-Market Hypothesis",
                definition: "W. Stanley Jevons (1878) first proposed sunspot-economic links. Modern research by Krivelyova & Robotti (2003) found that geomagnetic storms — triggered by solar flares — correlate with lower stock returns in the following days.",
                interpretation: "The proposed mechanism: Solar activity → geomagnetic disturbances → disruption of melatonin/serotonin cycles in humans → altered risk-taking behavior in traders. This is a neuro-behavioral, not mystical, hypothesis.",
            },
            {
                term: "Solar Cycle Phases",
                definition: "We classify each trading day into three regimes based on monthly SSN: ◆ Solar Minimum (SSN < 40) — historically calm markets with strong returns. ◆ Moderate (SSN 40-120) — normal conditions. ◆ Solar Maximum (SSN > 120) — historically more volatile periods.",
                interpretation: "The ~11-year cycle means regime transitions happen slowly. This signal is best used for long-term portfolio positioning (years, not days), making it complementary to faster signals like Mercury or Lunar cycles.",
            },
            {
                term: "How to Use It",
                definition: "During solar maximum phases, consider: reducing position sizes, tightening stop losses, and favoring defensive sectors. During solar minimum, markets historically favor risk-on positioning.",
                interpretation: "Use the Solar Activity Monitor to see the current SSN reading and cycle phase. Like all macro signals, this should be one input among many — not a standalone trading strategy.",
            },
        ],
    },
    {
        id: "backtesting",
        icon: FlaskConical,
        title: "Backtesting Engine",
        color: "#a855f7",
        items: [
            {
                term: "What Does the Backtester Do?",
                definition: "Simulates historical performance of astro-filtered strategies against Buy & Hold using $10,000 initial investment. Tests 4 real assets: S&P 500, Bitcoin, Gold (GLD), and Nasdaq (QQQ) with daily Yahoo Finance data.",
                interpretation: "The backtester reveals that turbulence-only filtering is the strongest single signal. Adding lunar + mercury creates noise that partially negates the benefit.",
            },
            {
                term: "Signal Hierarchy",
                definition: "Turbulence Alone > Turbulence + Mercury > Turbulence + All Three > Turbulence + Lunar. The lunar filter forces market re-entry during new moons, even when turbulence says 'exit.'",
                interpretation: "Each signal works better independently (via its own module) than as a combined filter. The Cosmic Fluidity Score aggregates them for reading, not for active trading.",
            },
            {
                term: "Key Metrics",
                definition: "Total Return (cumulative %), CAGR (annualized compound return), Max Drawdown (worst peak-to-trough decline), and Win Rate (% of months outperforming B&H).",
                interpretation: "Even if total return is lower, a significantly reduced max drawdown means the strategy protected capital during crashes — often more valuable than raw returns.",
            },
        ],
    },
];

const ALGORITHM_SECTIONS: WikiSection[] = [
    {
        id: "tiers",
        icon: Layers,
        title: "Market Cap Tiers",
        color: "var(--accent-violet)",
        items: [
            {
                term: "Large-Cap (> $50B)",
                definition: "Established industry leaders with stable cash flows. Examples: AAPL, MSFT, GOOGL.",
                interpretation: "The algorithm applies RELAXED hard filters: negative equity is allowed (common from buybacks), and FCF yield thresholds are lower since these companies trade at premium valuations.",
            },
            {
                term: "Mid-Cap ($2B – $50B)",
                definition: "Growing companies with proven business models but still scaling. Examples: CROX, DDOG, AXON.",
                interpretation: "MODERATE filters: negative equity is allowed only if FCF is positive. FCF yield and Book-to-Market thresholds are intermediate.",
            },
            {
                term: "Small-Cap (< $2B)",
                definition: "Early-stage or niche companies with higher volatility. Classic value investing territory for 'hidden gems.'",
                interpretation: "STRICT filters: requires positive equity AND positive operating profit. FCF Yield and B/M thresholds are highest — strong fundamentals required to offset risk.",
            },
        ],
    },
    {
        id: "score",
        icon: Target,
        title: "Score Breakdown (Company Card)",
        color: "var(--accent-cyan)",
        items: [
            {
                term: "Total Score (0-100)",
                definition: "Composite algorithmic score: Valuation (40%) + Trend (30%) + Timing (20%) + Macro (10%).",
                interpretation: "≥ 75 = STRONG BUY (green) · 55-74 = BUY (blue) · 35-54 = HOLD (amber) · < 35 = AVOID (red).",
            },
            {
                term: "Recommendation Badge",
                definition: "A color-coded label derived from the Total Score after applying hard filter checks.",
                interpretation: "Even a high-scoring company gets 'AVOID' if it fails hard filters (like negative equity for small-caps).",
            },
        ],
    },
    {
        id: "valuation",
        icon: BarChart3,
        title: "1 · Valuation (40% weight)",
        color: "var(--accent-emerald)",
        items: [
            {
                term: "FCF Yield (Free Cash Flow Yield)",
                definition: "How much free cash a company generates relative to its stock price.",
                formula: "FCF Yield = Free Cash Flow / Market Cap",
                interpretation: "Higher is better. Think of it as the 'interest rate' your investment earns in real cash. For Small-Caps, ≥5%; for Large-Caps, ≥2% is already good.",
            },
            {
                term: "Book-to-Market (B/M)",
                definition: "The ratio of a company's book value (assets minus liabilities) to its market price.",
                formula: "B/M = Total Equity / Market Cap",
                interpretation: "Higher means 'cheaper.' A B/M > 1.0 means the market values the company below its book value — potentially a bargain.",
            },
        ],
    },
    {
        id: "trend",
        icon: TrendingUp,
        title: "2 · Trend & Quality (30% weight)",
        color: "var(--accent-cyan)",
        items: [
            { term: "EBIT Margin Delta", definition: "Year-over-year change in operating margin. Measures improving or declining efficiency.", interpretation: "Positive delta = company getting more profitable. Negative = margins shrinking." },
            { term: "Gross Margin Delta", definition: "Year-over-year change in gross margin. Reflects pricing power.", interpretation: "Expanding gross margins signal competitive advantage or pricing power." },
            { term: "ROE Delta", definition: "Change in Return on Equity — effectiveness of shareholder capital use.", formula: "ROE = Net Income / Shareholders' Equity", interpretation: "Rising ROE suggests improving capital efficiency. ROE >15% is generally good." },
            { term: "ROC Delta", definition: "Change in Return on Capital — includes debt in the equation.", formula: "ROC = EBIT / (Total Equity + Total Debt)", interpretation: "Rising ROC means more earnings per dollar invested, including borrowed money." },
            { term: "Reinvestment Efficiency", definition: "Compares EBITDA growth vs asset growth. Are new investments producing proportional earnings?", interpretation: "EBITDA growing faster than assets → company deploying capital efficiently." },
        ],
    },
    {
        id: "timing",
        icon: Timer,
        title: "3 · Timing (20% weight)",
        color: "var(--accent-amber)",
        items: [
            { term: "52-Week Low Proximity", definition: "How close the current price is to its 52-week low.", interpretation: "The algorithm rewards buying near the bottom. Near 52-week low gets up to 40 points." },
            { term: "1-Month Return", definition: "Percentage price change over the last month.", interpretation: "Slightly positive (0-10%) gets full points — signals early recovery momentum." },
            { term: "6-Month Return", definition: "Price change over 6 months. Used as a mean-reversion signal.", interpretation: "Negative returns (> -10%) score highest — bets on recovery. High gains (>40%) penalized." },
        ],
    },
    {
        id: "macro_adj",
        icon: Globe,
        title: "4 · Macro Adjustment (10% weight)",
        color: "var(--text-secondary)",
        items: [
            {
                term: "Interest Rate Trend",
                definition: "A multiplier applied to the score based on the direction of interest rates.",
                interpretation: "Falling rates (×1.0) = favorable. Stable (×0.95) = neutral. Rising (×0.85) = penalty since higher rates make bonds more attractive.",
            },
        ],
    },
    {
        id: "tokenomics",
        icon: Target,
        title: "Crypto: Tokenomics (50% weight)",
        color: "var(--accent-orange, #f59e0b)",
        items: [
            { term: "Supply Diluted", definition: "Percentage of total possible supply currently circulating.", formula: "Dilution = Circulating Supply / Max Supply", interpretation: "100% circulating (like Bitcoin) = max points. Low circulating = future dump risk." },
            { term: "Liquidity Ratio", definition: "Measures real market interest relative to total valuation.", formula: "Ratio = 24h Volume / Market Cap", interpretation: "High (>10%) = liquid and active. Very low (<2%) = possible ghost-chain or manipulation." },
        ],
    },
    {
        id: "crypto_momentum",
        icon: TrendingUp,
        title: "Crypto: Momentum (50% weight)",
        color: "var(--accent-emerald)",
        items: [
            { term: "Distance to ATH", definition: "How far the current price is from its all-time high.", interpretation: "Rewards buying during deep drawdowns (e.g., -70% from ATH)." },
            { term: "Distance from ATL", definition: "How far from the absolute bottom.", interpretation: "Assets at new all-time lows are penalized as potential falling knives." },
            { term: "Short-Term Momentum", definition: "24H/7D price action for immediate trend direction.", interpretation: "Rewards early reversal signs. Penalizes euphoric pumps (>50%/day)." },
        ],
    },
    {
        id: "hardfilters",
        icon: Shield,
        title: "5 · Hard Filters",
        color: "var(--signal-avoid)",
        items: [
            { term: "What are hard filters?", definition: "Mandatory checks that MUST pass. If a company fails ANY, it's automatically 'AVOID' regardless of score.", interpretation: "Hard filters act as safety gates before any recommendation." },
            { term: "Total Equity", definition: "Must be > 0 for Small/Mid-Cap. Large-Caps exempt if FCF is positive.", interpretation: "Exception: Large-Caps with negative equity from buybacks (like AAPL) are allowed." },
            { term: "Operating Profit", definition: "Must be positive. For Large-Caps, only triggers AVOID if FCF is also negative.", interpretation: "A company that can't make money from operations is inherently risky." },
            { term: "Market Cap Ceiling", definition: "Controlled by the slider. Companies above the value are filtered out.", interpretation: "Useful for focusing on specific market cap segments." },
        ],
    },
];

// ── Component ────────────────────────────────────────────────

export default function WikiView() {
    const [activePillar, setActivePillar] = useState<WikiPillar>("landing");
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["macro_overview"]));

    const toggleSection = (id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const sections = activePillar === "macro" ? MACRO_SECTIONS : ALGORITHM_SECTIONS;

    const renderSections = () => (
        <div className="max-w-3xl space-y-3">
            {/* Back button */}
            <button
                onClick={() => setActivePillar("landing")}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4 cursor-pointer"
            >
                <ArrowLeft size={14} />
                <span>Back to Wiki</span>
            </button>

            {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const Icon = section.icon;
                return (
                    <div key={section.id} className="glass-card overflow-hidden">
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02] cursor-pointer"
                        >
                            <Icon size={18} style={{ color: section.color }} />
                            <span className="text-sm font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
                                {section.title}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                                {section.items.length}
                            </span>
                            {isExpanded ? <ChevronDown size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />}
                        </button>
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                    <div className="px-5 pb-4 space-y-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                        {section.items.map((item, idx) => (
                                            <div key={idx} className="pt-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: section.color }}>{item.term}</h4>
                                                <p className="text-xs leading-relaxed mb-1" style={{ color: "var(--text-secondary)" }}>{item.definition}</p>
                                                {item.formula && (
                                                    <div className="inline-block font-mono text-[11px] px-3 py-1 rounded mb-1" style={{ background: "var(--bg-tertiary)", color: "var(--accent-cyan)", border: "1px solid var(--border-subtle)" }}>
                                                        {item.formula}
                                                    </div>
                                                )}
                                                {item.interpretation && (
                                                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>💡 {item.interpretation}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );

    const renderLanding = () => (
        <div className="max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Macro Hub Pillar */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01, y: -3 }}
                    onClick={() => { setActivePillar("macro"); setExpandedSections(new Set(["macro_overview"])); }}
                    className="glass-card p-6 border border-purple-500/10 bg-purple-500/[0.02] text-left group cursor-pointer transition-all hover:border-purple-500/20"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}>
                            <Globe size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-zinc-100">Macro Hub</h2>
                            <p className="text-[10px] text-zinc-500">Esoteric & Astrological Analysis</p>
                        </div>
                        <ArrowRight size={16} className="text-zinc-600 group-hover:text-purple-400 ml-auto transition-colors" />
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                        Documentation for the Cosmic Fluidity Score, Astro Turbulence Index, Lunar Cycle analysis (Dichev & Janes methodology), Mercury Retrograde Monitor, and the Backtesting Engine.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {["Fluidity Score", "Turbulence", "Lunar", "Mercury", "Backtester"].map((tag) => (
                            <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">{tag}</span>
                        ))}
                    </div>
                </motion.button>

                {/* Algorithm Pillar */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.01, y: -3 }}
                    onClick={() => { setActivePillar("algorithm"); setExpandedSections(new Set(["tiers"])); }}
                    className="glass-card p-6 border border-emerald-500/10 bg-emerald-500/[0.02] text-left group cursor-pointer transition-all hover:border-emerald-500/20"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}>
                            <Target size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-zinc-100">Search Algorithm</h2>
                            <p className="text-[10px] text-zinc-500">Fundamental Scoring System</p>
                        </div>
                        <ArrowRight size={16} className="text-zinc-600 group-hover:text-emerald-400 ml-auto transition-colors" />
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                        How the algorithmic scoring engine works: Valuation (40%), Trend & Quality (30%), Timing (20%), Macro adjustment (10%), hard filters, and crypto-specific tokenomics metrics.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {["FCF Yield", "B/M Ratio", "Momentum", "Hard Filters", "Crypto"].map((tag) => (
                            <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{tag}</span>
                        ))}
                    </div>
                </motion.button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-6" style={{ marginLeft: 72 }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent-amber), var(--accent-emerald))" }}>
                    <BookOpen size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                        Wiki — Knowledge Base
                    </h1>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {activePillar === "landing" ? "Choose a documentation area to explore" :
                            activePillar === "macro" ? "Esoteric & astrological analysis documentation" :
                                "Fundamental scoring algorithm documentation"}
                    </p>
                </div>
            </div>

            {/* Content */}
            {activePillar === "landing" ? renderLanding() : renderSections()}
        </div>
    );
}
