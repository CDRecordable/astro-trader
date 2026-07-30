# Plan SEO — Astro Trader Insights

Arquitectura de contenidos del sitio público. El patrón (inspirado en sitios
producto tipo Golfmanager) es **una landing por función**, todas colgadas de un
mega-menú indexado: cada página ataca una intención de búsqueda distinta y
enlaza al resto, de modo que cualquier consulta relevante tiene una puerta de
entrada propia.

## Principios

1. **Una página = una intención de búsqueda.** Nada de páginas cajón de sastre.
2. **El registro `lib/site.ts` es la única fuente de verdad**: mega-menú, pie e
   `sitemap.xml` se generan de él. Una página nueva queda indexada al añadirla.
3. **Todo estático y en castellano.** El público inicial es el inversor
   particular hispanohablante; el inglés se añadirá como segunda locale cuando
   el contenido esté maduro.
4. **La honestidad es el ángulo diferencial.** En un nicho lleno de humo
   ("señales", "predicciones"), posicionarse como la herramienta que dice
   *cuándo algo no funciona* es a la vez marca y contenido enlazable.
5. **FAQ reales en cada landing** con datos estructurados (FAQPage), porque las
   preguntas long-tail («¿qué es el TER de un ETF?») son donde hay hueco.

## Mapa de páginas y palabras clave

> Los volúmenes exactos deben validarse con Search Console / Keyword Planner
> una vez el sitio esté desplegado; este mapa fija intención y jerarquía.

### Pilar 1 — Análisis fundamental (cyan)

| URL | Intención / keywords objetivo |
|---|---|
| `/acciones` | análisis fundamental de acciones, screener bolsa, FCF/EV, deuda EBITDA |
| `/cripto` | análisis fundamental criptomonedas, tokenomics, ballenas on-chain, TVL |
| `/etfs` | análisis ETF UCITS, TER, mejores ETFs indexados España |
| `/screener` | screener de acciones gratis, filtrar acciones por fundamentales |
| `/economia` | indicadores macroeconómicos hoy, inflación paro España Eurozona EEUU |
| `/vix` | índice VIX qué es, volatilidad mercado, VIX alto qué hacer |

### Pilar 2 — Herramientas de trabajo (emerald)

| URL | Intención / keywords objetivo |
|---|---|
| `/watchlist` | watchlist de acciones, lista de seguimiento bolsa, organizar inversiones |
| `/cartera` | cartera simulada, paper trading, simulador de inversión sin dinero real |
| `/ia` | análisis de acciones con IA, invertir con inteligencia artificial, BYO API key |

### Pilar 3 — Exploración esotérica (violet) ⭐ el contenido más enlazable

| URL | Intención / keywords objetivo |
|---|---|
| `/esoterico` (hub) | astrología financiera, análisis esotérico mercados |
| `/esoterico/turbulencia-astral` | aspectos planetarios mercados, Saturno Urano Plutón crisis |
| `/esoterico/ciclos-lunares` | luna llena bolsa, ciclos lunares mercado, Dichev Janes |
| `/esoterico/mercurio-retrogrado` | mercurio retrógrado bolsa, invertir mercurio retrógrado |
| `/esoterico/actividad-solar` | manchas solares mercados, ciclo solar economía |
| `/esoterico/rotacion-sectorial` | regentes planetarios sectores, astrología sectorial |
| `/esoterico/confluencia-fibonacci` | fibonacci trading, retrocesos fibonacci astrología |
| `/esoterico/backtester` | backtest estrategia astrológica, operar con las estrellas |

El pilar esotérico tiene el mayor potencial de enlaces y prensa: «medimos la
astrología financiera con tests de permutación y contamos el resultado» es una
historia que medios de divulgación y escépticos citan con gusto. Cada página
de dimensión termina con el veredicto estadístico real de la app.

### Soporte / conversión

| URL | Rol |
|---|---|
| `/` | home: demo interactiva + descarga |
| `/licencia` | portal de licencia (verificar / recuperar) |
| `/gracias` | post-compra (noindex) |

## Mega-menú

Cuatro columnas (Análisis · Herramientas · Esotérico · Empezar), cada entrada
con título + descripción de una línea. Las 7 dimensiones esotéricas se listan
anidadas bajo el hub para que el menú siga siendo legible. El pie repite el
índice completo como enlaces rastreables.

## Datos estructurados

- Home: `SoftwareApplication` con ofertas (0 € / 9,90 €).
- Cada landing: `FAQPage` con sus preguntas.
- Subpáginas esotéricas: `BreadcrumbList` (hub → dimensión).

## Backlog (cuando haya tracción)

- Locale `en` del sitio público.
- Fichas públicas pre-generadas de activos populares («análisis de NVIDIA»),
  regeneradas semanalmente desde snapshots — cientos de páginas long-tail.
- Glosario financiero (`/glosario/ter`, `/glosario/fcf-ev`…) reutilizando los
  tooltips didácticos que ya existen en la app.
- Comparativas («mejor ETF MSCI World: VWCE vs IWDA») desde el registro UCITS.
