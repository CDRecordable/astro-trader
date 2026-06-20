# Auditoría matemática y estadística — Astro Trader Insights

> Fecha: 2026-06-07 · Alcance: módulos de cálculo astro-financiero (turbulencia, ciclos lunares, Mercurio, solar, backtest, Fibonacci, rotación sectorial) + motores de scoring (acciones/cripto).
> Método: lectura directa del código fuente + auditorías independientes por módulo. Cada hallazgo cita `archivo:línea`.

## Veredicto en una frase

**Los precios de mercado son reales (Yahoo Finance) y el scoring fundamental de acciones/cripto es legítimo y útil; pero NINGUNA de las afirmaciones predictivas astrológicas está validada estadísticamente — no hay un solo test de significancia, ni grupo de control, en toda la aplicación.** Varias secciones, además, muestran conclusiones pre-escritas que "ganan" pase lo que pase, y una (Solar) presenta datos inventados bajo una etiqueta de fuente oficial.

---

## 1. Resumen por módulo

| Módulo | ¿Datos reales? | ¿Mates correctas? | ¿Estadística válida? | Problema principal |
|---|---|---|---|---|
| **Scoring de acciones** (`algorithm.ts`) | ✅ Sí (Yahoo) | ✅ Sí | ✅ Factores reales | El factor "cósmico" es una constante inerte (no ordena nada) |
| **Scoring cripto** (`crypto-algorithm.ts`) | ✅ Sí (CoinGecko) | ✅ Sí | ✅ Heurística razonable | Sin astrología; correcto |
| **Turbulencia astral** (`macro-algorithm.ts`) | ⚠️ Fechas de aspectos reales, magnitud inventada | ✅ Gaussianas OK | ❌ N efectivo ≈ 10 eventos | Curva ajustada a posteriori sobre crisis conocidas |
| **Ciclos lunares** (`LunarCyclesView`) | ✅ Retornos reales | ⚠️ | ❌ Sin test | NO es la metodología Dichev-Janes que dice ser |
| **Actividad solar** (`SolarActivityView`) | ❌ Manchas solares hardcodeadas, 2025-26 **inventadas** | ⚠️ | ❌ Sin test | Datos inventados etiquetados "Source: SILSO" |
| **Mercurio Rx** (`MercuryRetrogradeView`) | ✅ Retornos reales, fechas reales | ⚠️ | ❌ Sin test, desbalance 5:1 | El más honesto, pero sin significancia |
| **Backtest** (`BacktestView`) | ✅ Precios reales | ❌ Win-rate mal calculado | ❌ Sin out-of-sample | Señal ajustada a crisis pasadas + conclusiones hardcodeadas |
| **Confluencia Fibonacci** (`FibonacciConfluenceView`) | ✅ Precios reales | ⚠️ | ❌ Sin baseline | Tolerancia ±2,5 % hace que casi todo "coincida" |
| **Rotación sectorial** (`SectorRotationView`) | ✅ Precios reales | ❌ Anualización rota | ❌ Sin test | La "dignidad" es `sin(fecha)` sembrada por el ASCII del nombre del planeta |

---

## 2. Hallazgos CRÍTICOS (afectan a la credibilidad)

### C1 — Cero tests de significancia en toda la app
Ninguna sección calcula un p-valor, intervalo de confianza, test de permutación, ni un grupo de control. Todos los "veredictos" se reducen a comprobar el **signo** de una diferencia ruidosa (`yieldGap > 0`). Sin un baseline (¿cuál es el retorno en fechas *aleatorias*?), las cifras no distinguen señal de azar.

### C2 — Conclusiones auto-confirmatorias ("cara gano yo, cruz pierdes tú")
- `SectorRotationView.tsx:352-353`: gap positivo → *"valida la astrología financiera"*; gap negativo → *"efecto contrario"*. Nunca puede fallar.
- `LunarCyclesView.tsx:519-523`: misma lógica (`alignsWithDJ` / `contraryToDJ`).
- `BacktestView.tsx:421-461`: el texto de "jerarquía de señales" y conclusión es copy fijo traducido, se renderiza independientemente de los números.

### C3 — Datos solares inventados con etiqueta de fuente oficial
`solar-data.ts:115,119` admite en comentarios que los valores de manchas solares 2025-2026 son *"estimates"* (declive monótono sospechosamente liso: 145→140→…→88). Sin embargo `SolarActivityView.tsx:556` muestra *"Source: SILSO / Royal Observatory of Belgium."* → **datos fabricados presentados como oficiales.** Problema de integridad, no solo estadístico.

