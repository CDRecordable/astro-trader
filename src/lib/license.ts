// ============================================================
// Licence verification — offline, on the user's own machine
// ============================================================
// The AI layer is unlocked by a signed licence. Verification happens HERE,
// against the public key below: the app never contacts a licence server, so
// it works offline, keeps working if that server ever disappears, and tells
// us nothing about who is using it.
//
// The public key is safe to publish — it can verify signatures but cannot
// create them. Only the holder of the matching private key can issue licences.

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { userDataPath } from "./paths";

/** Ed25519 public key matching the issuer's private key. */
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAADbO/JXrSe9ZOgE6J7NRUMG/Q3n5Dl3fssL6MgPyjLY=
-----END PUBLIC KEY-----`;

const LICENSE_PREFIX = "ATI1";
const LICENSE_PATH = userDataPath("license.json");

export interface LicenseInfo {
    email: string;
    issuedAt: string;   // ISO date
    /**
     * `ai-lifetime` — the one-off purchase: permanent, and the user supplies
     *   their own provider key.
     * `patreon-pro` — an active Patreon membership: the AI runs through our
     *   proxy on our key, so it EXPIRES and is renewed while the membership
     *   lasts. A subscription that never expired would let someone pledge for
     *   one month and keep spending our budget forever.
     */
    product: "ai-lifetime" | "patreon-pro";
    /** Expiry (ISO date) — `patreon-pro` only. */
    expiresAt?: string;
    /** Seconds until expiry; negative once expired. `patreon-pro` only. */
    expiresInSeconds?: number;
}

interface StoredLicense { key: string }

function b64uDecode(s: string): Buffer {
    return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Verify a licence string. Returns its details, or null if it isn't valid. */
export function verifyLicenseKey(key: string): LicenseInfo | null {
    try {
        const parts = key.trim().split(".");
        if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) return null;
        const [, body, sig] = parts;

        const ok = crypto.verify(
            null,
            Buffer.from(body),
            crypto.createPublicKey(PUBLIC_KEY),
            b64uDecode(sig),
        );
        if (!ok) return null;

        const payload = JSON.parse(b64uDecode(body).toString("utf8")) as {
            e?: string; t?: number; p?: string; x?: number;
        };
        if (!payload.e || !payload.t) return null;
        if (payload.p !== "ai-lifetime" && payload.p !== "patreon-pro") return null;

        const base: LicenseInfo = {
            email: payload.e,
            issuedAt: new Date(payload.t * 1000).toISOString().slice(0, 10),
            product: payload.p,
        };
        if (payload.p !== "patreon-pro") return base;

        // A PRO token without an expiry would be a lifetime grant by accident.
        if (typeof payload.x !== "number") return null;
        return {
            ...base,
            expiresAt: new Date(payload.x * 1000).toISOString().slice(0, 10),
            expiresInSeconds: payload.x - Math.floor(Date.now() / 1000),
        };
    } catch {
        return null;
    }
}

/** Read the stored licence from disk (server-side only). */
export function readStoredLicense(): { key: string; info: LicenseInfo } | null {
    try {
        const raw = JSON.parse(fs.readFileSync(LICENSE_PATH, "utf-8")) as StoredLicense;
        if (!raw?.key) return null;
        const info = verifyLicenseKey(raw.key);
        return info ? { key: raw.key, info } : null;
    } catch {
        return null;
    }
}

/** Persist a licence after verifying it. Returns null when the key is bad. */
export function storeLicense(key: string): LicenseInfo | null {
    const info = verifyLicenseKey(key);
    if (!info) return null;
    fs.mkdirSync(path.dirname(LICENSE_PATH), { recursive: true });
    fs.writeFileSync(LICENSE_PATH, JSON.stringify({ key: key.trim() }, null, 2), "utf-8");
    return info;
}

/** Remove the stored licence (used by "deactivate"). */
export function clearLicense(): void {
    try { fs.unlinkSync(LICENSE_PATH); } catch { /* already gone */ }
}

/** Is the AI layer unlocked on this machine? */
export function isLicensed(): boolean {
    return readStoredLicense() !== null;
}
