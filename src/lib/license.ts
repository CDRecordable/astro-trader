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

/** Ed25519 public key matching the issuer's private key. */
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAADbO/JXrSe9ZOgE6J7NRUMG/Q3n5Dl3fssL6MgPyjLY=
-----END PUBLIC KEY-----`;

const LICENSE_PREFIX = "ATI1";
const LICENSE_PATH = path.join(process.cwd(), "user-data", "license.json");

export interface LicenseInfo {
    email: string;
    issuedAt: string;   // ISO date
    product: "ai-lifetime";
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
            e?: string; t?: number; p?: string;
        };
        if (!payload.e || !payload.t || payload.p !== "ai-lifetime") return null;

        return {
            email: payload.e,
            issuedAt: new Date(payload.t * 1000).toISOString().slice(0, 10),
            product: "ai-lifetime",
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
