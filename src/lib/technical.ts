// ============================================================
// Technical indicators — pure, dependency-free, isomorphic
// ============================================================
// Runs identically in the API route (to score) and in the browser (to draw),
// so the /api/technical payload never has to carry ten 6,000-point arrays.
//
// Conventions, chosen to match the reference implementations traders check
// against (TradingView / TA-Lib):
//   · RSI, ATR and ADX use WILDER's smoothing — avg = (prev·(n−1) + x) / n —
//     not a standard EMA. The two diverge quickly; using the wrong one is the
//     most common bug in hand-rolled TA code.
//   · EMA seeds with the SMA of the first `period` values.
//   · Bollinger uses the POPULATION standard deviation (÷N), per Bollinger's
//     own definition.
//   · Series functions return arrays aligned with their input, `null` during
//     the warm-up window. Never NaN.
//
// Data honesty: crypto candles are synthesized from daily closes (CoinGecko's
// free OHLC endpoint returns 4-day candles for long ranges — useless for daily
// indicators). Synthetic candles carry real close and volume; high/low are
// ABSENT, so every indicator that needs them (stochastic, ATR, ADX) reports
// unavailable instead of computing on fabricated wicks.

// ── Types ────────────────────────────────────────────────────

export interface Candle {
    date: string;            // YYYY-MM-DD
    open?: number;
    high?: number;
    low?: number;
    close: number;
    volume?: number;
}

export type TechnicalSignal = "bullish" | "bearish" | "neutral";

export type IndicatorId =
    | "sma_structure"   // close vs SMA50 vs SMA200 alignment
    | "golden_cross"    // recent SMA50/SMA200 cross
    | "rsi"
    | "macd"
    | "macd_momentum"   // histogram slope
    | "bollinger"       // %B position
    | "squeeze"         // bandwidth compression (no direction)
    | "stochastic"
    | "obv"             // volume confirms/diverges from price
    | "volume_trend"    // recent volume vs 20d average
    | "adx"             // trend strength + DI direction
    | "atr"             // volatility regime (informative)
    | "divergence";     // RSI vs price divergence

export interface IndicatorReading {
    id: IndicatorId;
    /** False → honest N/D: missing OHLC/volume or not enough history. */
    available: boolean;
    /** Headline value (RSI level, %B, ADX…). Null when unavailable. */
    value: number | null;
    signal: TechnicalSignal;
    /** 0..1 — how emphatic the reading is. 0 for neutral/unavailable. */
    strength: number;
    /** Secondary numbers the UI or the AI prompt may want. */
    extra?: Record<string, number>;
}

export interface TechnicalSnapshot {
    readings: IndicatorReading[];
    levels: { supports: number[]; resistances: number[] };
    quality: {
        candles: number;
        hasOHLC: boolean;
        hasVolume: boolean;
        syntheticOpen: boolean;
    };
}

// ── Small helpers ────────────────────────────────────────────

const NULLS = (n: number): null[] => new Array<null>(n).fill(null);

function last<T>(arr: (T | null)[]): T | null {
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== null) return arr[i];
    return null;
}

function clamp01(x: number): number {
    return Math.max(0, Math.min(1, x));
}

/** Least-squares slope of a numeric window (index as x). */
function slope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    const mx = (n - 1) / 2;
    const my = values.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
        num += (i - mx) * (values[i] - my);
        den += (i - mx) * (i - mx);
    }
    return den === 0 ? 0 : num / den;
}

// ── Moving averages ──────────────────────────────────────────

export function sma(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = NULLS(values.length);
    if (period <= 0 || values.length < period) return out;
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        if (i >= period - 1) out[i] = sum / period;
    }
    return out;
}

export function ema(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = NULLS(values.length);
    if (period <= 0 || values.length < period) return out;
    // Seed with the SMA of the first `period` values (TA-Lib convention).
    let seed = 0;
    for (let i = 0; i < period; i++) seed += values[i];
    seed /= period;
    out[period - 1] = seed;
    const k = 2 / (period + 1);
    let prev = seed;
    for (let i = period; i < values.length; i++) {
        prev = values[i] * k + prev * (1 - k);
        out[i] = prev;
    }
    return out;
}

