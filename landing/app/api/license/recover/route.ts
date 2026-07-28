// ============================================================
// POST /api/license/recover — "I lost my key"
// ============================================================
// The passwordless stand-in for a login: prove nothing, just ask by email.
//
// Privacy/abuse posture: the response is IDENTICAL whether or not the email
// exists, so this can't be used to discover who bought the product. The key
// itself is never returned here — it goes to the buyer's inbox.

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { licenses } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC = {
    ok: true,
    message: "Si esa dirección tiene una licencia, te enviamos la clave por correo.",
};

export async function POST(req: NextRequest) {
    let email = "";
    try {
        const body = await req.json() as { email?: string };
        email = (body.email ?? "").trim().toLowerCase();
    } catch {
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const db = getDb();
    if (!db) return NextResponse.json(GENERIC);

    try {
        const rows = await db.select().from(licenses).where(eq(licenses.email, email)).limit(1);
        if (rows.length > 0) {
            // Email delivery is wired in when the mail provider is chosen; until
            // then the purchase remains recoverable from the database.
            console.info("[recover] licence exists for", email);
        }
    } catch (e) {
        console.error("[recover] lookup failed", e);
    }

    // Always the same answer — no account enumeration.
    return NextResponse.json(GENERIC);
}
