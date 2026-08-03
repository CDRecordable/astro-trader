// ============================================================
// AI access — one gate for both ways of unlocking the AI layer
// ============================================================
// There are two, and they are meaningfully different:
//
//   · BYOK (`ai-lifetime`) — the one-off purchase. The user's own API key,
//     stored locally, is used directly. Nothing leaves the machine except the
//     call to the provider they chose. No quota, because they pay the provider.
//
//   · PRO (`patreon-pro`) — an active Patreon membership. Calls are relayed
//     through our proxy, which spends OUR key. That key can never ship inside
//     the app (it's a downloadable ZIP, and the source is public), so the proxy
//     is not an optimization — it's the only safe design. It also means every
//     call costs us money, hence the monthly quota enforced server-side.
//
// The three AI routes each used to re-implement licence checks, settings
// reading and the provider call. They now ask here instead.

import fs from "fs";
import { userDataPath } from "./paths";
import { readStoredLicense, storeLicense } from "./license";
import { callLLM, type LLMProvider } from "./api/llm-client";

const SETTINGS_PATH = userDataPath("settings.json");
const PROVIDERS: LLMProvider[] = ["gemini", "claude", "deepseek"];

/** Where the PRO proxy lives. Overridable so a self-hoster can point elsewhere. */
const PRO_API = (
    process.env.ASTRO_PRO_API ?? "https://astro-trader-production.up.railway.app"
).replace(/\/$/, "");

/** Renew once the token has less than this left, so it never lapses in use. */
const RENEW_BEFORE_SECONDS = 3 * 86_400;

export type AiFailure =
    | "no_license"        // nothing unlocks the AI layer on this machine
    | "no_key"            // lifetime licence, but no provider key configured
    | "pro_expired"       // membership ended (or we couldn't renew)
    | "pro_quota"         // monthly allowance spent
    | "pro_unavailable";  // our proxy or the provider is down

export type AiResult =
    | {
        ok: true;
        text: string;
        model: string;
        /** Recorded on the cached analysis: the provider name, or "patreon-pro". */
        provider: string;
        used?: number;
        quota?: number;
    }
    | { ok: false; failure: AiFailure; status: number; message: string };

function readSettings(): { provider: LLMProvider | "none"; apiKey: string } {
    try {
        const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) as {
            llm?: { defaultProvider?: string; apiKeys?: Record<string, string> };
        };
        const keys = s.llm?.apiKeys ?? {};
        const chosen = s.llm?.defaultProvider as LLMProvider | undefined;
        if (chosen && (keys[chosen] ?? "").trim()) {
            return { provider: chosen, apiKey: keys[chosen].trim() };
        }
        for (const p of PROVIDERS) {
            if ((keys[p] ?? "").trim()) return { provider: p, apiKey: keys[p].trim() };
        }
        return { provider: "none", apiKey: "" };
    } catch {
        return { provider: "none", apiKey: "" };
    }
}

/**
 * Swap a near-expired PRO token for a fresh one. The server re-asks Patreon
 * whether the membership is still active, so this is also where a cancellation
 * takes effect. Returns the token to use, or null if access has ended.
 */
async function renewProToken(current: string): Promise<string | null> {
    try {
        const res = await fetch(`${PRO_API}/api/patreon/renew`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: current }),
        });
        if (res.ok) {
            const { token } = (await res.json()) as { token?: string };
            if (token && storeLicense(token)) return token;
            return null;
        }
        // 503 = Patreon unreachable. Keep using the current token if it hasn't
        // actually expired yet: an outage on their side or ours must not lock
        // out a paying supporter.
        if (res.status === 503) return current;
        return null;
    } catch {
        return current; // network blip — same reasoning as above
    }
}

/** Run a prompt through whichever access this machine has. */
export async function runAi(prompt: string): Promise<AiResult> {
    const stored = readStoredLicense();
    if (!stored) {
        return {
            ok: false, failure: "no_license", status: 402,
            message: "Desbloquea la capa de IA en Ajustes: con tu licencia, o conectando tu cuenta de Patreon.",
        };
    }

    // ── PRO: relay through the proxy ────────────────────────
    if (stored.info.product === "patreon-pro") {
        let token = stored.key;
        const left = stored.info.expiresInSeconds ?? -1;
        if (left < RENEW_BEFORE_SECONDS) {
            const renewed = await renewProToken(token);
            if (!renewed) {
                return {
                    ok: false, failure: "pro_expired", status: 403,
                    message: "Tu suscripción de Patreon ya no está activa. Vuelve a conectarla en Ajustes.",
                };
            }
            token = renewed;
        }

        try {
            const res = await fetch(`${PRO_API}/api/ai`, {
                method: "POST",
                headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ prompt }),
            });

            if (res.status === 429) {
                const d = (await res.json().catch(() => ({}))) as { quota?: number };
                return {
                    ok: false, failure: "pro_quota", status: 429,
                    message: `Has agotado tus ${d.quota ?? 100} análisis de este mes. Se renuevan el día 1.`,
                };
            }
            if (res.status === 401 || res.status === 403) {
                return {
                    ok: false, failure: "pro_expired", status: 403,
                    message: "Tu suscripción de Patreon ya no está activa. Vuelve a conectarla en Ajustes.",
                };
            }
            if (!res.ok) throw new Error(`proxy ${res.status}`);

            const d = (await res.json()) as { text: string; model: string; used?: number; quota?: number };
            return { ok: true, text: d.text, model: d.model, provider: "patreon-pro", used: d.used, quota: d.quota };
        } catch {
            return {
                ok: false, failure: "pro_unavailable", status: 503,
                message: "El servicio de IA no responde ahora mismo. Inténtalo en unos minutos.",
            };
        }
    }

    // ── BYOK: the user's own key, straight to their provider ─
    const { provider, apiKey } = readSettings();
    if (provider === "none" || !apiKey) {
        return {
            ok: false, failure: "no_key", status: 400,
            message: "Añade la clave de tu proveedor de IA en Ajustes.",
        };
    }
    const { text, model } = await callLLM(provider, apiKey, prompt);
    return { ok: true, text, model, provider };
}

/** What kind of access this machine has — for the Settings screen. */
export function aiAccessMode(): "pro" | "byok" | "none" {
    const stored = readStoredLicense();
    if (!stored) return "none";
    return stored.info.product === "patreon-pro" ? "pro" : "byok";
}
