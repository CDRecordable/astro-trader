// ============================================================
// Owner tool — issue a lifetime licence by hand
// ============================================================
// For the project owner (your own machines, comped licences, support cases).
// Reads LICENSE_PRIVATE_KEY from landing/.env.local — the same key Railway
// holds; copy it from Railway → Variables if the local file is stale.
//
//   npm run issue-license -- someone@example.com
//
// The printed key unlocks the AI layer forever on whatever machine it is
// pasted into (Ajustes → Capa de IA · Licencia → Activar).

import fs from "fs";
import path from "path";

for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
}

async function main() {
    const email = process.argv[2];
    if (!email || !email.includes("@")) {
        console.error("Uso: npm run issue-license -- correo@ejemplo.com");
        process.exit(1);
    }
    if (!process.env.LICENSE_PRIVATE_KEY) {
        console.error("Falta LICENSE_PRIVATE_KEY en landing/.env.local (cópiala de Railway → Variables).");
        process.exit(1);
    }
    const { issueLicense, verifyLicense } = await import("../lib/license");
    const key = issueLicense(email);
    // Sanity: verify against the public key if present, so a mismatched pair
    // fails HERE instead of silently in the app.
    if (process.env.LICENSE_PUBLIC_KEY) {
        const ok = verifyLicense(key, process.env.LICENSE_PUBLIC_KEY);
        if (!ok) {
            console.error("⚠ La licencia NO verifica con LICENSE_PUBLIC_KEY — par de claves desparejado.");
            process.exit(1);
        }
    }
    console.log(`\nLicencia vitalicia para ${email}:\n`);
    console.log(key);
    console.log("\nPégala en la app: Ajustes → Capa de IA · Licencia → Activar.");
}
void main();
