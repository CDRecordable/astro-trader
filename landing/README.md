# Astro Trader — landing

Public marketing site for **Astro Trader Insights**. It exists to promote the
download of the local app and (next) to sell the one-off AI unlock.

## Why it's a separate app

The product is **local-first**: users download it and it runs on their machine,
hitting Yahoo/CoinGecko from *their own IP*, for personal use. That's what keeps
the heuristic analysis free, fast, private — and within what those providers
allow.

This site deliberately shares **nothing** with the product at runtime:

- **No data endpoints.** It never calls Yahoo, CoinGecko or any market API, so
  it can be crawled and hammered without touching a single rate limit.
- **No database, no secrets.** The only env var is the canonical URL.
- **Fully static.** Every route is prerendered at build time.

The interactive demo runs on `data/showcase.json`: a frozen snapshot captured
from the real analyzers, with the scores the actual engine produced.

## Develop

```bash
npm install
npm run dev      # http://localhost:3200
```

The product itself runs on port 3100, so both can run side by side.

## Deploy (Railway)

Point a Railway service at this **`landing/` subdirectory** (Root Directory =
`landing`). `railway.json` sets the build and start commands; Railway injects
`PORT` and `next start` picks it up automatically.

Set `NEXT_PUBLIC_SITE_URL` to the final domain so metadata, `sitemap.xml` and
`robots.txt` emit absolute URLs.

## Refreshing the demo snapshot

The showcase data is intentionally frozen — regenerate it when the numbers feel
stale by capturing fresh responses from a locally running product instance and
rebuilding `data/showcase.json`.
