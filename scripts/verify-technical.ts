// ============================================================
// Verification suite for the technical-indicator math
// ============================================================
// Run with:  npm run verify:ta
// Checks the implementations against known vectors (Wilder's classic RSI
// series, hand-computed Bollinger/EMA/ATR) and the honesty edges (no OHLC →
// null, constant series → 50, tiny history → neutral score). If you touch
// src/lib/technical.ts, this must stay green.

import { sma, ema, rsi, macd, bollinger, stochastic, atr, adx, obv, syntheticCandles, computeSnapshot, type Candle } from "../src/lib/technical";
import { computeTechnicalScore } from "../src/lib/technical-score";

let fails = 0;
const check = (label: string, got: number | null | undefined, want: number | null, tol = 0.01) => {
    const ok = (got === null || got === undefined || want === null) ? got === want : Math.abs(got - want) <= tol;
    if (!ok) fails++;
    console.log((ok ? "ok  " : "FAIL") + "  " + label.padEnd(58) + String(got) + (ok ? "" : "  <> esperado " + want));
};
const checkBool = (label: string, got: boolean) => {
    if (!got) fails++;
    console.log((got ? "ok  " : "FAIL") + "  " + label);
};

// ── 1. RSI(14): serie clásica de Wilder (Cardwell/StockCharts) ──
// Cierres de referencia usados por la doc de StockCharts; RSI14 esperado
// 70.53 en la barra 14 y 66.32 en la 15 (tolerancia 0.05).
// Serie original de StockCharts a 4 decimales (redondearla a 2 desplaza ~0.07)
const wilder = [44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955,
    45.4245, 45.8433, 46.0826, 45.8931, 46.0328, 45.6140, 46.2820, 46.2820,
    46.0028, 46.0328, 46.4116, 46.2222, 45.6439, 46.2122, 46.2521, 45.7137,
    46.4515, 45.7835, 45.3548, 44.0288, 44.1783, 44.2181, 44.5672, 43.4205,
    42.6628, 43.1314];
const r = rsi(wilder, 14);
check("RSI14 Wilder barra 14", r[14], 70.53, 0.05);
check("RSI14 Wilder barra 15", r[15], 66.32, 0.05);
check("RSI14 warm-up es null", r[13], null);

// ── 2. RSI serie constante → 50, nunca NaN ──
const flat = new Array(30).fill(100);
const rFlat = rsi(flat, 14);
check("RSI serie constante = 50", rFlat[20], 50);
checkBool("RSI sin NaN", rFlat.every(v => v === null || !Number.isNaN(v)));

// ── 3. SMA / EMA a mano ──
check("SMA3 de [1..5] en i=2", sma([1,2,3,4,5],3)[2], 2);
check("SMA3 de [1..5] en i=4", sma([1,2,3,4,5],3)[4], 4);
// EMA(3) sobre [2,4,6,8,10]: seed=SMA3=4; k=0.5; i3: 8*.5+4*.5=6; i4: 10*.5+6*.5=8
const e = ema([2,4,6,8,10],3);
check("EMA3 seed=SMA en i=2", e[2], 4);
check("EMA3 en i=3", e[3], 6);
check("EMA3 en i=4", e[4], 8);

// ── 4. Bollinger(5,2) a mano ──
// serie [1,2,3,4,5]: media=3, var poblacional=2, sd=1.4142
const b = bollinger([1,2,3,4,5], 5, 2);
check("BB middle", b.middle[4], 3);
check("BB upper = 3+2*1.41421", b.upper[4], 3 + 2*Math.SQRT2, 0.0001);
check("BB %B con close=5", b.percentB[4], (5-(3-2*Math.SQRT2))/(4*Math.SQRT2), 0.0001);

// ── 5. MACD: histogram = line - signal en TODA la serie ──
const closes = Array.from({length: 120}, (_, i) => 100 + Math.sin(i/7)*10 + i*0.1);
const m = macd(closes);
let coherent = true;
for (let i = 0; i < closes.length; i++) {
    if (m.histogram[i] !== null) {
        if (Math.abs((m.line[i]! - m.signal[i]!) - m.histogram[i]!) > 1e-9) coherent = false;
    }
}
checkBool("MACD histogram == line - signal (toda la serie)", coherent);
checkBool("MACD signal empieza tras line", m.signal.findIndex(v=>v!==null) >= m.line.findIndex(v=>v!==null));

