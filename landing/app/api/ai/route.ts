// ============================================================
// POST /api/ai — the PRO tier's AI proxy
// ============================================================
// Patreon supporters don't configure an API key: their app calls this, and we
// forward the prompt to the provider using OUR key. That key therefore never
// leaves this server — it cannot be shipped inside the downloadable app, where
// anyone could unzip it (and the app's source is public on GitHub anyway).
//
// Because every call spends real money, two rules are enforced HERE and not in
// the client:
//   1. the caller must present an unexpired, correctly-signed PRO token;
//   2. the caller must be under the monthly quota.
// The desktop app is open source, so any check inside it can be edited away.

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiUsage, patrons } from "@/db/schema";
import { verifyLicenseWithServerKey } from "@/lib/license";
import { MONTHLY_QUOTA } from "@/lib/patreon";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Longest prompt we'll relay. Guards against someone inflating our bill. */
const MAX_PROMPT_CHARS = 24_000;
const MAX_OUTPUT_TOKENS = 4096;

/** "2026-08" — the quota resets on the 1st of each month. */
function currentPeriod(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function json(body: unknown, status: number) {
    return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
    // ── 1. Who is calling? ──────────────────────────────────
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) return json({ error: "missing_token" }, 401);

    // verifyLicenseWithServerKey also rejects an expired token, which is what
    // makes a cancelled membership stop working without any revocation list.
    const payload = verifyLicenseWithServerKey(token);
    if (!payload) return json({ error: "invalid_or_expired_token" }, 401);
    if (payload.p !== "patreon-pro" || !payload.u) {
        // A lifetime licence unlocks the AI layer with the buyer's OWN key —
        // it does not entitle anyone to spend ours.
        return json({ error: "not_a_pro_token" }, 403);
    }

    const { prompt } = (await req.json().catch(() => ({}))) as { prompt?: string };
    if (!prompt || typeof prompt !== "string") return json({ error: "missing_prompt" }, 400);
    if (prompt.length > MAX_PROMPT_CHARS) return json({ error: "prompt_too_long" }, 413);

    const apiKey = process.env.PRO_LLM_API_KEY;
    if (!apiKey) return json({ error: "server_not_configured" }, 503);

    const db = getDb();
    if (!db) return json({ error: "server_not_configured" }, 503);

    // ── 2. Is the membership still live? ────────────────────
    // The token is short-lived, but a supporter can cancel mid-token. This is a
    // cheap local check against what we recorded at the last renewal.
    const [patron] = await db
        .select()
        .from(patrons)
        .where(eq(patrons.patreonUserId, payload.u))
        .limit(1);
    if (!patron || patron.status !== "active_patron") {
        return json({ error: "membership_inactive" }, 403);
    }

    // ── 3. Claim a slot BEFORE spending money ───────────────
    // Reserving first means two concurrent requests can't both slip through on
    // the last remaining unit; if the provider then fails we hand the slot back.
    const period = currentPeriod();
    const claimed = await db
        .insert(aiUsage)
        .values({ patreonUserId: payload.u, period, used: 1 })
        .onConflictDoUpdate({
            target: [aiUsage.patreonUserId, aiUsage.period],
            set: { used: sql`${aiUsage.used} + 1`, updatedAt: sql`now()` },
            where: sql`${aiUsage.used} < ${MONTHLY_QUOTA}`,
        })
        .returning({ used: aiUsage.used });

    if (claimed.length === 0) {
        // The conditional update matched nothing → the quota is spent.
        return json(
            { error: "quota_exceeded", quota: MONTHLY_QUOTA, period },
            429,
        );
    }
    const used = claimed[0].used;

    // ── 4. Spend our key ────────────────────────────────────
    const model = process.env.PRO_LLM_MODEL ?? "deepseek-chat";
    const baseUrl = process.env.PRO_LLM_BASE_URL ?? "https://api.deepseek.com";

    try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model,
                max_tokens: MAX_OUTPUT_TOKENS,
                temperature: 0.4,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!res.ok) {
            const detail = (await res.text()).slice(0, 200);
            throw new Error(`provider ${res.status}: ${detail}`);
        }

        const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content ?? "";
        if (!text) throw new Error("provider returned empty content");

        return json({ text, model, used, quota: MONTHLY_QUOTA, period }, 200);
    } catch (e) {
        // The supporter got nothing, so they shouldn't be charged a slot.
        await db
            .update(aiUsage)
            .set({ used: sql`greatest(${aiUsage.used} - 1, 0)` })
            .where(and(eq(aiUsage.patreonUserId, payload.u), eq(aiUsage.period, period)));

        console.error("[api/ai]", e);
        return json({ error: "provider_unavailable" }, 502);
    }
}
