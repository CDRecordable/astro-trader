// ============================================================
// API Route — /api/license  (local licence state)
// ============================================================
// Runs on the user's own machine. Verification is offline against the embedded
// public key, so this route never reaches the internet.
//   GET    → current licence state
//   POST   → activate a licence key
//   DELETE → deactivate

import { NextRequest, NextResponse } from "next/server";
import { readStoredLicense, storeLicense, clearLicense } from "@/lib/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const stored = readStoredLicense();
    return NextResponse.json({
        licensed: stored !== null,
        info: stored?.info ?? null,
    });
}

export async function POST(req: NextRequest) {
    try {
        const { key } = await req.json() as { key?: string };
        if (!key?.trim()) {
            return NextResponse.json({ error: "missing_key" }, { status: 400 });
        }

        const info = storeLicense(key);
        if (!info) {
            return NextResponse.json({ error: "invalid_license" }, { status: 400 });
        }

        return NextResponse.json({ licensed: true, info });
    } catch {
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
}

export async function DELETE() {
    clearLicense();
    return NextResponse.json({ licensed: false, info: null });
}