// ── 6. ATR sobre velas redondas ──
// 16 velas: high=110, low=90, close=100 constantes → TR=20 siempre → ATR=20
const flatCandles: Candle[] = Array.from({length: 16}, (_, i) => ({
    date: `2024-01-${String(i+1).padStart(2,"0")}`, open: 100, high: 110, low: 90, close: 100, volume: 1000,
}));
const a = atr(flatCandles, 14);
check("ATR velas constantes = 20", a ? a[15] : null, 20, 0.0001);

// ── 7. Estocástico: precio en máximo del rango → K=100 ──
const rising: Candle[] = Array.from({length: 20}, (_, i) => ({
    date: `2024-02-${String(i+1).padStart(2,"0")}`, open: 100+i, high: 101+i, low: 99+i, close: 101+i, volume: 1000,
}));
const st = stochastic(rising)!;
const lastK = st.k.filter(v=>v!==null).pop();
check("Estocástico K≈100 en subida al máximo", lastK ?? null, 100, 0.5);

// ── 8. Velas sin high/low → stochastic/atr/adx = null ──
const noHL: Candle[] = Array.from({length: 250}, (_, i) => ({
    date: new Date(2023,0,i+1).toISOString().slice(0,10), close: 100 + Math.sin(i/9)*8,
}));
checkBool("stochastic null sin OHLC", stochastic(noHL) === null);
checkBool("atr null sin OHLC", atr(noHL) === null);
checkBool("adx null sin OHLC", adx(noHL) === null);
checkBool("obv null sin volumen", obv(noHL) === null);

// ── 9. syntheticCandles ──
const sc = syntheticCandles([[Date.UTC(2024,0,1), 10],[Date.UTC(2024,0,2), 12],[Date.UTC(2024,0,3), 11]],
                            [[Date.UTC(2024,0,2), 500]]);
check("synthetic: open = close anterior", sc[1].open ?? null, 10);
check("synthetic: volumen mapeado por día", sc[1].volume ?? null, 500);
checkBool("synthetic: sin high/low", sc.every(c => c.high === undefined && c.low === undefined));

// ── 10. Snapshot + score: casos borde ──
const tiny = noHL.slice(0, 5);
const tinyScore = computeTechnicalScore(tiny);
check("5 velas → score neutro 50", tinyScore.score, 50, 1);
checkBool("5 velas → cobertura ≈ 0", tinyScore.pillars.trend.coverage < 0.15);

// Serie con tendencia alcista clara y OHLCV completo → score > 50
const bull: Candle[] = Array.from({length: 300}, (_, i) => {
    const p = 100 * Math.pow(1.002, i) * (1 + Math.sin(i/11)*0.01);
    return { date: new Date(2023,0,i+1).toISOString().slice(0,10),
             open: p*0.995, high: p*1.01, low: p*0.99, close: p, volume: 1e6*(1+ i/300) };
});
const bullScore = computeTechnicalScore(bull);
checkBool(`tendencia alcista → score>55 (=${bullScore.score})`, bullScore.score > 55);
checkBool("cobertura completa con OHLCV", bullScore.pillars.trend.coverage === 1 && bullScore.pillars.volatility.coverage === 1);

// Cripto sintética (sin H/L): cobertura parcial visible, sin NaN
const cryptoScore = computeTechnicalScore(noHL.map((c,i)=>({ ...c, open: i? noHL[i-1].close: undefined, volume: 1e6 })));
checkBool(`cripto: momentum coverage < 1 (=${cryptoScore.pillars.momentum.coverage.toFixed(2)})`, cryptoScore.pillars.momentum.coverage < 1);
checkBool(`cripto: trend coverage >= 0.6 (=${cryptoScore.pillars.trend.coverage.toFixed(2)})`, cryptoScore.pillars.trend.coverage >= 0.6);
checkBool("score es entero 0-100", Number.isInteger(cryptoScore.score) && cryptoScore.score >= 0 && cryptoScore.score <= 100);

// Snapshot nunca NaN
const snap = computeSnapshot(bull);
checkBool("snapshot sin NaN en values", snap.readings.every(x => x.value === null || Number.isFinite(x.value)));
checkBool("S/R: soportes < precio < resistencias", snap.levels.supports.every(s => s < bull[bull.length-1].close) && snap.levels.resistances.every(x => x > bull[bull.length-1].close));

console.log(fails === 0 ? "\nTODO OK" : `\n${fails} FALLOS`);
process.exit(fails ? 1 : 0);
