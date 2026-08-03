// ============================================================
// GET /api/patreon/callback — Patreon sends the supporter back here
// ============================================================
// Exchanges the one-time code for the membership, records the patron, and — if
// the membership is active — issues a short-lived PRO token which the supporter
// pastes into the app once. From then on the app renews it silently.

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { patrons } from "@/db/schema";
import { memberFromCode } from "@/lib/patreon";
import { issueProToken } from "@/lib/license";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(path: string, req: NextRequest) {
    return NextResponse.redirect(new URL(path, process.env.SITE_URL ?? req.nextUrl.origin));
}

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const expected = req.cookies.get("patreon_state")?.value;

    // The supporter declined on Patreon's screen — not an error, just a no.
    if (req.nextUrl.searchParams.get("error")) return back("/pro?error=declined", req);
    if (!code) return back("/pro?error=missing_code", req);
    if (!state || !expected || state !== expected) return back("/pro?error=bad_state", req);

    let member;
    try {
        member = await memberFromCode(code);
    } catch (e) {
        console.error("[patreon/callback]", e);
        // Patreon was unreachable — do NOT tell the supporter they aren't a
        // patron, because we genuinely don't know.
        return back("/pro?error=patreon_unavailable", req);
    }

    const db = getDb();
    if (db) {
        // Remember the membership so a renewal can be answered without a second
        // trip through Patreon's login screen.
        await db
            .insert(patrons)
            .values({
                patreonUserId: member.patreonUserId,
                email: member.email,
                status: member.status,
                pledgeCents: member.pledgeCents,
                refreshToken: member.refreshToken,
            })
            .onConflictDoUpdate({
                target: patrons.patreonUserId,
                set: {
                    email: member.email,
                    status: member.status,
                    pledgeCents: member.pledgeCents,
                    refreshToken: member.refreshToken,
                    checkedAt: sql`now()`,
                },
            });
    }

    if (!member.entitled) {
        return back(`/pro?error=not_active&status=${encodeURIComponent(member.status)}`, req);
    }

    const token = issueProToken(member.email, member.patreonUserId);
    const res = back(`/pro?token=${encodeURIComponent(token)}`, req);
    res.cookies.delete("patreon_state");
    return res;
}
