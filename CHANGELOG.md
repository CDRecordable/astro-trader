# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/), and the
project loosely follows [Semantic Versioning](https://semver.org/).

Each entry corresponds to work merged into `main`. For the exact steps behind
any line, the git history is the source of truth: commits use
[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
`docs:`…) with a body explaining the *why*, and feature branches are merged with
`--no-ff` so the full history is preserved.

## [Unreleased]

### Added
- **Simulated portfolio ("Cartera")** — paper-trade any stock or crypto with
  Buy/Sell buttons on its detail card (orders by dollar amount, fractional
  units), tracked against a starting cash balance with live P&L, positions and
  a transaction history.
- **Portfolio equity curve** — a forward-tracking chart of total portfolio
  value over time (one snapshot per day).
- **Configure portfolio by % allocation** — mirror the positions you actually
  hold: search assets, assign each a percentage, and apply at current prices.
- **AI reinforcement** — the qualitative AI analysis now *reinforces or weakens*
  the quantitative score with up/down arrows (on the detail's score ring and on
  each watchlist row) instead of showing a competing number.
- **Richer detail report** — three-column top layout (About · score breakdown ·
  interpretation), an in-page legend that jumps to each section, and an "About"
  card that (with an LLM key) shows the AI thesis plus main and upcoming
  products.
- **In-app self-update** — checks GitHub for new commits and offers a one-click
  update (git pull + npm install); `Actualizar.bat` as a double-click fallback.

### Changed
- **The database is now optional.** Without `DATABASE_URL` the app runs in
  no-cache mode (every analysis fetched live); watchlist, portfolio and saved
  AI analyses still persist locally under `user-data/`.
- **Watchlist search is now a local filter** over your saved assets — discovery
  of new assets happens in the Explorer, and you save from the detail card.
- **Watchlist & Home load scores from a local snapshot cache** — instant on
  open, only scanning assets that have no snapshot yet.
- Portfolio starting cash set to **100,000**.

### Fixed
- Home no longer re-scans the whole watchlist from scratch on every open.
- Retry transient Neon serverless-HTTP query failures (no more stray
  "Failed query" errors when opening a brand-new ticker).
- Guard the About card against older cached AI analyses that lack the
  `products` field.

## [0.1.0]

Initial public release.

### Added
- **Stock analyzer** — renormalized fundamental score across Valuation / Quality
  & Trend / Timing; missing data scores NEUTRAL (never as a failure);
  enterprise-value valuation, solvency/dilution/accruals filters, consensus
  revisions and insider cluster-buying; live Yahoo search.
- **Crypto analyzer** — three renormalized pillars (Tokenomics & Value ·
  Network/On-chain · Momentum) with Fear & Greed adjustment; "crypto P/S", TVL,
  supply dilution; on-chain holders & whale concentration; chain-specific
  enrichment (e.g. Hedera TPS/supply/accounts).
- **Qualitative AI layer** (optional, bring-your-own key) grounded on the
  quantitative pillars, forbidden from giving price opinions.
- **Esoteric mode** — astral turbulence, lunar cycles, Mercury retrograde, solar
  activity and Fibonacci confluences from a real astronomical ephemeris,
  presented with honest statistics (baselines, permutation tests, p-values).
- **VIX volatility-regime** view; localized in **ES/EN**.