// ── RSI (Wilder) ─────────────────────────────────────────────

export function rsi(closes: number[], period = 14): (number | null)[] {
    const out: (number | null)[] = NULLS(closes.length);
    if (closes.length <= period) return out;

    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d > 0) avgGain += d; else avgLoss -= d;
    }
    avgGain /= period;
    avgLoss /= period;

    const toRsi = (g: number, l: number): number => {
        if (l === 0 && g === 0) return 50; // flat series: neutral, not NaN
        if (l === 0) return 100;
        return 100 - 100 / (1 + g / l);
    };
    out[period] = toRsi(avgGain, avgLoss);

    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        const gain = d > 0 ? d : 0;
        const loss = d < 0 ? -d : 0;
        // Wilder smoothing — NOT a standard EMA.
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        out[i] = toRsi(avgGain, avgLoss);
    }
    return out;
}

// ── MACD ─────────────────────────────────────────────────────

export function macd(
    closes: number[], fast = 12, slow = 26, signalPeriod = 9,
): { line: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
    const emaFast = ema(closes, fast);
    const emaSlow = ema(closes, slow);
    const line: (number | null)[] = closes.map((_, i) =>
        emaFast[i] !== null && emaSlow[i] !== null ? (emaFast[i] as number) - (emaSlow[i] as number) : null,
    );

    // Signal = EMA of the MACD line, computed over its non-null tail.
    const firstIdx = line.findIndex((v) => v !== null);
    const signal: (number | null)[] = NULLS(closes.length);
    if (firstIdx >= 0) {
        const tail = line.slice(firstIdx) as number[];
        const sig = ema(tail, signalPeriod);
        for (let i = 0; i < sig.length; i++) signal[firstIdx + i] = sig[i];
    }

    const histogram: (number | null)[] = line.map((v, i) =>
        v !== null && signal[i] !== null ? v - (signal[i] as number) : null,
    );
    return { line, signal, histogram };
}

// ── Bollinger bands ──────────────────────────────────────────

export function bollinger(
    closes: number[], period = 20, mult = 2,
): {
    middle: (number | null)[]; upper: (number | null)[]; lower: (number | null)[];
    percentB: (number | null)[]; bandwidth: (number | null)[];
} {
    const middle = sma(closes, period);
    const upper: (number | null)[] = NULLS(closes.length);
    const lower: (number | null)[] = NULLS(closes.length);
    const percentB: (number | null)[] = NULLS(closes.length);
    const bandwidth: (number | null)[] = NULLS(closes.length);

    for (let i = period - 1; i < closes.length; i++) {
        const mean = middle[i];
        if (mean === null) continue;
        // Population standard deviation (÷N) — Bollinger's own definition.
        let ss = 0;
        for (let j = i - period + 1; j <= i; j++) {
            const d = closes[j] - mean;
            ss += d * d;
        }
        const sd = Math.sqrt(ss / period);
        const up = mean + mult * sd;
        const lo = mean - mult * sd;
        upper[i] = up;
        lower[i] = lo;
        bandwidth[i] = mean !== 0 ? (up - lo) / mean : null;
        percentB[i] = up !== lo ? (closes[i] - lo) / (up - lo) : 0.5; // flat: mid-band
    }
    return { middle, upper, lower, percentB, bandwidth };
}

// ── Stochastic oscillator (needs high/low) ───────────────────

