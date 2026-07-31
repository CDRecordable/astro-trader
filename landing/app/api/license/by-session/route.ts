// ============================================================
// GET /api/license/by-session?session_id=cs_… — show the key after checkout
// ============================================================
// Stripe Payment Links can redirect to /gracias?session_id={CHECKOUT_SESSION_ID}.
// The webhook stores the licence keyed by that session id, so the buyer's
// browser can fetch its own key without any email round-trip.
//
// Security: the session id acts as a bearer token. That's acceptable because
// ids are long, unguessable, delivered only to the buyer's browser by Stripe,
// and only exist in our table after a signature-verified webhook. We never
// enumerate: an unknown id and a not-yet-arrived webhook look identical.

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { licenses } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const sessionId = req.nextUrl.searchParams.get("session_id")?.trim() ?? "";
    // Stripe checkout-session ids: cs_test_… / cs_live_…
    if (!/^cs_[a-zA-Z0-9_]{10,}$/.test(sessionId)) {
        return NextResponse.json({ status: "invalid" }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json({ status: "pending" });

    try {
        const rows = await db.select().from(licenses).where(eq(licenses.paymentId, sessionId)).limit(1);
        if (rows.length === 0) {
            // The webhook usually lands within seconds of the redirect; the
            // /gracias page polls this until it does.
            return NextResponse.json({ status: "pending" });
        }
        return NextResponse.json({
            status: "ready",
            licenseKey: rows[0].licenseKey,
            email: rows[0].email,
        });
    } catch (e) {
        console.error("[by-session] lookup failed", e);
        return NextResponse.json({ status: "pending" });
    }
}