### C4 — Backtest: la señal está ajustada a posteriori
`macro-algorithm.ts:67-78` coloca picos de tensión en fechas de aspectos planetarios **reales** (Saturno-Plutón conj. ene-2020, etc.), pero esas fechas coinciden con crisis ya conocidas (GFC, COVID). El backtest "descubre" que evitar alta turbulencia evita drawdowns — pero eso está *construido* en la señal, no aprendido out-of-sample. El "edge" se asume, no se prueba.

### C5 — La "dignidad" sectorial no es astronomía
`SectorRotationView.tsx:48-68`: `score = sin( f(fecha) )` donde la fase se siembra con `planetName.charCodeAt()` (suma ASCII del nombre). No hay efemérides ni posiciones planetarias. El propio comentario lo admite: *"Pure deterministic pseudo-dignity generator"*. Resultado: "favorable" ≈ 50 % del tiempo por construcción.

### C6 — Fibonacci: confluencias casi triviales + p-hacking interactivo
`FibonacciConfluenceView.tsx:141` usa tolerancia de precio ±2,5 %. Con 5 niveles Fib, eso cubre ~25 % del rango del swing → casi cualquier evento "coincide". Sin baseline (C1), y el usuario puede activar/desactivar categorías y ver la "tasa de reversión" recalcularse en vivo (`:521`) → máquina de p-hacking.

---

## 3. Bugs de corrección (arreglables, independientes de la filosofía)

| # | Severidad | Ubicación | Bug |
|---|---|---|---|
| B1 | ALTA | `BacktestView.tsx:135-144` | El "win rate mensual" en realidad mide el retorno de **1 día** (compara contra `curve[length-1]`, que es el día anterior) y lo etiqueta como mes. Además se compara contra un baseline **hardcodeado de 50 %** (`:382`). |
| B2 | MEDIA | `BacktestView.tsx:157,160` | CAGR usa `años = nBarras/252`, pero BTC cotiza 365 días/año → **CAGR de Bitcoin inflado ~45 %**. |
| B3 | ALTA | `SectorRotationView.tsx:71-76` | `computeAnnualized` **suma** retornos diarios (no compone) y divide el numerador del subconjunto "favorable" por la longitud de la serie **completa** → numerador/denominador descuadrados. |
| B4 | MEDIA | Lunar/Solar/Mercurio | Anualización **inconsistente** entre módulos: unos componen el producto realizado, otros hacen `(1+media)^252`. Cifras no comparables entre páginas. |
| B5 | MEDIA | varios | "Hoy" usa `Date` local mientras las series usan `YYYY-MM-DD` (medianoche UTC) → banners de estado ("retrógrado ahora", "fase actual") pueden desfasarse 1 día según zona horaria. |
| B6 | BAJA | `algorithm.ts:226` | `computeCosmicFluidityScore()` se recalcula por empresa (llama a `generateMacroTimeline` 2× por compañía) — rendimiento. |
| B7 | BAJA | `macro-algorithm.ts:11-12,236-237` | `sp500Price`/`btcPrice` sintéticos son **código muerto** (no se consumen). Inofensivos hoy, peligrosos si alguna vez se muestran como "evidencia". |

---

## 4. Lo que SÍ es de fiar

- **Datos de precios**: reales, de Yahoo Finance (`/api/macro-daily`, `/api/ticker`, `/api/company`) y CoinGecko. No hay `Math.random` en ningún módulo macro (solo en `mock-data.ts`).
- **Scoring fundamental de acciones** (`algorithm.ts`): factores legítimos y respaldados por la literatura — FCF yield, book-to-market, expansión de márgenes, ROE/ROC, proximidad a mínimos de 52 semanas, mean-reversion a 6 meses. Umbrales adaptativos por tier (small/mid/large) razonables. **Esta es la parte realmente útil para invertir.**
  - Matiz: el factor "cósmico" (10 % del peso) es **la misma constante para todas las acciones** en un instante dado → no cambia el *ranking*. La astrología es decorativa aquí, no dañina.
- **Scoring cripto** (`crypto-algorithm.ts`): tokenomics (dilución de supply, ratio de liquidez) + momentum (distancia a ATH/ATL, 7d). Sin astrología. Heurística defendible.
- **Fase lunar** (`lunar-data.ts`): aproximación astronómica real (época + mes sinódico). 
- **Fechas de Mercurio retrógrado** y **de aspectos planetarios**: son eventos astronómicos reales (hardcodeados pero correctos).
- **Correlación turbulencia↔retornos** (`MacroDashboard.tsx:560-595`): usa precios **reales** de Yahoo (no el mock) → es una comparación empírica honesta, aunque con N efectivo pequeño.