export function stochastic(
    candles: Candle[], kPeriod = 14, kSmooth = 3, dPeriod = 3,
): { k: (number | null)[]; d: (number | null)[] } | null {
    if (!candles.every((c) => c.high !== undefined && c.low !== undefined)) return null;
    const n = candles.length;
    const rawK: (number | null)[] = NULLS(n);
    for (let i = kPeriod - 1; i < n; i++) {
        let hh = -Infinity, ll = Infinity;
        for (let j = i - kPeriod + 1; j <= i; j++) {
            hh = Math.max(hh, candles[j].high as number);
            ll = Math.min(ll, candles[j].low as number);
        }
        rawK[i] = hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100;
    }
    // %K is the smoothed raw; %D smooths %K again.
    const smoothTail = (series: (number | null)[], period: number): (number | null)[] => {
        const first = series.findIndex((v) => v !== null);
        const out: (number | null)[] = NULLS(n);
        if (first < 0) return out;
        const tail = series.slice(first) as number[];
        const s = sma(tail, period);
        for (let i = 0; i < s.length; i++) out[first + i] = s[i];
        return out;
    };
    const k = smoothTail(rawK, kSmooth);
    const d = smoothTail(k, dPeriod);
    return { k, d };
}

// ── ATR (Wilder, needs high/low) ─────────────────────────────

export function atr(candles: Candle[], period = 14): (number | null)[] | null {
    if (!candles.every((c) => c.high !== undefined && c.low !== undefined)) return null;
    const n = candles.length;
    const out: (number | null)[] = NULLS(n);
    if (n <= period) return out;

    const tr = (i: number): number => {
        const h = candles[i].high as number;
        const l = candles[i].low as number;
        if (i === 0) return h - l;
        const pc = candles[i - 1].close;
        return Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    };

    let avg = 0;
    for (let i = 1; i <= period; i++) avg += tr(i);
    avg /= period;
    out[period] = avg;
    for (let i = period + 1; i < n; i++) {
        avg = (avg * (period - 1) + tr(i)) / period; // Wilder
        out[i] = avg;
    }
    return out;
}

// ── ADX (Wilder, needs high/low) ─────────────────────────────

export function adx(
    candles: Candle[], period = 14,
): { adx: (number | null)[]; plusDI: (number | null)[]; minusDI: (number | null)[] } | null {
    if (!candles.every((c) => c.high !== undefined && c.low !== undefined)) return null;
    const n = candles.length;
    const empty = { adx: NULLS(n), plusDI: NULLS(n), minusDI: NULLS(n) };
    if (n <= period * 2) return empty;

    // Directional movement + true range per bar.
    const plusDM: number[] = [0], minusDM: number[] = [0], trArr: number[] = [0];
    for (let i = 1; i < n; i++) {
        const upMove = (candles[i].high as number) - (candles[i - 1].high as number);
        const downMove = (candles[i - 1].low as number) - (candles[i].low as number);
        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
        const h = candles[i].high as number, l = candles[i].low as number, pc = candles[i - 1].close;
        trArr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }

    // Wilder-smoothed sums.
    let sTR = 0, sPlus = 0, sMinus = 0;
    for (let i = 1; i <= period; i++) { sTR += trArr[i]; sPlus += plusDM[i]; sMinus += minusDM[i]; }

    const plusDI: (number | null)[] = NULLS(n);
    const minusDI: (number | null)[] = NULLS(n);
    const dxArr: (number | null)[] = NULLS(n);

    const writeDI = (i: number) => {
        const p = sTR === 0 ? 0 : (sPlus / sTR) * 100;
        const m = sTR === 0 ? 0 : (sMinus / sTR) * 100;
        plusDI[i] = p;
        minusDI[i] = m;
        dxArr[i] = p + m === 0 ? 0 : (Math.abs(p - m) / (p + m)) * 100;
    };
    writeDI(period);

    for (let i = period + 1; i < n; i++) {
        sTR = sTR - sTR / period + trArr[i];
        sPlus = sPlus - sPlus / period + plusDM[i];
        sMinus = sMinus - sMinus / period + minusDM[i];
        writeDI(i);
    }

    // ADX = Wilder average of DX.
    const adxOut: (number | null)[] = NULLS(n);
    let sum = 0;
    for (let i = period; i < period * 2; i++) sum += dxArr[i] as number;
    let a = sum / period;
    adxOut[period * 2 - 1] = a;
    for (let i = period * 2; i < n; i++) {
        a = (a * (period - 1) + (dxArr[i] as number)) / period;
        adxOut[i] = a;
    }
    return { adx: adxOut, plusDI, minusDI };
}

// ── OBV (needs volume) ───────────────────────────────────────

