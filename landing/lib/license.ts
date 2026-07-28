// ============================================================
// License keys — Ed25519, verifiable offline
// ============================================================
// The landing signs a licence with a PRIVATE key; the downloaded app verifies
// it with the PUBLIC key embedded in its source. That means:
//   · the app never phones home — it works offline, forever, and we learn
//     nothing about who runs what;
//   · if this server ever disappears, existing licences keep working;
//   · nothing secret ships to users (a public key can't forge licences).
//
// Uses Node's built-in crypto: no dependency, no supply-chain surface.
//
// Format:  ATI1.<base64url(payload)>.<base64url(signature)>

import crypto from "crypto";

export const LICENSE_PREFIX = "ATI1";

export interface LicensePayload {
    /** Buyer email — lets someone recover their key, and personalises the app. */
    e: string;
    /** Issued-at, unix seconds. */
    t: number;
    /** Product/tier, so future tiers can reuse the same scheme. */
    p: "ai-lifetime";
}

const b64u = {
    encode: (buf: Buffer | string) =>
        Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    decode: (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
};

/** Build a signing key object from the PKCS#8 PEM held in the environment. */
function privateKey(): crypto.KeyObject {
    const pem = process.env.LICENSE_PRIVATE_KEY;
    if (!pem) throw new Error("LICENSE_PRIVATE_KEY is not configured");
    // Railway env vars keep literal \n, so restore real newlines.
    return crypto.createPrivateKey(pem.replace(/\\n/g, "\n"));
}

/** Sign a licence for a buyer. Deterministic for a given payload. */
export function issueLicense(email: string, issuedAt = Math.floor(Date.now() / 1000)): string {
    const payload: LicensePayload = { e: email.trim().toLowerCase(), t: issuedAt, p: "ai-lifetime" };
    const body = b64u.encode(JSON.stringify(payload));
    const sig = crypto.sign(null, Buffer.from(body), privateKey());
    return `${LICENSE_PREFIX}.${body}.${b64u.encode(sig)}`;
}

/** Verify a licence against a public key (PEM). Pure — safe to run anywhere. */
export function verifyLicense(key: string, publicKeyPem: string): LicensePayload | null {
    try {
        const parts = key.trim().split(".");
        if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) return null;
        const [, body, sig] = parts;

        const ok = crypto.verify(
            null,
            Buffer.from(body),
            crypto.createPublicKey(publicKeyPem.replace(/\\n/g, "\n")),
            b64u.decode(sig),
        );
        if (!ok) return null;

        const payload = JSON.parse(b64u.decode(body).toString("utf8")) as LicensePayload;
        if (!payload?.e || !payload?.t || payload.p !== "ai-lifetime") return null;
        return payload;
    } catch {
        return null;
    }
}

/** Verify with the server's own public key (used by /api/license/verify). */
export function verifyWithServerKey(key: string): LicensePayload | null {
    const pub = process.env.LICENSE_PUBLIC_KEY;
    if (!pub) return null;
    return verifyLicense(key, pub);
}

/** Generate a fresh Ed25519 keypair — run once, then store in env vars. */
export function generateKeypair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    return {
        publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
        privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    };
}
