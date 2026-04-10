// ============================================================
// Lunar Data - Moon phase calculator
// ============================================================

/**
 * Calculate moon phase using the Trig method.
 * Returns phase as 0-1 (0 = new moon, 0.5 = full moon).
 */
export function getMoonPhase(date: Date): number {
    // Known new moon: January 6, 2000 at 18:14 UTC
    const knownNewMoon = new Date("2000-01-06T18:14:00Z").getTime();
    const synodicMonth = 29.53058867; // days
    const daysSinceKnown = (date.getTime() - knownNewMoon) / 86400000;
    const cycles = daysSinceKnown / synodicMonth;
    return cycles - Math.floor(cycles); // 0-1
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
 * Get all new moon dates in a range.
 */
export function getNewMoonDates(startYear: number, endYear: number): Date[] {
    const results: Date[] = [];
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);

    // Walk day by day and find new moons (phase crosses 0)
    let prevPhase = getMoonPhase(start);
    const current = new Date(start);

    while (current <= end) {
        current.setDate(current.getDate() + 1);
        const phase = getMoonPhase(current);
        // New moon when phase wraps around (prevPhase > 0.9 and phase < 0.1)
        if (prevPhase > 0.9 && phase < 0.1) {
            results.push(new Date(current));
        }
        prevPhase = phase;
    }

    return results;
}

/**
 * Get all full moon dates in a range.
 */
export function getFullMoonDates(startYear: number, endYear: number): Date[] {
    const results: Date[] = [];
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);

    let prevPhase = getMoonPhase(start);
    const current = new Date(start);

    while (current <= end) {
        current.setDate(current.getDate() + 1);
        const phase = getMoonPhase(current);
        // Full moon when phase crosses 0.5 (prevPhase < 0.5 and phase >= 0.5)
        if (prevPhase < 0.5 && phase >= 0.5) {
            results.push(new Date(current));
        }
        prevPhase = phase;
    }

    return results;
}
