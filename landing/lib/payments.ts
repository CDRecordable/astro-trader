// ============================================================
// Payments — provider-agnostic surface
// ============================================================
// The choice between Stripe and Lemon Squeezy is a business decision (chiefly:
// who is merchant of record and therefore handles EU VAT), not an architectural
// one. Everything the app needs from a provider is expressed here, so switching
// later means implementing one adapter — not rewriting the licence flow.
//
// Configure with:
//   PAYMENT_PROVIDER=stripe | lemonsqueezy
//   PAYMENT_CHECKOUT_URL=<hosted checkout link>       (simplest integration)
//   PAYMENT_WEBHOOK_SECRET=<signing secret>

import crypto from "crypto";

export type Provider = "stripe" | "lemonsqueezy";

export const PRICE_CENTS = 990;
export const PRICE_LABEL = "9,90 €";
export const CURRENCY = "EUR";

export function activeProvider(): Provider | null {
    const p = (process.env.PAYMENT_PROVIDER ?? "").toLowerCase();
    return p === "stripe" || p === "lemonsqueezy" ? p : null;
}

/** Hosted checkout URL. Both providers offer a shareable payment link, which
 *  keeps this site free of card handling entirely (no PCI surface). */
export function checkoutUrl(): string | null {
    return process.env.PAYMENT_CHECKOUT_URL || null;
}

/** What a webhook tells us, once normalised across providers. */
export interface PaymentEvent {
    provider: Provider;
    paymentId: string;
    email: string;
    amountCents: number | null;
    currency: string;
}

/* ── Signature verification ─────────────────────────────────── */

/** Stripe: `Stripe-Signature: t=…,v1=…` over `t.payload`, HMAC-SHA256. */
function verifyStripe(rawBody: string, header: string, secret: string): boolean {
    const parts = Object.fromEntries(
        header.split(",").map((kv) => kv.split("=", 2) as [string, string]),
    );
    if (!parts.t || !parts.v1) return false;
    const expected = crypto
        .createHmac("sha256", secret)
        .update(`${parts.t}.${rawBody}`)
        .digest("hex");
    return timingSafeEqualHex(expected, parts.v1);
}

/** Lemon Squeezy: `X-Signature` is an HMAC-SHA256 hex digest of the raw body. */
function verifyLemon(rawBody: string, header: string, secret: string): boolean {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return timingSafeEqualHex(expected, header.trim());
}

function timingSafeEqualHex(a: string, b: string): boolean {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    // Length check first: timingSafeEqual throws on mismatched lengths.
    return ba.length === bb.length && ba.length > 0 && crypto.timingSafeEqual(ba, bb);
}

/**
 * Validate a webhook and normalise it. Returns null when the signature is
 * missing/invalid or the event isn't a completed purchase — the caller must
 * treat null as "do not issue a licence".
 */
export function parseWebhook(
    provider: Provider,
    rawBody: string,
    headers: Headers,
): PaymentEvent | null {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) return null;

    if (provider === "stripe") {
        const sig = headers.get("stripe-signature");
        if (!sig || !verifyStripe(rawBody, sig, secret)) return null;

        const evt = JSON.parse(rawBody) as {
            type?: string;
            data?: { object?: Record<string, unknown> };
        };
        // Only a completed one-off checkout grants a licence.
        if (evt.type !== "checkout.session.completed") return null;
        const o = evt.data?.object ?? {};
        if (o.payment_status && o.payment_status !== "paid") return null;

        const email =
            (o.customer_email as string) ??
            ((o.customer_details as { email?: string } | undefined)?.email ?? "");
        if (!email) return null;

        return {
            provider,
            paymentId: String(o.id ?? ""),
            email,
            amountCents: typeof o.amount_total === "number" ? o.amount_total : null,
            currency: String(o.currency ?? CURRENCY).toUpperCase(),
        };
    }

    // Lemon Squeezy
    const sig = headers.get("x-signature");
    if (!sig || !verifyLemon(rawBody, sig, secret)) return null;

    const evt = JSON.parse(rawBody) as {
        meta?: { event_name?: string };
        data?: { id?: string; attributes?: Record<string, unknown> };
    };
    if (evt.meta?.event_name !== "order_created") return null;

    const attrs = evt.data?.attributes ?? {};
    if (attrs.status && attrs.status !== "paid") return null;
    const email = String(attrs.user_email ?? "");
    if (!email) return null;

    return {
        provider,
        paymentId: String(evt.data?.id ?? ""),
        email,
        amountCents: typeof attrs.total === "number" ? attrs.total : null,
        currency: String(attrs.currency ?? CURRENCY).toUpperCase(),
    };
}
