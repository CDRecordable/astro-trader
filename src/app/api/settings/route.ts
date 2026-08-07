// ============================================================
// API Route — /api/settings
// Stores user settings in /user-data/settings.json (local disk)
// API keys for LLM providers are stored here — never exposed to git.
// GET  → returns current settings
// POST → saves new settings (full replace)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { userDataPath } from "@/lib/paths";

export interface LLMSettings {
    defaultProvider: "none" | "gemini" | "claude" | "deepseek";
    apiKeys: {
        gemini: string;
        claude: string;
        deepseek: string;
    };
}

/** Keys for the crypto data providers. (On-chain holders come from
 *  Blockscout, which needs no key — only the catalyst calendar does.) */
export interface DataKeys {
    coinmarketcal: string;  // catalyst event calendar
}

/** Investment horizon — reshapes the fundamental/technical blend. */
export type ScoringHorizon = "short" | "medium" | "long";

/** Scoring preferences — how the presentation layer blends the two scores. */
export interface ScoringSettings {
    /**
     * Weight of the TECHNICAL score in the global blend at the MEDIUM
     * horizon, 0..1. Global = fundamental × (1−w) + technical × w. At 0 the
     * global score disappears entirely — for users who consider chartism a
     * chimera — and the horizon selector disappears with it.
     */
    technicalWeight: number;
    /**
     * Selected horizon. Short scales the technical weight up (weeks-months:
     * the chart is most of what you can know), long scales it down (years:
     * fundamentals dominate and volatility washes out). Changed inline from
     * the detail cards; persisted here so it survives restarts.
     */
    horizon: ScoringHorizon;
}

export interface UserSettings {
    llm: LLMSettings;
    dataKeys: DataKeys;
    scoring: ScoringSettings;
}

const DEFAULT_SETTINGS: UserSettings = {
    llm: {
        defaultProvider: "none",
        apiKeys: {
            gemini: "",
            claude: "",
            deepseek: "",
        },
    },
    dataKeys: {
        coinmarketcal: "",
    },
    scoring: {
        technicalWeight: 0.4,
        horizon: "medium",
    },
};

const DATA_PATH = userDataPath("settings.json");

function readSettings(): UserSettings {
    try {
        const raw = fs.readFileSync(DATA_PATH, "utf-8");
        const parsed = JSON.parse(raw) as Partial<UserSettings>;
        // Deep merge with defaults to handle new fields added in future versions
        return {
            llm: {
                ...DEFAULT_SETTINGS.llm,
                ...(parsed.llm ?? {}),
                apiKeys: {
                    ...DEFAULT_SETTINGS.llm.apiKeys,
                    ...(parsed.llm?.apiKeys ?? {}),
                },
            },
            dataKeys: {
                ...DEFAULT_SETTINGS.dataKeys,
                ...(parsed.dataKeys ?? {}),
            },
            scoring: {
                ...DEFAULT_SETTINGS.scoring,
                ...(parsed.scoring ?? {}),
            },
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function writeSettings(data: UserSettings): void {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ── GET ───────────────────────────────────────────────────────
export async function GET() {
    const settings = readSettings();
    return NextResponse.json(settings);
}

// ── POST ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const body = await req.json() as Partial<UserSettings>;

    const current = readSettings();

    const updated: UserSettings = {
        llm: {
            defaultProvider: body.llm?.defaultProvider ?? current.llm.defaultProvider,
            apiKeys: {
                gemini: body.llm?.apiKeys?.gemini ?? current.llm.apiKeys.gemini,
                claude: body.llm?.apiKeys?.claude ?? current.llm.apiKeys.claude,
                deepseek: body.llm?.apiKeys?.deepseek ?? current.llm.apiKeys.deepseek,
            },
        },
        dataKeys: {
            coinmarketcal: body.dataKeys?.coinmarketcal ?? current.dataKeys.coinmarketcal,
        },
        scoring: {
            // Clamp: a corrupted or hand-edited value must never break the blend.
            technicalWeight: Math.min(1, Math.max(0,
                Number(body.scoring?.technicalWeight ?? current.scoring.technicalWeight) || 0)),
            horizon: (["short", "medium", "long"] as const).includes(
                body.scoring?.horizon as ScoringHorizon,
            )
                ? (body.scoring!.horizon as ScoringHorizon)
                : current.scoring.horizon,
        },
    };

    writeSettings(updated);
    return NextResponse.json({ ok: true, settings: updated });
}