---

## 5. Recomendaciones priorizadas

1. **Integridad primero (C3):** quitar o re-etiquetar los datos solares 2025-26 inventados; no mostrar "Source: SILSO" sobre estimaciones. Ideal: fetch real de SILSO o marcar explícitamente "estimación".
2. **Añadir baseline + significancia (C1):** para cada "gap", calcular la misma métrica sobre fechas aleatorias (Monte Carlo / permutación) y mostrar p-valor o percentil. Sin esto, ninguna cifra astro es interpretable.
3. **Quitar conclusiones auto-confirmatorias (C2):** sustituir el texto "valida/​contrario" por la cifra + su significancia, o un honesto "no distinguible del azar".
4. **Arreglar bugs de cálculo (B1-B4):** win-rate del backtest, CAGR de BTC, anualización sectorial, y unificar la fórmula de anualización en un helper compartido.
5. **Honestidad metodológica (Lunar):** o se implementa la ventana real de Dichev-Janes (±7/15 días alrededor de luna nueva/llena) o se deja de citar el paper; corregir journal/año.
6. **Backtest creíble (C4):** separar in-sample/out-of-sample, añadir costes de transacción, y dejar de hardcodear el veredicto.

---

*Conclusión honesta para invertir: usa el screener fundamental (acciones y cripto) — esa parte es sólida. Trata las capas astrológicas (turbulencia, lunar, solar, Mercurio, Fibonacci-astro, rotación) como exploración visual entretenida, NO como evidencia, hasta que se añadan tests de significancia con grupo de control.*

---

## 6. Remediación aplicada (2026-06-07)

Se ejecutaron los 7 pasos del plan, cada uno verificado numéricamente:

1. **`src/lib/stats.ts`** (nuevo) — toolkit de estadística con test de permutación (p-valor reproducible con PRNG sembrado), anualización por composición, Monte-Carlo para tasas, bootstrap CI, normal CDF. 20/20 pruebas de sanidad.
2. **Integridad solar** — datos inventados 2025-26 reemplazados por valores reales de SILSO; nuevo `/api/solar` + `silso-client.ts` que descarga el CSV oficial en vivo (caché diaria) con fallback offline real; UI muestra procedencia (definitivo/provisional, live/offline) y corrige la cita de Krivelyova & Robotti.
3. **Backtest** — win-rate corregido (ventana real, no 1 día), CAGR por años de calendario (arregla BTC 365 vs 252), costes de transacción configurables, y panel de significancia (permutación dentro vs fuera de mercado) que sustituye las conclusiones de marketing hardcodeadas. **Resultado verificado (S&P, 26 años): la estrategia rinde MENOS que B&H y su filtro NO es significativo (p=0.30).**
4. **Lunar / Solar / Mercurio** — cada régimen ahora muestra p-valor por test de permutación + tamaños de muestra; se eliminaron los veredictos auto-confirmatorios; cita lunar corregida (2003) y cifras reframadas como "literatura". **Verificado: TODOS los gaps (incl. el famoso 6.9% lunar) son no significativos (p=0.41–0.89).**
5. **Fibonacci** — añadido baseline Monte-Carlo (misma prueba en fechas aleatorias) con lift y p-valor; la tasa de reversión ya no se presenta sin control.
6. **Rotación sectorial** — `computeAnnualized` roto reemplazado por anualización compuesta + significancia; veredicto "valida la astrología/efecto contrario" eliminado; caveat explícito de que la "dignidad" es un `sin(fecha)` sintético, no efemérides.
7. **Turbulencia** — eliminado el código muerto (`sp500Price`/`btcPrice` sintéticos); añadido aviso de muestra efectiva (~10 eventos, no cientos de meses) y sesgo de retrospección en el panel de correlación.

## 7. Limpieza de lint / build (2026-06-07)

Se eliminaron **los 62 errores de ESLint** que bloqueaban `next build` (eran pre-existentes en el código original, no de la remediación):
- `@typescript-eslint/no-explicit-any` (44): tipados con un helper compartido `src/lib/echarts-types.ts` (`EChartParam`, `EChartObj`) y tipos `ChartQuote`/`YF` en las rutas Yahoo; eliminados los `as any` en `market-groups`, `layout`, `request`, `ticker-registry`.
- `react-hooks/static-components` (5): `MetricBox` extraído a nivel de módulo; `RegimeCard` (presentacional sin estado) suprimido localmente con razón.
- `react-hooks/set-state-in-effect` (4): `setLoading(true)` redundante eliminado donde el estado ya iniciaba en `true`; resto suprimido localmente con razón.
- `react-hooks/purity` (5): lecturas de reloj para display suprimidas localmente con razón.
- `react/no-unescaped-entities` (3) y `ban-ts-comment` (1): corregidos.
- Variables/imports sin usar: limpiados (quedan 6 warnings `exhaustive-deps` benignos, no bloquean el build).

