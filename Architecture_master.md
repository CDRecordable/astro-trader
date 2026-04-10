# Astro Trader Insights — Architecture Master

## 1. Visión General (Overview)
**Astro Trader Insights** es una plataforma de inteligencia financiera diseñada para descubrir, analizar y monitorizar oportunidades de inversión en el mercado de valores estadounidense.
A diferencia de los screeners tradicionales que aplican filtros rígidos, Astro Trader utiliza un **algoritmo adaptativo por tiers (Small-Cap, Mid-Cap, Large-Cap)** que evalúa componentes de *Valuation*, *Trend*, *Timing* y *Macro*, asignando una puntuación del 0 al 100 y una recomendación (STRONG BUY, BUY, HOLD, AVOID).

## 2. Stack Tecnológico (Tech Stack)
- **Frontend / Framework:** Next.js 14+ (App Router), React 18
- **Estilos:** Tailwind CSS (Vanilla CSS para tokens core), Framer Motion (para animaciones glassmorphism fluidas)
- **Visualización de Datos:** Apache ECharts (`echarts-for-react`) para gráficos de alta densidad y líneas de tiempo.
- **Estado Global:** Zustand (`store.ts`) con soporte multi-activos (Stocks / Crypto).
- **Base de Datos:** PostgreSQL en Neon Serverless
- **ORM:** Drizzle ORM
- **Proveedores de Datos (APIs):**
  - **Yahoo Finance API (yahoo-finance2):** Datos en tiempo real de acciones e histórico de precios.
  - **Financial Modeling Prep (FMP):** Métricas fundamentales exactas de la SEC.
  - **CoinGecko API:** Abastecimiento masivo de activos digitales y tokenomics.
- **Despliegue Recomendado:** Vercel

## 3. Arquitectura de Datos (Data Flow)
El sistema utiliza una arquitectura de hidratación de datos en 3 capas para maximizar rendimiento y minimizar llamadas costosas o bloqueos de API:
1. **Neon Cache (Capa 1):** La base de datos local actúa como fuente primaria de verdad. Los datos se actualizan periódicamente.
2. **Yahoo Finance Bulk (Capa 2):** Se escanea masivamente (ej. componentes del S&P 500 o Russell 2000) de forma gratuita.
3. **FMP Enrichment (Capa 3 - The Refiner):** Cuando el algoritmo detecta una "joya" o un usuario solicita un screener profundo, se hace una única llamada de precisión a FMP para validar la salud financiera exacta.

## 4. Algoritmos de Valoración (Stock & Crypto)

### 4.1. Algoritmo Adaptativo por Tiers (Stocks)
El corazón de Astro Trader para el ecosistema tradicional es la función `evaluateCompany()`, que clasifica primero a la empresa por su capitalización de mercado (Market Cap Tier) para ajustar dinámicamente qué se le exige:
- **Large-Cap (> $50B):** Filtros relajados. Pueden tener Equity negativo debido a recompras (buybacks), siempre que su FCF sea positivo. Umbrales más bajos (FCF Yield ≥ 2%).
- **Mid-Cap ($2B – $50B):** Empresas en consolidación. Filtros moderados.
- **Small-Cap (< $2B):** Startups con alta volatilidad ("Hidden Gems"). Filtros muy estrictos: se exige Equity positivo y Beneficio Operativo absoluto. Umbrales altos (FCF Yield ≥ 5%, B/M ≥ 0.40).

**Sistema de Puntuación (100 puntos):**
1. **Valuation (40%):** Basado fundamentalmente en FCF Yield y Book-to-Market.
2. **Trend & Quality (30%):** Valora mejoras en márgenes de operación, ROE, ROC y Eficiencia de Reinversión.
3. **Timing (20%):** Valora oportunidades de entrada (cercanía a mínimos, Momentum 1M, estabilización a 6M).
4. **Macro Adjustment (10%):** Multiplicador basado en la tendencia de tipos de interés (Federal Funds Rate).