export function obv(candles: Candle[]): (number | null)[] | null {
    if (!candles.every((c) => c.volume !== undefined)) return null;
    const out: (number | null)[] = [0];
    let acc = 0;
    for (let i = 1; i < candles.length; i++) {
        const d = candles[i].close - candles[i - 1].close;
        if (d > 0) acc += candles[i].volume as number;
        else if (d < 0) acc -= candles[i].volume as number;
        out.push(acc);
    }
    return out;
}

// ── Pivots, support/resistance ───────────────────────────────

export interface Pivot { index: number; price: number }

/** Fractal pivots: a bar whose high (low) tops (bottoms) `window` bars each side. */
export function pivotPoints(candles: Candle[], window = 5): { highs: Pivot[]; lows: Pivot[] } {
    const highs: Pivot[] = [];
    const lows: Pivot[] = [];
    const hi = (c: Candle) => c.high ?? c.close;
    const lo = (c: Candle) => c.low ?? c.close;
    for (let i = window; i < candles.length - window; i++) {
        let isHigh = true, isLow = true;
        for (let j = i - window; j <= i + window; j++) {
            if (j === i) continue;
            if (hi(candles[j]) >= hi(candles[i])) isHigh = false;
            if (lo(candles[j]) <= lo(candles[i])) isLow = false;
            if (!isHigh && !isLow) break;
        }
        if (isHigh) highs.push({ index: i, price: hi(candles[i]) });
        if (isLow) lows.push({ index: i, price: lo(candles[i]) });
    }
    return { highs, lows };
}

/**
 * Cluster pivots into a handful of levels. Tolerance = max(1.5×ATR, 2% of
 * price); a level's relevance = touches × recency. Returns levels closest to
 * the current price first, below (supports) and above (resistances).
 */
export function supportResistance(candles: Candle[], maxLevels = 3): {
    supports: number[]; resistances: number[];
} {
    if (candles.length < 30) return { supports: [], resistances: [] };
    const price = candles[candles.length - 1].close;
    const atrSeries = atr(candles);
    const lastAtr = atrSeries ? last(atrSeries) : null;
    const tol = Math.max(lastAtr !== null ? 1.5 * lastAtr : 0, price * 0.02);

    const { highs, lows } = pivotPoints(candles);
    const all = [...highs, ...lows];

    interface Cluster { sum: number; weight: number; count: number }
    const clusters: Cluster[] = [];
    for (const p of all) {
        // Recent pivots matter more: weight decays with age.
        const age = candles.length - 1 - p.index;
        const w = Math.exp(-age / (candles.length / 2));
        const hit = clusters.find((c) => Math.abs(c.sum / c.weight - p.price) <= tol);
        if (hit) { hit.sum += p.price * w; hit.weight += w; hit.count++; }
        else clusters.push({ sum: p.price * w, weight: w, count: 1 });
    }

    const levels = clusters
        .filter((c) => c.count >= 2) // a level needs at least two touches
        .map((c) => ({ price: c.sum / c.weight, score: c.count * c.weight }))
        .sort((a, b) => b.score - a.score);

    const supports = levels
        .filter((l) => l.price < price)
        .sort((a, b) => b.price - a.price)
        .slice(0, maxLevels)
        .map((l) => l.price);
    const resistances = levels
        .filter((l) => l.price > price)
        .sort((a, b) => a.price - b.price)
        .slice(0, maxLevels)
        .map((l) => l.price);
    return { supports, resistances };
}

// ── RSI divergence ───────────────────────────────────────────

/**
 * Compare the last two price pivots with RSI at the same bars.
 * Lower low in price + higher low in RSI → bullish divergence.
 * Higher high in price + lower high in RSI → bearish divergence.
 */
