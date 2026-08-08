// ============================================================
// Owner tool — re-export the CURRENT keypair for Railway
// ============================================================
//   npm run railway-vars
//
// Writes landing/.env.railway-paste again from the pair already in
// landing/.env.local. Generates nothing: use this when the paste file was
// deleted and Railway still needs the values. Running rotate-keys instead
// would mint a NEW pair and kill every licence issued with the current one.
//
// Values come out as single lines with literal \n, which lib/license.ts
// restores — a paste box cannot truncate them at a newline.

import fs from "fs";
import path from "path";
import crypto from "crypto";

const ENV_LOCAL = path.join(process.cwd(), ".env.local");
const PASTE_FILE = path.join(process.cwd(), ".env.railway-paste");
const APP_LICENSE = path.join(process.cwd(), "..", "src", "lib", "license.ts");

function readEnvVar(text: string, name: string): string | null {
    const m = text.match(
        new RegExp(`^\\s*${name}\\s*=\\s*(?:"([\\s\\S]*?)"|'([\\s\\S]*?)'|(.*))\\s*$`, "m")
    );
    return m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : null;
}

function main() {
    if (!fs.existsSync(ENV_LOCAL)) {
        console.error("No encuentro landing/.env.local");
        process.exit(1);
    }
    const env = fs.readFileSync(ENV_LOCAL, "utf-8").replace(/\r\n/g, "\n");
    const priv = readEnvVar(env, "LICENSE_PRIVATE_KEY");
    if (!priv) {
        console.error("Falta LICENSE_PRIVATE_KEY en landing/.env.local");
        process.exit(1);
    }

    // Derive the public half rather than trusting the stored one: if the two
    // ever drifted, the derived key is the one that matches what we sign with.
    let pub: string;
    try {
        pub = crypto
            .createPublicKey(crypto.createPrivateKey(priv.replace(/\\n/g, "\n")))
            .export({ format: "pem", type: "spki" })
            .toString()
            .trim();
    } catch (e) {
        console.error("La clave privada no se puede leer:", (e as Error).message);
        process.exit(1);
    }

    const oneLine = (pem: string) => pem.replace(/\r?\n/g, "\\n");
    fs.writeFileSync(
        PASTE_FILE,
        [
            "# Pega estos DOS valores en Railway → servicio landing → Variables.",
            "# Cada uno es UNA sola línea. Borra este archivo cuando termines.",
            "",
            `LICENSE_PRIVATE_KEY=${oneLine(priv.replace(/\\n/g, "\n"))}`,
            "",
            `LICENSE_PUBLIC_KEY=${oneLine(pub)}`,
            "",
        ].join("\n")
    );

    // Warn loudly if the app trusts a different key than this pair signs with.
    const b64 = pub.split("\n").slice(1, -1).join("");
    if (fs.existsSync(APP_LICENSE)) {
        const embedded = fs.readFileSync(APP_LICENSE, "utf-8").match(/MCowBQYDK2Vw[A-Za-z0-9+/=]+/);
        if (embedded && embedded[0] !== b64) {
            console.error(
                "\n⚠ La clave pública de src/lib/license.ts NO es la de este par.\n" +
                "  La app rechazará lo que firmes. Revisa antes de pegar nada."
            );
            process.exit(1);
        }
    }

    console.log("\nValores escritos en:");
    console.log(`  ${PASTE_FILE}`);
    console.log("\nClave pública (no es secreta):");
    console.log(b64);
    console.log("\nPega los dos valores en Railway y borra el archivo. Este comando");
    console.log("NO ha generado claves nuevas: tu licencia actual sigue valiendo.");
}
main();
