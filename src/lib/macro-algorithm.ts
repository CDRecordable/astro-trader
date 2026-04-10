// ============================================================
// Astrological Macro Turbulence Engine
// ============================================================
// Generates a historical timeline of astrological tension and fluidity using Gaussian functions
// mapped over known major astrological transit dates, without requiring an external Ephemeris API.

export interface MacroDataPoint {
    date: string;               // YYYY-MM-DD
    timestamp: number;
    turbulenceIndex: number;    // 0 = Peak Fluidity/Risk-On, 100 = Peak Tension/Risk-Off
    sp500Price: number;         // Mock S&P 500 equivalent price tracking
    btcPrice?: number;          // Mock Asset comparative price tracking
    activeTransits: string[];
}

// ── Astrological Intensity Formula ──────────────────────────────
// Intensity = aspectWeight × pairWeight × 100 (pure astrological rules)
// Spread = based on orbital mechanics of the slowest planet in the pair

/** Aspect type weights (classical hierarchy) */
const ASPECT_WEIGHT: Record<string, number> = {
    "Conj": 1.00,    // Conjunction — maximum power
    "Opp": 0.90,    // Opposition — full tension polarity
    "Sq": 0.80,    // Square — conflict/friction
    "Trine": 0.65,   // Trine — harmony/flow
    "Sextile": 0.50, // Sextile — cooperation/opportunity
};

/** Planetary pair weights (slower outer planets = more powerful) */
const PAIR_WEIGHT: Record<string, number> = {
    "Saturn-Pluto": 1.00, // Most potent: structure vs transformation
    "Uranus-Pluto": 0.95, // Generational: disruption vs transformation
    "Saturn-Uranus": 0.90, // Old vs new paradigm
    "Saturn-Neptune": 0.85, // Reality vs illusion
    "Jupiter-Pluto": 0.70, // Expansion meets transformation
    "Jupiter-Saturn": 0.70, // Growth meets structure
    "Jupiter-Uranus": 0.65, // Expansion meets innovation
    "Jupiter-Neptune": 0.60, // Expansion meets dreams
};

/** Orbital-speed-based spread (days in orb ≈ 5°), determined by the slower planet */
const PAIR_SPREAD: Record<string, number> = {
    "Saturn-Pluto": 400,  // Pluto ~30 years/sign → very slow separation
    "Uranus-Pluto": 500,  // Both very slow → longest orb duration
    "Saturn-Uranus": 350,  // Uranus ~7 years/sign
    "Saturn-Neptune": 380, // Neptune ~14 years/sign
    "Jupiter-Pluto": 250,  // Jupiter faster → shorter orb
    "Jupiter-Saturn": 200, // Both relatively faster
    "Jupiter-Uranus": 180, // Jupiter is the fast mover
    "Jupiter-Neptune": 200,
};

/** Helper: compute intensity from aspect type and planet pair */
function computeIntensity(pair: string, aspect: string): number {
    const aw = ASPECT_WEIGHT[aspect] ?? 0.70;
    const pw = PAIR_WEIGHT[pair] ?? 0.70;
    return Math.round(aw * pw * 100);
}

/** Helper: get spread from planet pair */
function computeSpread(pair: string): number {
    return PAIR_SPREAD[pair] ?? 300;
}

// Key Heavy Aspects (Tension = +Turbulence)
// Intensity and spread are COMPUTED, not manually tuned
const TENSION_PEAKS = [
    { date: "2000-03-15", intensity: computeIntensity("Saturn-Uranus", "Sq"), spreadDays: computeSpread("Saturn-Uranus"), name: "Saturn-Uranus Sq" },
    { date: "2001-08-05", intensity: computeIntensity("Saturn-Pluto", "Opp"), spreadDays: computeSpread("Saturn-Pluto"), name: "Saturn-Pluto Opp" },
    { date: "2008-11-04", intensity: computeIntensity("Saturn-Uranus", "Opp"), spreadDays: computeSpread("Saturn-Uranus"), name: "Saturn-Uranus Opp" },
    { date: "2010-08-15", intensity: computeIntensity("Saturn-Pluto", "Sq"), spreadDays: computeSpread("Saturn-Pluto"), name: "Saturn-Pluto Sq" },
    { date: "2014-04-20", intensity: computeIntensity("Uranus-Pluto", "Sq"), spreadDays: computeSpread("Uranus-Pluto"), name: "Uranus-Pluto Sq" },
    { date: "2020-01-12", intensity: computeIntensity("Saturn-Pluto", "Conj"), spreadDays: computeSpread("Saturn-Pluto"), name: "Saturn-Pluto Conj" },
    { date: "2022-09-15", intensity: computeIntensity("Saturn-Uranus", "Sq"), spreadDays: computeSpread("Saturn-Uranus"), name: "Saturn-Uranus Sq" },
    { date: "2026-02-20", intensity: computeIntensity("Saturn-Neptune", "Conj"), spreadDays: computeSpread("Saturn-Neptune"), name: "Saturn-Neptune Conj" },
    { date: "2029-04-15", intensity: computeIntensity("Saturn-Pluto", "Sq"), spreadDays: computeSpread("Saturn-Pluto"), name: "Saturn-Pluto Sq" },
    { date: "2032-06-25", intensity: computeIntensity("Saturn-Uranus", "Conj"), spreadDays: computeSpread("Saturn-Uranus"), name: "Saturn-Uranus Conj" },
];

