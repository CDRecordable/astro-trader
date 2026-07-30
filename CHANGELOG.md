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
- **Public site: SEO architecture and one landing per function** — the site
  grows from 5 to 18 indexed pages following a one-landing-per-search-intent
  plan (documented in landing/SEO.md): tool landings for the screener, country
  macro, VIX, watchlist, simulated portfolio and the AI layer, plus a dedicated
  page for each of the seven esoteric dimensions structured as hypothesis /
  how-we-measure-it / honest statistical verdict. A Golfmanager-style
  four-column mega-menu and the footer index every page from a single registry
  that also generates the sitemap; landings emit FAQPage and BreadcrumbList
  structured data.

## [0.6.0] — 2026-07-28

First release with a real installer: the app is now downloadable and installs
like any other program, with a public website and a lifetime AI licence.

### Added
- **Public landing site** (`landing/`) — a standalone, fully static marketing
  app deployable to Railway on its own. It never calls a market API: the
  interactive demo runs on a frozen snapshot carrying the scores the real
  engine produced, so the site can be crawled and hammered without touching a
  rate limit. Includes a voxel design system drawn as pure SVG, SEO metadata,
  JSON-LD, sitemap and robots.
- **Lifetime licence for the AI layer** — Ed25519 signed keys, **verified
  offline** on the user's machine against a public key embedded in the app.
  The product never phones home, keeps working without connectivity, and
  survives the licence server disappearing. The landing issues keys from a
  payment webhook (idempotent on the payment id), stores them so buyers can
  recover a lost key, and exposes a passwordless licence portal — no accounts,
  no passwords. Payments are provider-agnostic: Stripe and Lemon Squeezy are
  both supported behind one adapter, so the merchant-of-record decision (EU
  VAT) stays open.
- **Settings → AI layer licence** — paste a key to unlock; the qualitative AI
  routes return `402 no_license` and the UI shows an unlock notice until then.
  The heuristic analysis remains free and untouched.
- **ETF analyzer** — a third asset class with the same rigor as stocks and
  crypto. Curated universe of 55+ **UCITS** ETFs (global, USA, Europe,
  emerging, countries, sectors, thematics, factors and physical gold) with
  issuer TERs, plus a hybrid data pipeline that fills UCITS data gaps from
  each fund's US-listed equivalent (disclosed in the UI). Renormalized
  scoring across three pillars — **Cost & Vehicle (30%) · Portfolio &
  Valuation (40%) · Momentum & Timing (30%)** — with N/D-neutral metrics and
  hard filters (tiny AUM, abusive TER). Full detail card: price chart with
  timeframes, top holdings, sector breakdown, per-metric tooltips; an **AI
  qualitative layer** (exposure thesis, what you actually own, risks, UCITS
  alternatives, portfolio role, news-grounded narrative); ETF mode in the
  **Screener** (rank a whole category by score); and full integration with
  watchlist, discards, home and the simulated portfolio.
- **Country macro dashboard ("Economía")** — top-down read of the **US, Eurozone
  and Spain**: job market, inflation and activity indicators, each bucketed
  (low/normal/high) and mapped to the **implied central-bank stance**
  (expansionary/neutral/contractionary), with an aggregate "economy reading +
  policy bias" dial. Free data from **FRED, Eurostat and the ECB** (via
  DBnomics), no key; per-indicator graceful degradation to N/D.
- **Cross-metric scatter in the Screener** — plot a whole scanned universe on
  any two metrics (e.g. EBITDA growth vs P/E) as a **regression** (OLS trend
  line + R², biggest outliers labelled) or a **quadrant / buy-box** (median
  split, bubble size = market cap), colored by recommendation. Sector filter,
  plus small-sample and mixed-sector caveats.
- **Peer positioning on the stock detail** — where a stock sits against its
  **sector peers**, with the group's regression line and each name's deviation
  (cheap/expensive for its profile). Peers are pulled **on demand** from a
  region-matched universe when not already loaded.
- **Market-sensitivity (beta) chart** — regress an asset's daily returns against
  its benchmark (stocks → **S&P 500**, crypto → **Bitcoin**) for beta + R²
  (systematic vs idiosyncratic risk), with a plain-language reading.
- **Crypto peer map + beta vs BTC** — a size × momentum positioning within the
  coin's category, and the beta chart above, on the crypto detail.
- **Value-aware metric readings** — every valuation/solvency tooltip on the
  stock detail adds an *"in this case"* line interpreting the actual number, so a
  bare `−33×` interest coverage reads as *operating losses*, not *low coverage*.
- **Notes on watchlist & discards** — add/edit a free-text note on any saved or
  discarded asset to remember *why* you kept or set it aside.
- **Grouped sidebar navigation** — "Explorador" (individual stocks / Screener)
  and "Macro" (VIX / Economía) now open a flyout sub-menu instead of taking a
  slot each.
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
- Crypto **dev commits / active contributors** of `0` now show **N/D** instead
  of a misleading red `0`: CoinGecko often doesn't track a project's real GitHub
  repo (Hedera, Bitcoin… report 0 while being very active), matching how the
  score already treats it as unavailable rather than a penalty.
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
