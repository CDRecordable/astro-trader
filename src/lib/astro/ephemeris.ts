// ============================================================
// Real ephemeris engine — planetary aspects → tension curve
// ============================================================
// Replaces the hand-picked transit dates with a CONTINUOUS tension
// curve computed from actual geocentric planetary positions
// (astronomy-engine, pure-JS, arc-minute accuracy). No date is
// chosen by hand — every aspect is found from real positions, so
// the signal is free of hindsight selection bias.
// ============================================================

import * as Astronomy from "astronomy-engine";

const Body = Astronomy.Body;

// Heavy planets tracked for the aspect calendar (includes Jupiter as a fast trigger).
const PLANETS = [Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto] as const;
type Planet = (typeof PLANETS)[number];

// MACRO tension uses only the SLOW outer planets — generational aspects that
// define multi-year regimes. Jupiter (≈1-yr cycle) is too fast to be "macro",
// so it is excluded from the turbulence curve (but still shown in the calendar).
const MACRO_PLANETS: Planet[] = [Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto];

// ── Astrological weights (same convention as the old engine) ──
const PAIR_WEIGHT: Record<string, number> = {
    "Saturn-Pluto": 1.0,
    "Uranus-Pluto": 0.95,
    "Saturn-Uranus": 0.9,
    "Saturn-Neptune": 0.85,
    "Neptune-Pluto": 0.8,
    "Jupiter-Pluto": 0.7,
    "Jupiter-Saturn": 0.7,
    "Jupiter-Uranus": 0.65,
    "Jupiter-Neptune": 0.6,
    "Uranus-Neptune": 0.6,
};

interface AspectDef { name: string; angle: number; weight: number; kind: "tension" | "harmony"; }
const ASPECTS: AspectDef[] = [
    { name: "Conjunction", angle: 0, weight: 1.0, kind: "tension" },   // amplifies (sign depends on pair, treated as tension by default)
    { name: "Opposition", angle: 180, weight: 0.9, kind: "tension" },
    { name: "Square", angle: 90, weight: 0.8, kind: "tension" },
    { name: "Trine", angle: 120, weight: 0.65, kind: "harmony" },
    { name: "Sextile", angle: 60, weight: 0.5, kind: "harmony" },
];

/** Orb (degrees) within which an aspect contributes. Slow planets → generous orb. */
const MAX_ORB = 7;
const BASELINE = 45;
const SCALE = 30; // maps net weighted aspect strength → turbulence points

// ── Core ephemeris ──────────────────────────────────────────
/** Geocentric apparent ecliptic longitude (degrees, 0–360) of a body. */
export function eclipticLongitude(body: Planet | Astronomy.Body, date: Date): number {
    const time = Astronomy.MakeTime(date);
    const vec = Astronomy.GeoVector(body, time, true);
    return Astronomy.Ecliptic(vec).elon;
}

/** Smallest angular separation (0–180°) between two ecliptic longitudes. */
function angularSep(lonA: number, lonB: number): number {
    let d = Math.abs(lonA - lonB) % 360;
    if (d > 180) d = 360 - d;
    return d;
}

function pairKey(a: Planet, b: Planet): string {
    // Match PAIR_WEIGHT keys (outer planet ordering by slowness)
    const order = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
    const na = String(a), nb = String(b);
    return order.indexOf(na) < order.indexOf(nb) ? `${na}-${nb}` : `${nb}-${na}`;
}

export interface ActiveAspect {
    pair: string;
    aspect: string;     // Conjunction / Square / ...
    kind: "tension" | "harmony";
    orb: number;        // degrees from exact
    strength: number;   // 0..1 (1 = exact)
    label: string;      // "Saturn-Pluto Conjunction"
}

/** All aspects currently within orb for the heavy planets on a given date. */
export function activeAspects(date: Date): ActiveAspect[] {
    const lon = new Map<Planet, number>();
    for (const p of PLANETS) lon.set(p, eclipticLongitude(p, date));

    const out: ActiveAspect[] = [];
    for (let i = 0; i < PLANETS.length; i++) {
        for (let j = i + 1; j < PLANETS.length; j++) {
            const a = PLANETS[i], b = PLANETS[j];
            const key = pairKey(a, b);
            const pw = PAIR_WEIGHT[key];
            if (pw === undefined) continue;
            const sep = angularSep(lon.get(a)!, lon.get(b)!);
            for (const asp of ASPECTS) {
                const orb = Math.abs(sep - asp.angle);
                if (orb <= MAX_ORB) {
                    out.push({
                        pair: key,
                        aspect: asp.name,
                        kind: asp.kind,
                        orb,
                        strength: 1 - orb / MAX_ORB,
                        label: `${key} ${asp.name}`,
                    });
                }
            }
        }
    }
    return out;
}

