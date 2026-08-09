// ============================================================
// Assemble the server bundle that ships inside the installer
// ============================================================
// `next build` with output:"standalone" emits a minimal server, but Next
// deliberately leaves two things out of it — the static assets and /public —
// because they're normally served by a CDN. A desktop app has no CDN, so we
// copy them in and end up with a folder that runs on its own.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");   // repo root (the Next.js app)
const DESKTOP = path.resolve(__dirname, "..");
const OUT = path.join(DESKTOP, "app-server");

/**
 * Delete a tree, and PROVE it is gone.
 *
 * fs.rmSync(…, {recursive:true, force:true}) returns cleanly on this tree
 * while leaving it untouched — `force` swallows the very error that would
 * explain why. The bundle was silently assembled on top of the previous one:
 * 1157 of 1877 files in the last installer were two weeks stale, including
 * chunks holding a licence public key from before the keypair rotation.
 *
 * So: retry, then walk it by hand, then refuse to continue if anything
 * survives. A release that half-overwrites the previous one is not a release.
 */
function rmrf(p) {
    if (!fs.existsSync(p)) return;

    try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* fall through */ }
    if (!fs.existsSync(p)) return;

    const walk = (target) => {
        const stat = fs.lstatSync(target);
        if (stat.isDirectory()) {
            for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
            fs.rmdirSync(target);
        } else {
            fs.chmodSync(target, 0o666);   // read-only leftovers block the unlink
            fs.unlinkSync(target);
        }
    };
    walk(p);

    if (fs.existsSync(p)) {
        throw new Error(`No pude borrar ${p}. Ciérralo (explorador, antivirus, app abierta) y repite.`);
    }
}

/**
 * Recursive copy. Implemented by hand rather than with fs.cpSync because that
 * call dies partway through on this tree (thousands of small node_modules
 * files under a non-ASCII path), leaving a half-written bundle.
 */
function copy(from, to) {
    if (!fs.existsSync(from)) return false;
    const stat = fs.statSync(from);
    if (!stat.isDirectory()) {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
        return true;
    }
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) {
        copy(path.join(from, entry), path.join(to, entry));
    }
    return true;
}

function main() {
    // Wipe .next first. Next never prunes chunks from earlier builds, so an
    // incremental output carries dead code from every past version — and the
    // installer shipped it. That was not merely bloat: chunks from before the
    // keypair rotation still held the OLD licence public key, so the bundle
    // contained two different answers to "which issuer does this app trust".
    // A release must be reproducible from source alone.
    console.log("▸ Cleaning .next (stale chunks must not reach the installer)…");
    rmrf(path.join(ROOT, ".next"));

    console.log("▸ Building the Next.js app (standalone)…");
    execSync("npx next build", { cwd: ROOT, stdio: "inherit" });

    const standalone = path.join(ROOT, ".next", "standalone");
    if (!fs.existsSync(standalone)) {
        throw new Error('No standalone output found. Is output:"standalone" set in next.config.ts?');
    }

    console.log("▸ Assembling desktop/app-server…");
    rmrf(OUT);
    fs.mkdirSync(OUT, { recursive: true });

    // 1. the standalone server + its trimmed node_modules.
    //    Copied entry by entry, never wholesale: the traced output mirrors the
    //    project tree, so a blind copy would pull `desktop/` into
    //    `desktop/app-server` (recursion) and ship the developer's user-data.
    //    A second guard against shipping anything private: even if the tracer
    //    changes behaviour, these never make it into an installer.
    const SKIP = new Set(["desktop", "landing", "user-data", "docs"]);
    const isSecret = (name) => name === ".env" || name.startsWith(".env.");

    for (const entry of fs.readdirSync(standalone)) {
        if (SKIP.has(entry) || isSecret(entry)) {
            console.log(`  · skipped ${entry}`);
            continue;
        }
        copy(path.join(standalone, entry), path.join(OUT, entry));
    }

    // Fail loudly rather than ship a secret by accident.
    for (const entry of fs.readdirSync(OUT)) {
        if (isSecret(entry)) throw new Error(`Refusing to package a secrets file: ${entry}`);
    }

    // 2. static assets (hashed JS/CSS) — not included by Next on purpose
    copy(path.join(ROOT, ".next", "static"), path.join(OUT, ".next", "static"));

    // 3. anything served from /public
    copy(path.join(ROOT, "public"), path.join(OUT, "public"));

    const entry = path.join(OUT, "server.js");
    if (!fs.existsSync(entry)) throw new Error("server.js missing from the assembled bundle");

    const size = execSync(`node -e "let t=0;const w=d=>{for(const f of require('fs').readdirSync(d,{withFileTypes:true})){const p=require('path').join(d,f.name);f.isDirectory()?w(p):t+=require('fs').statSync(p).size}};w(process.argv[1]);console.log((t/1048576).toFixed(0))" "${OUT}"`)
        .toString().trim();
    console.log(`✓ Bundle ready: desktop/app-server (${size} MB)`);
}

main();