### 4.2. Algoritmo Cripto-Nativo (Digital Assets)
Debido a que las criptomonedas no poseen FCF o Equity, el sistema cuenta con un motor algorítmico independiente de 100 puntos:
1. **Tokenomics (50%):** Penaliza la dilución inflacionaria (Supply Dilution = Circulating / Max Supply) y premia los altos ratios de liquidez (24h Vol / MCap) para detectar manipulación ("Ghost Chains").
2. **Momentum (50%):** Evalúa la distancia a Máximos Históricos (ATH) como oportunidad de rebote, proximidad a Mínimos (ATL) como riesgo de quiebra estructural, y Momentum a 7 días.

## 5. Módulos y Navegación (Frontend Architecture)
La navegación se centraliza a través de un `Sidebar` gestionado por `activeSection` en el store global:

- **1. Macro Dashboard (`MacroDashboard.tsx`):**
  - La nueva página de entrada o vista principal de la plataforma.
  - Cuenta con un "Índice de Turbulencia Astrológica" generado mediante interpolación gaussiana interactiva de alineaciones planetarias pesadas (Saturno-Urano, etc).
  - Incluye una base de datos local (`geo-events.ts`) de eventos geopolíticos históricos pineables sobre el gráfico Echarts (COVID Crash, Lehman Brothers), con una capa de superposición del S&P 500 para evidenciar correlaciones.
- **2. Explorer (`Dashboard.tsx`):**
  - Escáner principal que coexiste en dos mundos: TradFi y Crypto. Conmutado mediante la variable `assetClass`. Renderiza dinámicamente el `MarketSelector` asociado.
  - El escáner principal donde coexisten datos Mock y Live.
  - Renderiza una matriz de tarjetas (`CompanyCard.tsx`) categorizadas y agrupadas visualmente en subsecciones según Tier (Large-Cap, Mid-Cap, Small-Cap).
  - Incluye un buscador reactivo y sliders para imponer hard-filters visuales.
- **2. Screener (`ScreenerView.tsx`):**
  - Módulo de análisis "On-Demand".
  - Permite al usuario introducir el Ticker de una compañía. Se consulta a las APIs (Yahoo + FMP) en tiempo real, el algoritmo la puntúa, y el resultado de la sesión queda cacheado temporalmente en pantalla.
- **3. Watchlist (Próximamente):** Guardado persistente de las "joyas" detectadas.
- **4. Wiki (`WikiView.tsx`):**
  - Hub educacional. Secciones auto-desplegables que desmitifican las capas de complejidad.
  - Explica las métricas, las fórmulas y detalla el significado de los filtros de capitalización para promover una cultura de inversión informada.
- **5. Detalle de Compañía (`CompanyDetail.tsx`):**
  - Panel deslizante inmersivo para el desglose del Score, mostrando la puntuación poligonal (Gráfico Radar) y los sub-componentes desglosados (Trend variables, Valuaciones financieras y gráfico de precios a 12 meses).

- **6. Detalle Específico de Criptomonedas (`CryptoDetail.tsx`):**
  - Panel deslizante alternativo diseñado exclusivamente para desglosar métricas on-chain (Tokenomics, Liquidity Ratio, Supply Caps) cuando el `assetClass` está configurado en "crypto".

## 6. Manejo de Estado (Store)
El patrón de Zustand de `store.ts` maneja:
- El toggle global de capa de activos (`assetClass: "stocks" | "crypto"`), que recicla componentes y enruta la API inteligentemente.
- La lista de compañías/monedas analizadas (`companies`).
- Los resultados pre-calculados (`scores`).
- Configuración de filtros UI y control asíncrono (loading states, mock vs live sources).

## 7. Próximos Pasos (Roadmap)
- Implementar **Watchlist persistente** para que los usuarios guardados por Supabase/NextAuth puedan conservar sus hallazgos y portafolios on-chain.
- Refinar la base de eventos geopolíticos (`geo-events.ts`) incorporando variables de correlación algorítmica automáticas vía ML.
