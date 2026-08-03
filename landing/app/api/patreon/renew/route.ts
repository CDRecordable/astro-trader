// ============================================================
// POST /api/patreon/renew — silent renewal of a PRO token
// ============================================================
// The app calls this on its own when its token is close to expiring. We re-ask
// Patreon whether the membership is still active — that round trip is the whole
// point: it is what makes a cancellation actually take effect, without us
// having to maintain a revocation list.
//
// Accepts an already-expired token on purpose: expiry is exactly when the app
// comes asking. The security boundary is the Patreon check below, not the date.

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { patrons } from "@/db/schema";
import { memberFromRefreshToken } from "@/lib/patreon";
import { issueProToken, verifyForRenewalWithServerKey } from "@/lib/license";
import { eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const { token } = (await req.json().catch(() => ({}))) as { token?: string };
    if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

    const payload = verifyForRenewalWithServerKey(token);
    if (!payload || payload.p !== "patreon-pro" || !payload.u) {
        return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ error: "server_not_configured" }, { status: 503 });

    const [patron] = await db
        .select()
        .from(patrons)
        .where(eq(patrons.patreonUserId, payload.u))
        .limit(1);
    if (!patron?.refreshToken) {
        // We never stored (or have lost) the means to re-check — the supporter
        // has to connect through Patreon once more.
        return NextResponse.json({ error: "reconnect_required" }, { status: 409 });
    }

    let member;
    try {
        member = await memberFromRefreshToken(patron.refreshToken);
    } catch (e) {
        console.error("[patreon/renew]", e);
        // Patreon is down. Do NOT revoke: we can't tell an expired membership
        // from an unreachable API, and punishing a paying supporter for our
        // outage is the worse mistake.
        return NextResponse.json({ error: "patreon_unavailable" }, { status: 503 });
    }

    await db
        .update(patrons)
        .set({
            status: member.status,
            pledgeCents: member.pledgeCents,
            email: member.email || patron.email,
            // Patreon rotates refresh tokens — persist the new one or the next
            // renewal fails.
            refreshToken: member.refreshToken ?? patron.refreshToken,
            checkedAt: sql`now()`,
        })
        .where(eq(patrons.patreonUserId, payload.u));

    if (!member.entitled) {
        return NextResponse.json(
            { error: "membership_inactive", status: member.status },
            { status: 403 },
        );
    }

    return NextResponse.json({
        token: issueProToken(member.email || patron.email, member.patreonUserId),
    });
}
