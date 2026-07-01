# Astro Trader Insights

An investing copilot that fuses **serious fundamental analysis** of stocks and crypto with an **esoteric exploration** mode — in one app, with a hard commitment to statistical honesty.

The app has two instances:

- **📈 Serious Analysis** — fundamental scoring for stocks and a dedicated crypto analyzer (tokenomics, on-chain, dev activity, catalysts), plus a VIX/volatility regime view.
- **🌙 Esoteric** — astral turbulence, lunar cycles, Mercury retrograde, solar activity and Fibonacci confluences, all computed from a **real astronomical ephemeris** (not hand-picked dates).

> **Honesty first.** The esoteric layer is built on real astronomy and presented with real statistics (permutation tests, baselines, p-values). Those tests show **no statistically significant predictive power** over markets — and the app says so, out loud. The genuinely useful tools are the fundamental stock/crypto analyzers and the VIX regime view. Nothing here is financial advice.

---

## Features

### Stock analyzer
- Renormalized fundamental score across three pillars — **Valuation (40%) · Quality & Trend (30%) · Timing (30%)**.
- **Missing data scores NEUTRAL, never as a failure** (shown as amber "N/D"), so small-caps with thin data aren't unfairly penalized.
- Enterprise-value valuation (FCF/EV), net debt/EBITDA & interest-coverage hard filters, share dilution, accruals, consensus revisions and insider cluster-buying.
- Live Yahoo search — any listed stock is findable, not just a curated list.

### Crypto analyzer
- Three renormalized pillars — **Tokenomics & Value · Network/On-chain · Momentum** — adjusted by the crypto Fear & Greed index.
- **"Crypto P/S"** (market cap ÷ annualized protocol fees), TVL & MC/TVL, supply dilution, FDV/MC overhang.
- On-chain **holders & whale concentration** (no key), **whale accumulation** built from local snapshots over repeat visits.
- Chain-specific enrichment (e.g. **Hedera**: live TPS, on-chain supply, new accounts/day, transaction mix).

### Qualitative AI layer (optional, your own key)
- Grounded on the quantitative pillars, the model adds the qualitative layer APIs can't compute: pharma pipelines & catalysts for stocks; technology, roadmap, unlock/centralization risks and moat for crypto. It is explicitly forbidden from giving price opinions.

### Workspace
- Welcome **Home** with a live-scored watchlist summary and a macro "cosmic climate" snapshot.
- Local **watchlist** and a **discard pile** (remembers *when* you discarded something, so stale decisions are flagged on return).
- Full **ES/EN** localization.

---

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Framer Motion · ECharts · Zustand · Neon (PostgreSQL) + Drizzle ORM · next-intl · `yahoo-finance2` · CoinGecko · `astronomy-engine`.

---

## Getting started

The database is **optional** — you can run either way:

**Quick start (no database).** Everything works; analyses are fetched live on every request and nothing is cached server-side. Your watchlist, portfolio and saved AI analyses still persist locally under `user-data/`.

```bash
npm install
npm run dev          # no .env needed
```

**With a database (recommended).** Scanned companies/crypto are cached in Postgres, so repeat visits are instant and cheaper on the upstream APIs.

```bash
npm install
cp .env.example .env         # then set DATABASE_URL (Neon / PostgreSQL)
npx drizzle-kit push         # create the tables
npm run dev
```

Open <http://localhost:3000>.

On Windows you can also double-click **`Astro Trader.bat`**, which installs dependencies on first run, starts the server and opens the browser for you.

To unlock the qualitative **AI layer**, add an LLM key in-app under **Settings** (works with or without a database).

### Environment variables (`.env`)

| Variable       | Required | Purpose                                                                 |
| -------------- | -------- | ----------------------------------------------------------------------- |
| `DATABASE_URL` | no       | Neon / PostgreSQL connection string. Omit to run in live, no-cache mode |

### Optional API keys (set in-app, under **Settings**)

Stored **only on your local disk** (`user-data/settings.json`, gitignored) and sent only to the provider you choose.

| Provider                   | Unlocks                  | Cost             |
| -------------------------- | ------------------------ | ---------------- |
| Gemini / Claude / DeepSeek | the qualitative AI layer | your own LLM key |
| CoinMarketCal              | crypto catalyst calendar | free tier        |

On-chain data (holders, concentration, Hedera stats), TVL/fees and Fear & Greed need **no key** (Blockscout, DeFiLlama, Hedera Mirror Node, alternative.me).

---

## Project layout

```
src/
├── app/            # Next.js routes (explorer, screener, macro, crypto, api/*)
├── components/     # React components (detail views, charts, macro modules)
├── lib/
│   ├── api/        # Data clients: Yahoo, CoinGecko, DeFiLlama, Blockscout, Hedera…
│   ├── astro/      # Real ephemeris engine (aspects, dignities, transits)
│   ├── algorithm.ts, crypto-fundamentals.ts, macro-algorithm.ts, stats.ts
│   └── *-data.ts   # Lunar / solar / mercury reference data
├── db/             # Drizzle schema
└── messages/       # i18n (es / en)
```

## Scripts

| Command         | Action                |
| --------------- | --------------------- |
| `npm run dev`   | Development server    |
| `npm run build` | Production build      |
| `npm run start` | Serve production build|
| `npm run lint`  | ESLint                |

---

## Privacy

Everything personal lives under `user-data/` (watchlist, discards, your API keys, cached AI analyses, on-chain history) and `.env` — **both are gitignored and never committed**. Only `.env.example` is tracked, as a template.

## Disclaimer

This software is for research and educational purposes only. It is **not financial advice**. Markets — and crypto especially — are highly speculative. Data may be incomplete or wrong; always verify before acting.

## License

[MIT](LICENSE) © 2026 Víctor Balcells
