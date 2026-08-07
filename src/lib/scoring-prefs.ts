// ============================================================
// Scoring preferences — one shared client-side source of truth
// ============================================================
// The blend weight and the horizon are read by several components at once
// (the score header, the technical block's arithmetic). If each fetched
// /api/settings on its own, changing the horizon in the header would leave
// the arithmetic below showing stale weights. This tiny external store keeps
// every consumer in sync through useSyncExternalStore — the same pattern the
// AppShell uses for the sidebar collapse.
//
// Horizon semantics — deliberately a PRESENTATION decision, not an engine one:
// no cached score changes, the horizon reshapes how the two scores blend.
//
//   · short  (weeks-months): the chart is most of what you can know at this
//     range — the technical weight scales UP (×1.75, capped at 0.85).
//   · medium (6-18 months): the user's configured baseline, untouched.
//   · long   (years): volatility washes out and fundamentals dominate — the
//     technical weight scales DOWN (×0.375).
//
// The multipliers scale the USER'S baseline rather than replacing it, so a
// user who set the technical weight to 0 ("chartism is a chimera") keeps 0
// at every horizon: their philosophy is respected, not argued with.

"use client";

import { useSyncExternalStore } from "react";
import type { ScoringHorizon } from "@/app/api/settings/route";

export type { ScoringHorizon };

export interface ScoringPrefs {
    /** Baseline technical weight (medium horizon), 0..1. */
    technicalWeight: number;
    horizon: ScoringHorizon;
    loaded: boolean;
}

const HORIZON_MULT: Record<ScoringHorizon, number> = {
    short: 1.75,
    medium: 1,
    long: 0.375,
};

/** Cap so even "short" never erases the fundamental side entirely. */
const MAX_WEIGHT = 0.85;

export function effectiveTechnicalWeight(base: number, horizon: ScoringHorizon): number {
    return Math.min(MAX_WEIGHT, Math.max(0, base * HORIZON_MULT[horizon]));
}

// ── The store ────────────────────────────────────────────────

let prefs: ScoringPrefs = { technicalWeight: 0.4, horizon: "medium", loaded: false };
const listeners = new Set<() => void>();
let fetchStarted = false;

function notify() {
    for (const l of listeners) l();
}

function loadOnce() {
    if (fetchStarted) return;
    fetchStarted = true;
    fetch("/api/settings")
        .then((r) => (r.ok ? r.json() : null))
        .then((s: { scoring?: { technicalWeight?: number; horizon?: string } } | null) => {
            const raw = Number(s?.scoring?.technicalWeight);
            const h = s?.scoring?.horizon;
            prefs = {
                technicalWeight: isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.4,
                horizon: h === "short" || h === "long" ? h : "medium",
                loaded: true,
            };
            notify();
        })
        .catch(() => {
            prefs = { ...prefs, loaded: true };
            notify();
        });
}

function subscribe(onChange: () => void) {
    listeners.add(onChange);
    loadOnce();
    return () => { listeners.delete(onChange); };
}

const getSnapshot = () => prefs;
const SERVER_PREFS: ScoringPrefs = { technicalWeight: 0.4, horizon: "medium", loaded: false };
const getServerSnapshot = () => SERVER_PREFS;

export function useScoringPrefs(): ScoringPrefs {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Optimistic: every consumer re-renders immediately; persistence follows. */
export function setHorizon(horizon: ScoringHorizon): void {
    prefs = { ...prefs, horizon };
    notify();
    void fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scoring: { technicalWeight: prefs.technicalWeight, horizon } }),
    }).catch(() => { /* the UI already moved; a failed save costs a restart */ });
}