export function rsiDivergence(
    candles: Candle[], rsiSeries: (number | null)[], lookback = 90,
): "bullish" | "bearish" | null {
    const from = Math.max(0, candles.length - lookback);
    const window = candles.slice(from);
    const { highs, lows } = pivotPoints(window, 4);

    const at = (p: Pivot) => rsiSeries[from + p.index];

    if (lows.length >= 2) {
        const [a, b] = lows.slice(-2);
        const ra = at(a), rb = at(b);
        if (ra !== null && rb !== null && b.price < a.price && rb > ra + 1) return "bullish";
    }
    if (highs.length >= 2) {
        const [a, b] = highs.slice(-2);
        const ra = at(a), rb = at(b);
        if (ra !== null && rb !== null && b.price > a.price && rb < ra - 1) return "bearish";
    }
    return null;
}

// ── Synthetic candles (crypto) ───────────────────────────────

/**
 * Build candles from CoinGecko's daily close+volume series. Open is the
 * previous close (flagged `syntheticOpen`); high/low are deliberately ABSENT
 * so OHLC-dependent indicators report N/D instead of computing on invented
 * wicks.
 */
export function syntheticCandles(
    prices: [number, number][], volumes?: [number, number][],
): Candle[] {
    const volByDay = new Map<string, number>();
    for (const [ts, v] of volumes ?? []) {
        volByDay.set(new Date(ts).toISOString().slice(0, 10), v);
    }
    const out: Candle[] = [];
    let prevClose: number | null = null;
    for (const [ts, close] of prices) {
        const date = new Date(ts).toISOString().slice(0, 10);
        // market_chart sometimes emits two points for the same day; keep last.
        if (out.length && out[out.length - 1].date === date) {
            out[out.length - 1].close = close;
            continue;
        }
        out.push({
            date,
            close,
            open: prevClose ?? undefined,
            volume: volByDay.get(date),
        });
        prevClose = close;
    }
    return out;
}

// ── Snapshot: every indicator → one discrete reading ─────────