/** Continuous turbulence index (0–100) computed purely from real positions. */
export function tensionAt(date: Date): number {
    const lon = new Map<Planet, number>();
    for (const p of MACRO_PLANETS) lon.set(p, eclipticLongitude(p, date));

    let net = 0;
    for (let i = 0; i < MACRO_PLANETS.length; i++) {
        for (let j = i + 1; j < MACRO_PLANETS.length; j++) {
            const a = MACRO_PLANETS[i], b = MACRO_PLANETS[j];
            const key = pairKey(a, b);
            const pw = PAIR_WEIGHT[key];
            if (pw === undefined) continue;
            const sep = angularSep(lon.get(a)!, lon.get(b)!);
            for (const asp of ASPECTS) {
                const orb = Math.abs(sep - asp.angle);
                if (orb <= MAX_ORB) {
                    const strength = 1 - orb / MAX_ORB;
                    const contrib = pw * asp.weight * strength;
                    net += asp.kind === "tension" ? contrib : -contrib;
                }
            }
        }
    }
    return Math.max(0, Math.min(100, BASELINE + net * SCALE));
}

// ── Timeline (drop-in shape for the old generateMacroTimeline) ──
export interface RealMacroPoint {
    date: string;            // YYYY-MM-DD
    timestamp: number;
    turbulenceIndex: number; // 0–100, from real positions
    activeTransits: string[];
}

/**
 * Single-pass macro point: turbulence + active transits from ONE longitude
 * computation (5 GeoVector calls). Tension uses the slow MACRO_PLANETS subset;
 * the transit labels include Jupiter for the calendar.
 */
export function macroPointAt(date: Date): { turbulenceIndex: number; activeTransits: string[] } {
    const lon = new Map<Planet, number>();
    for (const p of PLANETS) lon.set(p, eclipticLongitude(p, date));

    let net = 0;
    const transits: { label: string; orb: number }[] = [];
    for (let i = 0; i < PLANETS.length; i++) {
        for (let j = i + 1; j < PLANETS.length; j++) {
            const a = PLANETS[i], b = PLANETS[j];
            const key = pairKey(a, b);
            const pw = PAIR_WEIGHT[key];
            if (pw === undefined) continue;
            const sep = angularSep(lon.get(a)!, lon.get(b)!);
            const isMacro = MACRO_PLANETS.includes(a) && MACRO_PLANETS.includes(b);
            for (const asp of ASPECTS) {
                const orb = Math.abs(sep - asp.angle);
                if (orb > MAX_ORB) continue;
                const strength = 1 - orb / MAX_ORB;
                if (isMacro) {
                    const c = pw * asp.weight * strength;
                    net += asp.kind === "tension" ? c : -c;
                }
                if (orb < 3) transits.push({ label: `${asp.kind === "tension" ? "Tension" : "Fluidity"}: ${key} ${asp.name}`, orb });
            }
        }
    }
    const turbulenceIndex = Math.round(Math.max(0, Math.min(100, BASELINE + net * SCALE)) * 10) / 10;
    transits.sort((x, y) => x.orb - y.orb);
    return { turbulenceIndex, activeTransits: transits.length ? transits.map((t) => t.label) : ["Neutral Zone"] };
}

export function generateRealMacroTimeline(startDateStr: string, endDateStr: string, steps = 300): RealMacroPoint[] {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const stepMs = steps > 0 ? (end - start) / steps : end - start;
    const data: RealMacroPoint[] = [];

    for (let i = 0; i <= steps; i++) {
        const time = start + i * stepMs;
        const d = new Date(time);
        const { turbulenceIndex, activeTransits } = macroPointAt(d);
        data.push({ date: d.toISOString().split("T")[0], timestamp: time, turbulenceIndex, activeTransits });
    }
    return data;
}

