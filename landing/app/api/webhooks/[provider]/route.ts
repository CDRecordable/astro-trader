// ============================================================
// POST /api/webhooks/[provider]  — payment confirmed → issue licence
// ============================================================
// Security posture:
//   · the raw body is read BEFORE parsing, because signatures cover raw bytes;
//   · an invalid/missing signature is rejected outright — this endpoint is the
//     only thing standing between "anyone on the internet" and a free licence;
//   · issuance is idempotent on the provider's payment id, so retried webhooks
//     (which every provider does) never mint a second licence.

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { licenses } from "@/db/schema";
import { parseWebhook, type Provider } from "@/lib/payments";
import { issueLicense } from "@/lib/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ provider: string }> },
) {
    const { provider: raw } = await params;
    const provider = raw.toLowerCase();
    if (provider !== "stripe" && provider !== "lemonsqueezy") {
        return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
    }

    const body = await req.text();
    const event = parseWebhook(provider as Provider, body, req.headers);
    if (!event) {
        // Either a bad signature or an event we don't act on. 400 keeps
        // providers retrying only on genuine failures.
        return NextResponse.json({ error: "invalid_or_ignored" }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
        // Fail loudly: the payment happened, so a 500 makes the provider retry
        // rather than silently dropping someone's purchase.
        console.error("[webhook] payment received but no DATABASE_URL configured", event.paymentId);
        return NextResponse.json({ error: "storage_unavailable" }, { status: 500 });
    }

    try {
        // Already issued for this payment? Return it unchanged.
        const existing = await db.select().from(licenses).where(eq(licenses.paymentId, event.paymentId)).limit(1);
        if (existing.length > 0) {
            return NextResponse.json({ ok: true, licenseKey: existing[0].licenseKey, reused: true });
        }

        const licenseKey = issueLicense(event.email);
        await db.insert(licenses).values({
            email: event.email.trim().toLowerCase(),
            licenseKey,
            provider: event.provider,
            paymentId: event.paymentId,
            product: "ai-lifetime",
            amountCents: event.amountCents,
            currency: event.currency,
        }).onConflictDoNothing({ target: licenses.paymentId });

        return NextResponse.json({ ok: true, licenseKey });
    } catch (e) {
        console.error("[webhook] issuance failed", e);
        return NextResponse.json({ error: "issuance_failed" }, { status: 500 });
    }
}
