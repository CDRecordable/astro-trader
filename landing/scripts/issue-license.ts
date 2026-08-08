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
//
// The licence is verified against the public key EMBEDDED IN THE APP
// (src/lib/license.ts), not against LICENSE_PUBLIC_KEY: the app is the only
// authority that matters, and a stale local pair would otherwise verify
// happily here and be rejected there with no explanation.

import fs from "fs";
import path from "path";

// ── .env loader ──────────────────────────────────────────────
// Values may be quoted and span several lines: a PEM private key pasted
// verbatim looks like KEY="-----BEGIN…\n…\n-----END…-----". Parsing line by
// line would capture only the header and fail with a cryptic OpenSSL error.
function loadEnvFile(p: string): void {
    const text = fs.readFileSync(p, "utf-8").replace(/\r\n/g, "\n");
    const re = /^\s*([A-Z0-9_]+)\s*=\s*(?:"([\s\S]*?)"|'([\s\S]*?)'|(.*))\s*$/gm;
    for (const m of text.matchAll(re)) {
        const name = m[1];
        const value = m[2] ?? m[3] ?? m[4] ?? "";
        if (!process.env[name]) process.env[name] = value;
    }
}

for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) loadEnvFile(p);
}

/** The public key the desktop app actually trusts. */
function appPublicKey(): string | null {
    const p = path.join(process.cwd(), "..", "src", "lib", "license.ts");
    if (!fs.existsSync(p)) return null;
    const m = fs.readFileSync(p, "utf-8").match(
        /-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/
    );
    return m ? m[0] : null;
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

    let key: string;
    try {
        key = issueLicense(email);
    } catch (e) {
        console.error("No se pudo firmar la licencia — ¿LICENSE_PRIVATE_KEY está completa?");
        console.error(String((e as Error).message));
        process.exit(1);
    }

    // The app is the authority. If its embedded key doesn't verify this
    // licence, the private key here is not the production one.
    const appKey = appPublicKey();
    if (appKey && !verifyLicense(key, appKey)) {
        console.error(
            "\n⚠ La licencia NO verifica contra la clave pública de la app.\n" +
            "  Tu LICENSE_PRIVATE_KEY local es de otro par de claves (la antigua de\n" +
            "  desarrollo). Copia la de Railway → Variables → LICENSE_PRIVATE_KEY en\n" +
            "  landing/.env.local y vuelve a ejecutar."
        );
        process.exit(1);
    }

    console.log(`\nLicencia vitalicia para ${email}:\n`);
    console.log(key);
    console.log(
        appKey
            ? "\n✓ Verificada contra la clave pública de la app."
            : "\n(no encontré src/lib/license.ts para verificar)"
    );
    console.log("Pégala en la app: Ajustes → Capa de IA · Licencia → Activar.");
}
void main();