// ── Essential dignity (real zodiac position) ───────────────
// Replaces the old sin(date) pseudo-dignity. Computes the planet's true
// ecliptic sign and returns its classical essential dignity:
//   +90 rulership · +60 exaltation · 0 peregrine · −60 fall · −90 detriment
const SIGN_RULERSHIP: Record<string, number[]> = {
    Sun: [4], Moon: [3], Mercury: [2, 5], Venus: [1, 6], Mars: [0, 7],
    Jupiter: [8, 11], Saturn: [9, 10], Uranus: [10], Neptune: [11], Pluto: [7],
};
const SIGN_EXALTATION: Record<string, number> = {
    Sun: 0, Moon: 1, Mercury: 5, Venus: 11, Mars: 9, Jupiter: 3, Saturn: 6,
};
const NAME_TO_BODY: Record<string, Astronomy.Body> = {
    Sun: Body.Sun, Moon: Body.Moon, Mercury: Body.Mercury, Venus: Body.Venus,
    Mars: Body.Mars, Jupiter: Body.Jupiter, Saturn: Body.Saturn,
    Uranus: Body.Uranus, Neptune: Body.Neptune, Pluto: Body.Pluto,
};

export const ZODIAC = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

/** Zodiac sign index (0-11) of a planet on a date. */
export function zodiacSign(planetName: string, date: Date): number {
    const body = NAME_TO_BODY[planetName];
    if (!body) return 0;
    return Math.floor(eclipticLongitude(body, date) / 30) % 12;
}

/** Classical essential dignity (-90..+90) of a planet from its real sign. */
export function planetaryDignity(planetName: string, date: Date): number {
    const body = NAME_TO_BODY[planetName];
    if (!body) return 0;
    const sign = Math.floor(eclipticLongitude(body, date) / 30) % 12;
    const rules = SIGN_RULERSHIP[planetName] ?? [];
    const exalt = SIGN_EXALTATION[planetName];
    if (rules.includes(sign)) return 90;                                  // rulership
    if (exalt === sign) return 60;                                        // exaltation
    if (rules.some((r) => (r + 6) % 12 === sign)) return -90;             // detriment
    if (exalt !== undefined && (exalt + 6) % 12 === sign) return -60;     // fall
    return 0;                                                             // peregrine
}

// ── Exact-aspect finder (computed transit calendar) ─────────
export interface ComputedTransit {
    date: string;
    name: string;       // "Saturn-Pluto Conjunction"
    pair: string;
    aspect: string;
    kind: "tension" | "harmony";
}

/**
 * Find the dates where each heavy-planet aspect is EXACT (orb minimum),
 * scanning day-by-day between start and end. Pure computation — this is the
 * honest replacement for the hand-typed PLANETARY_TRANSITS list.
 */
export function findAspects(startDateStr: string, endDateStr: string): ComputedTransit[] {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const DAY = 86400000;

    // Track, per pair+aspect, the running orb to detect local minima (exact crossing).
    type Track = { prevOrb: number; prevPrevOrb: number; prevDate: number };
    const tracks = new Map<string, Track>();
    const results: ComputedTransit[] = [];

    for (let t = start; t <= end; t += DAY) {
        const d = new Date(t);
        const lon = new Map<Planet, number>();
        for (const p of PLANETS) lon.set(p, eclipticLongitude(p, d));

        for (let i = 0; i < PLANETS.length; i++) {
            for (let j = i + 1; j < PLANETS.length; j++) {
                const a = PLANETS[i], b = PLANETS[j];
                const key = pairKey(a, b);
                if (PAIR_WEIGHT[key] === undefined) continue;
                const sep = angularSep(lon.get(a)!, lon.get(b)!);
                for (const asp of ASPECTS) {
                    const id = `${key}|${asp.name}`;
                    const orb = Math.abs(sep - asp.angle);
                    const tr = tracks.get(id);
                    if (tr) {
                        // local minimum of orb, below orb threshold → exact aspect
                        if (tr.prevOrb < tr.prevPrevOrb && tr.prevOrb <= orb && tr.prevOrb < 1.0) {
                            results.push({
                                date: new Date(tr.prevDate).toISOString().split("T")[0],
                                name: `${key} ${asp.name}`,
                                pair: key,
                                aspect: asp.name,
                                kind: asp.kind,
                            });
                        }
                        tr.prevPrevOrb = tr.prevOrb;
                        tr.prevOrb = orb;
                        tr.prevDate = t;
                    } else {
                        tracks.set(id, { prevOrb: orb, prevPrevOrb: orb, prevDate: t });
                    }
                }
            }
        }
    }
    return results.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
}