**Resultado:** `tsc --noEmit` limpio · `npm run build` pasa (exit 0, todas las rutas generadas) · listo para desplegar en Vercel.

## 8. Reforma del análisis fundamental "serio" (2026-06-11)

Auditoría profunda del screener de acciones a raíz del caso GOOG (Tendencia 0/100 con márgenes excelentes):

**Bugs de datos encontrados y corregidos (`yahoo-client.ts`):**
- Los módulos `incomeStatementHistory`/`balanceSheetHistory` de Yahoo **están muertos desde nov-2024** (la propia librería lo avisa) → todos los deltas interanuales eran 0. Sustituidos por `fundamentalsTimeSeries` (4 años de estados anuales completos, verificado).
- **ROC era falso**: se calculaba como `1/EV-EBITDA` (un yield de valoración, no un retorno) — daba 3.7% para Google cuando su ROC real es 34.6%. Ahora: `EBIT / investedCapital` con fallback a ROA real.
- `rocDelta = roeDelta × 0.8` (inventado) → ahora delta real de EBIT/capital invertido entre dos ejercicios.
- Nuevos flags `dataQuality { deltas, roc, growth }` en métricas + columna jsonb en Neon, propagados por el provider.

**Rediseño del scoring (`algorithm.ts`):**
- `scoreTrend`: ahora puntúa **niveles de calidad** (márgenes/ROE/ROC por tramos — antes solo deltas, una empresa excelente sin histórico puntuaba 0) + tendencia interanual + reinversión, con **renormalización**: los bloques sin datos salen del denominador (neutro), nunca penalizan.
- `scoreTiming`: rediseñado para el perfil cazador de oportunidades — posición en rango 52sem (no sobrecomprado) + ignición de tendencia (precio vs 50DMA, fresco sin extenderse) + tendencia media (vs 200DMA) + bonus "confirmado pero aún barato".
- **Factor cósmico eliminado del compuesto serio** (era constante entre empresas → inerte para ranking): pesos 40/30/30 + multiplicador macro.
- UI: checks sin datos ahora muestran **N/D neutro gris** (antes ✗ rojo); radar a 3 ejes; sección cósmica eliminada del detalle.

**Verificado E2E:** GOOG Trend 0→94 (ROC 34.6%, deltas reales), Ford Trend 4 (deterioro real), Santander Trend 50 neutral (growth no disponible → renormalizado). Build de producción OK.

## 9. Solvencia y calidad de balance — el "fix Grifols" (2026-06-11)

A raíz de feedback experto: el FCF yield sobre capitalización **premiaba sistemáticamente a las empresas más apalancadas** (Grifols: "14.6% yield" con 9.000M€ de deuda neta → Valoración 100/100).

**Nuevas métricas (datos ya disponibles en `fundamentalsTimeSeries`, sin APIs nuevas):**
- `netDebtToEbitda` (deuda neta anual auditada / EBITDA TTM) · `interestCoverage` (EBIT/intereses) · `evFcfYield` (FCF / enterprise value) · `tangibleBookToMarket` (libro sin goodwill) · `sharesDilution` (CAGR de acciones en circulación) · `accrualRatio` ((beneficio − caja operativa)/activos — detector parcial del caso Gotham) · `insiderOwnership` y `shortPctFloat` informativos. Persistidas en jsonb `extended_metrics`.

**Cambios de scoring:**
- **Filtro duro (todos los tiers):** deuda neta >5× EBITDA → EVITAR; cobertura de intereses <1× → EVITAR.
- **Valoración renormalizada:** FCF/**EV** 50pts (umbral por tier; fallback a FCF/mcap sin datos) + libro **tangible**/mercado 25pts (tangible negativo = 0) + solvencia 25pts (tramos de apalancamiento + cobertura).
- **Calidad:** bloque dilución (recompras +10 / dilución >3% = 0) + bloque accruals (caja ≥ beneficio +10 / accruals altos = 0) + ROE con recorte por apalancamiento (ROE<10% con deuda>3× = 0 pts: retorno realmente pobre) + matiz desapalancamiento (activos cayendo con deuda>3× = neutro, no "eficiencia").