export function computeSnapshot(candles: Candle[]): TechnicalSnapshot {
    const n = candles.length;
    const closes = candles.map((c) => c.close);
    const hasOHLC = n > 0 && candles.every((c) => c.high !== undefined && c.low !== undefined);
    const hasVolume = n > 0 && candles.every((c) => c.volume !== undefined);
    const syntheticOpen = n > 0 && !hasOHLC && candles.some((c) => c.open !== undefined);

    const readings: IndicatorReading[] = [];
    const na = (id: IndicatorId): IndicatorReading =>
        ({ id, available: false, value: null, signal: "neutral", strength: 0 });

    const price = n ? closes[n - 1] : 0;

    // Precompute shared series once. (SMA20 is chart-only — see TechnicalChart.)
    const sma50 = sma(closes, 50), sma200 = sma(closes, 200);
    const rsiS = rsi(closes);
    const macdS = macd(closes);
    const boll = bollinger(closes);
    const adxS = hasOHLC ? adx(candles) : null;

    // ── Moving-average structure ──
    {
        const s50 = last(sma50), s200 = last(sma200);
        if (s50 === null || s200 === null) readings.push(na("sma_structure"));
        else {
            const above50 = price > s50, above200 = price > s200;
            let signal: TechnicalSignal = "neutral";
            if (above50 && above200 && s50 > s200) signal = "bullish";
            else if (!above50 && !above200 && s50 < s200) signal = "bearish";
            const dist = Math.abs(price - s200) / s200;
            readings.push({
                id: "sma_structure", available: true,
                value: Math.round(((price - s200) / s200) * 1000) / 10, // % vs SMA200
                signal, strength: signal === "neutral" ? 0 : clamp01(dist / 0.15),
                extra: { sma50: s50, sma200: s200 },
            });
        }
    }

    // ── Golden / death cross in the last 40 sessions ──
    {
        if (last(sma200) === null) readings.push(na("golden_cross"));
        else {
            let crossIdx = -1, crossDir = 0;
            const from = Math.max(1, n - 40);
            for (let i = from; i < n; i++) {
                const a50 = sma50[i - 1], a200 = sma200[i - 1], b50 = sma50[i], b200 = sma200[i];
                if (a50 === null || a200 === null || b50 === null || b200 === null) continue;
                if (a50 <= a200 && b50 > b200) { crossIdx = i; crossDir = 1; }
                if (a50 >= a200 && b50 < b200) { crossIdx = i; crossDir = -1; }
            }
            if (crossIdx < 0) {
                readings.push({ id: "golden_cross", available: true, value: null, signal: "neutral", strength: 0 });
            } else {
                const age = n - 1 - crossIdx;
                readings.push({
                    id: "golden_cross", available: true, value: age,
                    signal: crossDir > 0 ? "bullish" : "bearish",
                    strength: clamp01(1 - age / 40) * 0.9, // decays with age
                });
            }
        }
    }

    // ── RSI ──
    {
        const v = last(rsiS);
        if (v === null) readings.push(na("rsi"));
        else {
            let signal: TechnicalSignal = "neutral";
            if (v < 30) signal = "bullish";          // oversold
            else if (v < 45) signal = "bearish";     // weak momentum
            else if (v > 70) signal = "bearish";     // overbought
            else if (v > 55) signal = "bullish";     // healthy momentum
            readings.push({
                id: "rsi", available: true, value: Math.round(v * 10) / 10,
                signal, strength: clamp01(Math.abs(v - 50) / 30),
            });
        }
    }

    // ── MACD: line vs signal + zero line ──
    {
        const line = last(macdS.line), sig = last(macdS.signal);
        if (line === null || sig === null) readings.push(na("macd"));
        else {
            const above = line > sig;
            const signal: TechnicalSignal = above
                ? (line > 0 ? "bullish" : "neutral")
                : (line < 0 ? "bearish" : "neutral");
            // Normalize gap by price so strength is comparable across assets.
            const gap = Math.abs(line - sig) / (price || 1);
            readings.push({
                id: "macd", available: true, value: Math.round(line * 10000) / 10000,
                signal: above && line <= 0 ? "bullish" : signal, // cross below zero = early bullish
                strength: clamp01(gap / 0.01),
                extra: { signalLine: sig, histogram: line - sig },
            });
        }
    }

    // ── MACD histogram slope (5 sessions) ──
    {
        const tail = macdS.histogram.slice(-5).filter((v): v is number => v !== null);
        if (tail.length < 5) readings.push(na("macd_momentum"));
        else {
            const s = slope(tail);
            const norm = Math.abs(s) / (price * 0.001 || 1);
            readings.push({
                id: "macd_momentum", available: true, value: Math.round(s * 10000) / 10000,
                signal: s > 0 ? "bullish" : s < 0 ? "bearish" : "neutral",
                strength: clamp01(norm),
            });
        }
    }

    // ── Bollinger %B ──
    {
        const pb = last(boll.percentB);
        if (pb === null) readings.push(na("bollinger"));
        else {
            let signal: TechnicalSignal = "neutral";
            if (pb > 1) signal = "bearish";       // overextended above the band
            else if (pb < 0) signal = "bullish";  // overextended below
            readings.push({
                id: "bollinger", available: true, value: Math.round(pb * 100) / 100,
                signal, strength: signal === "neutral" ? 0 : clamp01(Math.abs(pb - 0.5) - 0.5),
            });
        }
    }

    // ── Squeeze: bandwidth in the bottom decile of the last 120 sessions ──
    {
        const bwSeries = boll.bandwidth.slice(-120).filter((v): v is number => v !== null);
        const bw = last(boll.bandwidth);
        if (bw === null || bwSeries.length < 60) readings.push(na("squeeze"));
        else {
            const sorted = [...bwSeries].sort((a, b) => a - b);
            const decile = sorted[Math.floor(sorted.length * 0.1)];
            const inSqueeze = bw <= decile;
            // A squeeze signals imminent movement, NOT its direction — honesty.
            readings.push({
                id: "squeeze", available: true, value: Math.round(bw * 1000) / 1000,
                signal: "neutral", strength: inSqueeze ? 0.7 : 0,
                extra: { inSqueeze: inSqueeze ? 1 : 0 },
            });
        }
    }

    // ── Stochastic ──
    {
        const st = hasOHLC ? stochastic(candles) : null;
        if (!st) readings.push(na("stochastic"));
        else {
            const k = last(st.k), d = last(st.d);
            if (k === null || d === null) readings.push(na("stochastic"));
            else {
                let signal: TechnicalSignal = "neutral";
                if (k < 20 && k > d) signal = "bullish";
                else if (k > 80 && k < d) signal = "bearish";
                readings.push({
                    id: "stochastic", available: true, value: Math.round(k * 10) / 10,
                    signal, strength: signal === "neutral" ? 0 : clamp01(Math.abs(k - 50) / 40),
                    extra: { d },
                });
            }
        }
    }

    // ── OBV vs price ──
    {
        const obvS = hasVolume ? obv(candles) : null;
        if (!obvS || n < 80) readings.push(na("obv"));
        else {
            const win = 60;
            const obvTail = obvS.slice(-win) as number[];
            const priceTail = closes.slice(-win);
            // Compare normalized slopes: volume confirming or diverging.
            const so = slope(obvTail) / (Math.abs(obvTail[0]) + 1);
            const sp = slope(priceTail) / (priceTail[0] || 1);
            let signal: TechnicalSignal = "neutral";
            if (sp > 0 && so > 0) signal = "bullish";        // volume confirms rise
            else if (sp < 0 && so < 0) signal = "bearish";   // volume confirms fall
            else if (sp > 0 && so < 0) signal = "bearish";   // rise without volume
            else if (sp < 0 && so > 0) signal = "bullish";   // accumulation on dip
            readings.push({
                id: "obv", available: true, value: null,
                signal, strength: signal === "neutral" ? 0 : 0.5,
                extra: { priceSlope: sp, obvSlope: so },
            });
        }
    }

    // ── Recent volume vs 20d average ──
    {
        if (!hasVolume || n < 25) readings.push(na("volume_trend"));
        else {
            const vols = candles.map((c) => c.volume as number);
            const avg20 = vols.slice(-25, -5).reduce((s, v) => s + v, 0) / 20;
            const recent = vols.slice(-5).reduce((s, v) => s + v, 0) / 5;
            const ratio = avg20 > 0 ? recent / avg20 : 1;
            const dir = closes[n - 1] >= closes[n - 6] ? 1 : -1;
            readings.push({
                id: "volume_trend", available: true, value: Math.round(ratio * 100) / 100,
                // Rising volume amplifies whatever the price is doing.
                signal: ratio > 1.3 ? (dir > 0 ? "bullish" : "bearish") : "neutral",
                strength: ratio > 1.3 ? clamp01((ratio - 1) / 1.5) : 0,
            });
        }
    }

    // ── ADX ──
    {
        const a = adxS ? last(adxS.adx) : null;
        if (a === null || !adxS) readings.push(na("adx"));
        else {
            const p = last(adxS.plusDI) ?? 0;
            const m = last(adxS.minusDI) ?? 0;
            const trending = a >= 20;
            readings.push({
                id: "adx", available: true, value: Math.round(a * 10) / 10,
                signal: !trending ? "neutral" : p > m ? "bullish" : "bearish",
                strength: trending ? clamp01((a - 20) / 30) : 0,
                extra: { plusDI: p, minusDI: m },
            });
        }
    }

    // ── ATR% (volatility regime, informative) ──
    {
        const atrS = hasOHLC ? atr(candles) : null;
        const a = atrS ? last(atrS) : null;
        if (a === null) readings.push(na("atr"));
        else {
            readings.push({
                id: "atr", available: true,
                value: Math.round((a / price) * 1000) / 10, // ATR as % of price
                signal: "neutral", strength: 0,
            });
        }
    }

    // ── RSI divergence ──
    {
        if (n < 60) readings.push(na("divergence"));
        else {
            const div = rsiDivergence(candles, rsiS);
            readings.push({
                id: "divergence", available: true, value: null,
                signal: div === "bullish" ? "bullish" : div === "bearish" ? "bearish" : "neutral",
                strength: div ? 0.7 : 0,
            });
        }
    }

    return {
        readings,
        levels: supportResistance(candles),
        quality: { candles: n, hasOHLC, hasVolume, syntheticOpen },
    };
}
