// ============================================================
// CryptoBetaAnalysis — market-sensitivity vs Bitcoin
// ============================================================
// Crypto counterpart of the stock beta: regress the coin's daily returns
// against Bitcoin's (BTC is the crypto market's "index"). Reuses the shared
// BetaChart; data comes from /api/crypto-history (CoinGecko market_chart).

"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BetaChart, pairReturns, type PricePoint } from "./BetaAnalysis";

export default function CryptoBetaAnalysis({ geckoId, symbol }: { geckoId: string; symbol: string }) {
    const t = useTranslations("cryptoDetail");
    const isBitcoin = geckoId === "bitcoin";
    const [paired, setPaired] = useState<{ x: number; y: number }[]>([]);
    const [loading, setLoading] = useState(!isBitcoin);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isBitcoin) return;
        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to loading when the coin changes
        setLoading(true);
        setError(false);
        Promise.all([
            fetch(`/api/crypto-history?id=${encodeURIComponent(geckoId)}`).then((r) => r.json()),
            fetch(`/api/crypto-history?id=bitcoin`).then((r) => r.json()),
        ])
            .then(([c, b]: [{ data?: PricePoint[] }, { data?: PricePoint[] }]) => {
                if (active) setPaired(pairReturns(c.data ?? [], b.data ?? []));
            })
            .catch(() => { if (active) setError(true); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [geckoId, isBitcoin]);

    // BTC vs itself is meaningless (β would be 1 by definition).
    if (isBitcoin) {
        return <p className="text-[11px] py-3" style={{ color: "var(--text-muted)" }}>{t("betaIsBenchmark")}</p>;
    }

    return <BetaChart paired={paired} loading={loading} error={error} ticker={symbol} benchName="Bitcoin" />;
}
