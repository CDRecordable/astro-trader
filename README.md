# Astro Trader

Aplicación de análisis financiero que combina datos de mercado (acciones y criptomonedas) con indicadores astrológicos y cósmicos — fases lunares, retrogradaciones de Mercurio, actividad solar — para generar puntuaciones y recomendaciones.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**, Framer Motion, ECharts
- **Zustand** (estado global)
- **PostgreSQL (Neon)** + **Drizzle ORM**
- **Yahoo Finance2** (datos bursátiles) + **CoinGecko** (cripto)
- **next-intl** (ES / EN)

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# editar .env.local con tus credenciales

# 3. Aplicar schema de base de datos
npx drizzle-kit push

# 4. Arrancar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de PostgreSQL (Neon) |
| `FMP_API_KEY` | API key de Financial Modeling Prep (legacy — en migración a Yahoo Finance) |

## Estructura

```
src/
├── app/          # Rutas Next.js (explorer, screener, macro, crypto)
├── components/   # Componentes React
├── lib/
│   ├── api/      # Clientes Yahoo Finance, CoinGecko
│   ├── *-data.ts # Datos lunares, solares, mercurianos
│   ├── algorithm.ts, crypto-algorithm.ts, macro-algorithm.ts
│   └── cosmic-fluidity.ts
├── db/           # Schema Drizzle
└── messages/     # i18n
```

## Análisis incluidos

- **Screener de acciones** con puntuación multi-factor (valuation, trend, timing, cosmic)
- **Crypto screener** con scoring tokenómico
- **Ciclos lunares** — fases y energía de mercado
- **Mercurio retrógrado** — períodos de volatilidad teórica
- **Actividad solar**
- **Turbulence index** — índice macro agregado
- **Fibonacci confluence**
- **Rotación sectorial**

## Scripts

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir build |
| `npm run lint` | ESLint |