// Key Harmonious Aspects (Fluidity = -Turbulence)
// Negative intensity = reduces turbulence
const FLUIDITY_PEAKS = [
    { date: "2004-05-15", intensity: -computeIntensity("Jupiter-Uranus", "Trine"), spreadDays: computeSpread("Jupiter-Uranus"), name: "Jupiter-Uranus Trine" },
    { date: "2007-06-15", intensity: -computeIntensity("Jupiter-Pluto", "Trine"), spreadDays: computeSpread("Jupiter-Pluto"), name: "Jupiter-Pluto Trine" },
    { date: "2013-07-20", intensity: -computeIntensity("Jupiter-Saturn", "Trine"), spreadDays: computeSpread("Jupiter-Saturn"), name: "Jupiter-Saturn Trine" },
    { date: "2018-01-15", intensity: -computeIntensity("Jupiter-Pluto", "Sextile"), spreadDays: computeSpread("Jupiter-Pluto"), name: "Jupiter-Pluto Sextile" },
    { date: "2021-02-15", intensity: -computeIntensity("Jupiter-Saturn", "Conj"), spreadDays: computeSpread("Jupiter-Saturn"), name: "Jupiter-Saturn Conj (Air)" },
    { date: "2024-04-20", intensity: -computeIntensity("Jupiter-Uranus", "Conj"), spreadDays: computeSpread("Jupiter-Uranus"), name: "Jupiter-Uranus Conj" },
    { date: "2027-07-20", intensity: -computeIntensity("Uranus-Pluto", "Trine"), spreadDays: computeSpread("Uranus-Pluto"), name: "Uranus-Pluto Trine (Air)" },
];

// ── Exportable registry with human-readable descriptions ───────
export interface PlanetaryTransit {
    name: string;
    date: string;
    type: "tension" | "fluidity";
    intensity: number;
    spreadDays: number;
    description: string;
}

const TRANSIT_DESCRIPTIONS: Record<string, string> = {
    "Saturn-Uranus Sq": "Saturn (control, austerity) clashes with Uranus (disruption, technology). Historically triggers sudden market shocks where the old order violently resists disruptive innovation.",
    "Saturn-Pluto Opp": "Saturn (structure) opposes Pluto (destruction & rebirth). Maximum geopolitical tension — power structures are exposed and forced into painful transformation.",
    "Saturn-Uranus Opp": "The full opposition of Saturn and Uranus creates an extreme tug-of-war between legacy financial systems and emerging disruptive forces, often marking systemic banking crises.",
    "Saturn-Pluto Sq": "A 90° hard angle between Saturn and Pluto. Debt stress, sovereign crises, and forced austerity. The 'squeeze' aspect — like tightening a financial vice.",
    "Uranus-Pluto Sq": "A generational aspect lasting years. Reshapes the relationship between technology and power. Coincides with profound social upheaval and prolonged market regime changes.",
    "Saturn-Pluto Conj": "The rarest and most powerful tension aspect. Saturn and Pluto unite in the same degree — a 'nuclear' alignment historically linked to pandemics, wars, and complete economic resets.",
    "Saturn-Neptune Conj": "Saturn (reality) meets Neptune (illusion). Bursts speculative bubbles and forces markets to confront uncomfortable truths about valuation and systemic risk.",
    "Saturn-Uranus Conj": "Saturn fuses with Uranus — the unstoppable force meets the immovable object. Marks the beginning of entirely new technological-economic paradigms, often through crisis.",
    "Jupiter-Uranus Trine": "A harmonious 120° angle between expansion (Jupiter) and innovation (Uranus). Creates favorable conditions for technological breakthroughs and market optimism.",
    "Jupiter-Pluto Trine": "Jupiter amplifies Pluto's transformative power harmoniously. Wealth creation through deep structural investment — often precedes market peaks.",
    "Jupiter-Saturn Trine": "The 'Grand Trine' of business. Jupiter (growth) and Saturn (discipline) cooperate, rewarding strategic, well-managed enterprises with sustained expansion.",
    "Jupiter-Pluto Sextile": "A productive 60° angle between growth and power. Enables strategic accumulation and institutional investment. Quiet but powerful bull market fuel.",
    "Jupiter-Saturn Conj (Air)": "A once-in-200-years shift into Air signs. Marks the transition from material-industrial economies to information-digital economies. A civilizational inflection point.",
    "Jupiter-Uranus Conj": "Jupiter and Uranus unite — explosive innovation meets capital expansion. Historically triggers tech booms, IPO frenzies, and paradigm-shifting product launches.",
    "Uranus-Pluto Trine (Air)": "The most powerful fluidity aspect of the next decade. Uranus (tech) and Pluto (transformation) harmonize in Air signs, enabling seamless integration of AI and decentralized systems into the global economy.",
};

