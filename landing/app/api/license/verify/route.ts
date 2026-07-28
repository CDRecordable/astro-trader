// ============================================================
// POST /api/license/verify — optional online check
// ============================================================
// The app verifies licences OFFLINE with the embedded public key, so this
// endpoint is not required for the product to work. It exists so a buyer can
// sanity-check a key from the website, and so support can confirm one.

import { NextRequest, NextResponse } from "next/server";
import { verifyWithServerKey } from "@/lib/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const { key } = await req.json() as { key?: string };
        if (!key) return NextResponse.json({ valid: false, reason: "missing_key" }, { status: 400 });

        const payload = verifyWithServerKey(key);
        if (!payload) return NextResponse.json({ valid: false, reason: "invalid_signature" });

        return NextResponse.json({
            valid: true,
            product: payload.p,
            issuedAt: new Date(payload.t * 1000).toISOString().slice(0, 10),
            // Only a masked hint, so a leaked key doesn't leak a full address.
            emailHint: payload.e.replace(/^(.).*(@.*)$/, "$1•••$2"),
        });
    } catch {
        return NextResponse.json({ valid: false, reason: "bad_request" }, { status: 400 });
    }
}
