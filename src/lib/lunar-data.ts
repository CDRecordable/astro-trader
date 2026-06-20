// ============================================================
// Lunar Data — Moon phase from the REAL ephemeris (astronomy-engine)
// ============================================================
// Phase and exact new/full-moon dates are computed from the Moon's true
// geocentric elongation from the Sun — not a mean-synodic approximation.

import * as Astronomy from "astronomy-engine";

/**
 * Moon phase as 0-1 (0 = new moon, 0.5 = full moon), from the real
 * Sun-Moon elongation. astronomy-engine MoonPhase returns 0-360°.
 */
export function getMoonPhase(date: Date): number {
    return Astronomy.MoonPhase(date) / 360;
}

/**
 * Get the emoji for a given phase value.
 */
export function getMoonEmoji(phase: number): string {
    if (phase < 0.0625 || phase >= 0.9375) return "🌑"; // New Moon
    if (phase < 0.1875) return "🌒"; // Waxing Crescent
    if (phase < 0.3125) return "🌓"; // First Quarter
    if (phase < 0.4375) return "🌔"; // Waxing Gibbous
    if (phase < 0.5625) return "🌕"; // Full Moon
    if (phase < 0.6875) return "🌖"; // Waning Gibbous
    if (phase < 0.8125) return "🌗"; // Last Quarter
    return "🌘"; // Waning Crescent
}

export function getMoonPhaseName(phase: number): string {
    if (phase < 0.0625 || phase >= 0.9375) return "New Moon";
    if (phase < 0.1875) return "Waxing Crescent";
    if (phase < 0.3125) return "First Quarter";
    if (phase < 0.4375) return "Waxing Gibbous";
    if (phase < 0.5625) return "Full Moon";
    if (phase < 0.6875) return "Waning Gibbous";
    if (phase < 0.8125) return "Last Quarter";
    return "Waning Crescent";
}

export function isNewMoon(phase: number): boolean {
    return phase < 0.0625 || phase >= 0.9375;
}

export function isFullMoon(phase: number): boolean {
    return phase >= 0.4375 && phase < 0.5625;
}

/**
 * Find all dates in [startYear, endYear] where the Moon reaches a target
 * phase angle (0 = new, 180 = full) — exact instants via root-finding.
 */
function searchMoonPhaseDates(targetLon: number, startYear: number, endYear: number): Date[] {
    const results: Date[] = [];
    const endTs = new Date(endYear, 11, 31).getTime();
    let startTime: Astronomy.AstroTime = Astronomy.MakeTime(new Date(startYear, 0, 1));

    // The synodic month is ~29.5 days; search a 40-day window each step.
    for (let guard = 0; guard < 2000; guard++) {
        const found = Astronomy.SearchMoonPhase(targetLon, startTime, 40);
        if (!found) break;
        const d = found.date;
        if (d.getTime() > endTs) break;
        results.push(d);
        startTime = found.AddDays(1); // continue after this event
    }
    return results;
}

/** All new-moon dates in a year range (exact, from the ephemeris). */
export function getNewMoonDates(startYear: number, endYear: number): Date[] {
    return searchMoonPhaseDates(0, startYear, endYear);
}

/** All full-moon dates in a year range (exact, from the ephemeris). */
export function getFullMoonDates(startYear: number, endYear: number): Date[] {
    return searchMoonPhaseDates(180, startYear, endYear);
}