export const PLANETARY_TRANSITS: PlanetaryTransit[] = [
    ...TENSION_PEAKS.map(p => ({
        name: p.name,
        date: p.date,
        type: "tension" as const,
        intensity: p.intensity,
        spreadDays: p.spreadDays,
        description: TRANSIT_DESCRIPTIONS[p.name] || "A significant planetary alignment contributing to market tension.",
    })),
    ...FLUIDITY_PEAKS.map(p => ({
        name: p.name,
        date: p.date,
        type: "fluidity" as const,
        intensity: Math.abs(p.intensity),
        spreadDays: p.spreadDays,
        description: TRANSIT_DESCRIPTIONS[p.name] || "A harmonious planetary alignment contributing to market fluidity.",
    })),
].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

// ── Pearson Correlation Helper ─────────────────────────────────
export function pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 5) return 0;
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);
    const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
    const meanY = ySlice.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xSlice[i] - meanX;
        const dy = ySlice[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : Math.round((num / den) * 1000) / 1000;
}

/**
 * Calculates a Gaussian bell curve value for a specific distance from a peak.
 */
function gaussian(x: number, peakVal: number, spread: number): number {
    return peakVal * Math.exp(-(Math.pow(x, 2) / (2 * Math.pow(spread, 2))));
}

/**
 * Generates the Macro Timeline dataset
 */
export function generateMacroTimeline(startDateStr: string, endDateStr: string, steps: number = 300): MacroDataPoint[] {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const stepMs = (end - start) / steps;

    const data: MacroDataPoint[] = [];

    // Convert peaks to timestamps
    const tensionNodes = TENSION_PEAKS.map(p => ({ ...p, time: new Date(p.date).getTime() }));
    const fluidNodes = FLUIDITY_PEAKS.map(p => ({ ...p, time: new Date(p.date).getTime() }));

    // Mock initial S&P 500 price
    let currentSp500 = 1400; // Benchmark roughly around year 2000
    if (new Date(start).getFullYear() > 2010) currentSp500 = 2000;
    if (new Date(start).getFullYear() > 2020) currentSp500 = 4000;

    let currentBtc = 100;

    for (let i = 0; i <= steps; i++) {
        const time = start + (i * stepMs);

        // Base turbulence drifts around 45 (slightly cautious neutral)
        let baseTurbulence = 45;
        const activeTransits: string[] = [];

        // Apply Tensions
        for (const node of tensionNodes) {
            const distDays = (time - node.time) / (1000 * 60 * 60 * 24);
            const impact = gaussian(distDays, node.intensity - 45, node.spreadDays);
            baseTurbulence += impact;
            if (impact > 10) activeTransits.push(`Tension: ${node.name}`);
        }

        // Apply Fluidity (negative tension)
        for (const node of fluidNodes) {
            const distDays = (time - node.time) / (1000 * 60 * 60 * 24);
            const impact = gaussian(distDays, node.intensity, node.spreadDays);
            baseTurbulence += impact;
            if (impact < -10) activeTransits.push(`Fluidity: ${node.name}`);
        }

        // Deterministic cosmic "noise" (Mercury retrogrades etc) — seeded by date
        const daysSinceEpoch = Math.floor(time / 86400000);
        const noise = Math.sin(daysSinceEpoch * 127.1 + 311.7) * 2; // ±2 deterministic
        const finalTurbulence = Math.min(100, Math.max(0, baseTurbulence + noise));

        // Let's create a realistic mock S&P 500 that reacts inversely to turbulence
        let growthFactor = (45 - finalTurbulence) / 3000; // More sensitive to tension
        let macroDrift = 0.0008; // Baseline upward drift of markets
        // Mock S&P 500 growth is driven purely by the turbulence model — no manual year overrides

        const spNoise = Math.sin(daysSinceEpoch * 43.7 + 97.3) * 0.0025; // deterministic ±0.25%
        currentSp500 = currentSp500 * (1 + growthFactor + macroDrift + spNoise);

        // Mock BTC is highly correlated to extreme fluidity (Risk On liquidity)
        if (time > new Date("2010-01-01").getTime()) {
            const btcGrowth = finalTurbulence < 40 ? 0.04 : finalTurbulence > 75 ? -0.05 : 0.005;
            const btcNoise = Math.sin(daysSinceEpoch * 73.1 + 53.9) * 0.015; // deterministic ±1.5%
            currentBtc = currentBtc * (1 + btcGrowth + btcNoise);
        }

        const dateObj = new Date(time);

        data.push({
            date: dateObj.toISOString().split("T")[0],
            timestamp: time,
            turbulenceIndex: Math.round(finalTurbulence * 10) / 10,
            sp500Price: Math.round(currentSp500),
            btcPrice: time > new Date("2013-01-01").getTime() ? Math.round(currentBtc) : undefined,
            activeTransits: activeTransits.length > 0 ? activeTransits : ["Neutral Zone"],
        });
    }

    return data;
}