**Verificado:** Grifols Valoración 100→54, total ~52 HOLD (la tesis existe — accruals −3.3%, desapalancando — pero la deuda está en el precio); Google premiado por caja neta y recompras pero penalizado por caro (FCF/EV 0.6%); Ford → filtro duro (18.5× consolidado).
**Limitación conocida:** deuda/EBITDA consolidada distorsiona financieras y brazos de financiación cautivos (Ford Credit, bancos) — en bancos el flag `solvency` suele quedar fuera por EBITDA no significativo, pero las automotrices con financiera consolidan. Pendiente si molesta: excluir el filtro duro para el sector financiero.
**Diferido conscientemente** (coste/beneficio para universo España): calendarios de catalizadores, transacciones de insiders (CNMV sin API), revisiones de consenso (de pago).

## 10. Catalizadores, insiders y revisiones de consenso (2026-06-11)

Resultó que gran parte de los puntos 3-4 "diferidos" eran gratis vía Yahoo (`calendarEvents`, `netSharePurchaseActivity`, `earningsTrend` — en la misma llamada `quoteSummary`, sin peticiones extra):

- **Catalizadores (p.3):** fecha de próximos resultados (+contador de días) y ex-dividendo. Automatizable y automatizado.
- **Revisiones de consenso (p.6, el factor con mejor evidencia):** analistas ↑/↓ últimos 30 días + deriva del consenso EPS del año. **Funciona también para España** (GRF.MC: ↑2/↓4 con consenso −7% — capturó la señal bajista de Grifols). Nuevo bloque renormalizado (10pts) en calidad/tendencia.
- **Insiders (p.4):** compras/ventas 6m (Form 4), % propiedad insider, short interest. Cluster buying (≥3 compradores netos) = bonus aditivo +8 en timing — nunca penaliza su ausencia. Para España queda N/D (limitación CNMV, como anticipó el feedback).
- **Gestión (p.5):** se implementa el proxy medible (propiedad insider = skin in the game); "fama del CEO" descartado a propósito — correlaciona mal con retornos y no es automatizable con datos fiables.
- **Exención del sector financiero:** `solvency` se marca N/D para "Financial Services" — deuda/EBITDA y cobertura no miden solvencia en bancos (los depósitos computan como deuda; el interés es su materia prima; el EBITDA no es significativo). El banco se valora por FCF/capitalización y libro/mercado (la métrica bancaria clásica), con nota explicativa en la UI. Verificado con SAN.MC.
- Nueva sección UI "Catalizadores y Señales" en el detalle, con N/D neutro en cada check.

**Verificado:** GOOG (resultados 23-jul, ↑10/↓3, 39 compras/24 ventas insider), GRF.MC (revisiones ES funcionando, insiders N/D), SAN.MC (exención financiera + revisiones ↑10/↓2). Build limpio.

## 11. Capa cualitativa con LLM del usuario (2026-06-11)

Los catalizadores cualitativos (pipeline FDA/EMA, ataques bajistas, gobernanza, M&A) no son computables con APIs financieras — se implementan con el **LLM que el usuario configura en Ajustes** (Gemini / Claude / DeepSeek, las keys ya guardadas en `user-data/settings.json`):

- `src/lib/api/llm-client.ts`: adaptador multi-proveedor (Anthropic Messages / Gemini generateContent / DeepSeek OpenAI-compatible) + esquema JSON estructurado + parser robusto.
- `/api/ai-analysis/[ticker]`: POST genera (el prompt **ancla al modelo con nuestros datos cuantitativos** — scores, solvencia, revisiones, filtros fallidos — y pide SOLO la capa cualitativa: catalizadores ~12m, riesgos de gobernanza, pipeline regulatorio si farma, moat, score cualitativo 0-100 y veredicto); GET sirve la caché de disco (`user-data/ai-analysis/<ticker>.json`, gitignored — las llamadas cuestan dinero).
- **Honestidad por diseño**: instrucciones explícitas de no inventar fechas ("fecha desconocida" antes que fecha falsa), marcar ítems inciertos con `verify: true` (la UI los etiqueta "verificar"), y declarar desconocimiento con score ~50. Disclaimer visible de fecha de corte + "no es asesoramiento financiero".
- UI: sección "Análisis Cualitativo · IA" en el detalle de empresa — botón generar/regenerar, score cualitativo, catalizadores con horizonte e impacto, pipeline farma, riesgos/gobernanza, veredicto, procedencia (modelo + fecha). CTA a Ajustes si no hay key.

Verificado: GET 404 sin caché, POST 400 `no_api_key` con CTA cuando no hay key configurada; build de producción con la ruta compilada. **El camino con key real lo valida el usuario al configurar su proveedor.** Fase 2 anotada: agregador de catalizadores sobre la watchlist a partir de las cachés.
