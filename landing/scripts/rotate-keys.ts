// ============================================================
// Owner tool — rotate the Ed25519 licence keypair
// ============================================================
//   npm run rotate-keys
//
// Generates a fresh pair and wires it everywhere it belongs IN ONE SHOT, so
// the two halves can never drift apart again:
//
//   · landing/.env.local     → new private + public key (local signing)
//   · src/lib/license.ts     → embedded public key (what the app trusts)
//   · landing/.env.railway-paste → the two values ready to paste into Railway
//
// The private key is NEVER printed: it is written to the paste file, which
// .gitignore already covers (.env*). Delete that file once Railway has it.
//
// Rotating invalidates every licence signed with the old pair. Check the
// `licenses` table first if the product has shipped to anyone.

import fs from "fs";
import path from "path";
import crypto from "crypto";

const LANDING = process.cwd();
const REPO = path.join(LANDING, "..");
const ENV_LOCAL = path.join(LANDING, ".env.local");
const PASTE_FILE = path.join(LANDING, ".env.railway-paste");
const APP_LICENSE = path.join(REPO, "src", "lib", "license.ts");

/** Replace KEY=… in a .env file, quoted, tolerating multi-line PEM values. */
function setEnvVar(text: string, name: string, value: string): string {
    const quoted = `${name}="${value}"`;
    const re = new RegExp(`^\\s*${name}\\s*=\\s*(?:"[\\s\\S]*?"|'[\\s\\S]*?'|.*)$`, "m");
    return re.test(text) ? text.replace(re, quoted) : `${text.trimEnd()}\n${quoted}\n`;
}

function main() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const privPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString().trim();
    const pubPem = publicKey.export({ format: "pem", type: "spki" }).toString().trim();
    const pubB64 = pubPem.split("\n").slice(1, -1).join("");

    // ── 1. landing/.env.local ──
    let env = fs.existsSync(ENV_LOCAL) ? fs.readFileSync(ENV_LOCAL, "utf-8").replace(/\r\n/g, "\n") : "";
    env = setEnvVar(env, "LICENSE_PRIVATE_KEY", privPem);
    env = setEnvVar(env, "LICENSE_PUBLIC_KEY", pubPem);
    fs.writeFileSync(ENV_LOCAL, env);

    // ── 2. the public key the app trusts ──
    const app = fs.readFileSync(APP_LICENSE, "utf-8");
    const blockRe = /-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/;
    if (!blockRe.test(app)) {
        console.error(`No encontré el bloque de clave pública en ${APP_LICENSE}`);
        process.exit(1);
    }
    const eol = app.includes("\r\n") ? "\r\n" : "\n";
    const newBlock = ["-----BEGIN PUBLIC KEY-----", pubB64, "-----END PUBLIC KEY-----"].join(eol);
    fs.writeFileSync(APP_LICENSE, app.replace(blockRe, newBlock));

    // ── 3. Railway-ready values (single line: newlines as literal \n, which
    //       lib/license.ts restores — a paste that cannot be cut at a newline) ──
    const oneLine = (pem: string) => pem.replace(/\n/g, "\\n");
    fs.writeFileSync(
        PASTE_FILE,
        [
            "# Pega estos DOS valores en Railway → servicio landing → Variables.",
            "# Cada uno es UNA sola línea. Borra este archivo cuando termines.",
            "",
            `LICENSE_PRIVATE_KEY=${oneLine(privPem)}`,
            "",
            `LICENSE_PUBLIC_KEY=${oneLine(pubPem)}`,
            "",
        ].join("\n")
    );

    // ── 4. Self-test: sign with the new key, verify with what the app now has ──
    process.env.LICENSE_PRIVATE_KEY = privPem;
    void (async () => {
        const { issueLicense, verifyLicense } = await import("../lib/license");
        const embedded = fs.readFileSync(APP_LICENSE, "utf-8").match(blockRe)![0];
        const ok = verifyLicense(issueLicense("selftest@astrotrader.club"), embedded);
        if (!ok) {
            console.error("⚠ El auto-test falló: la app no verifica lo que firma el nuevo par.");
            process.exit(1);
        }
        console.log("\nPar de claves rotado y verificado.\n");
        console.log("Clave pública nueva (esta va en la app, no es secreta):");
        console.log(pubB64);
        console.log("\nActualizados:");
        console.log("  · landing/.env.local        (firma en local)");
        console.log("  · src/lib/license.ts        (lo que la app acepta)");
        console.log(`\nAbre este archivo y pega sus DOS valores en Railway → Variables:\n  ${PASTE_FILE}`);
        console.log("Luego bórralo. La clave privada no se ha impreso en pantalla.");
    })();
}
main();
