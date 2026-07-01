// ============================================================
// API Route — /api/update  (self-update from GitHub)
// ============================================================
// GET  → is this a git clone, and how many new commits are on the remote?
// POST → git pull --ff-only + npm install (then the user restarts the app)
// Local, single-user tool: it shells out to git/npm in the project dir.

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const run = promisify(exec);
const cwd = process.cwd();

async function git(cmd: string, timeout = 60_000): Promise<string> {
    const { stdout } = await run(cmd, { cwd, timeout, windowsHide: true });
    return stdout.trim();
}

export async function GET() {
    try {
        await git("git rev-parse --is-inside-work-tree");
    } catch {
        // Not a git clone (e.g. downloaded as a ZIP) → can't self-update.
        return NextResponse.json({ isRepo: false, updateAvailable: false });
    }

    let behind = 0;
    let latestMsg = "";
    let current = "";
    try {
        current = await git("git rev-parse --short HEAD");
        await git("git fetch --quiet").catch(() => { });
        // Commits on the tracked upstream branch that we don't have yet.
        behind = parseInt(await git("git rev-list --count HEAD..@{u}"), 10) || 0;
        if (behind > 0) latestMsg = await git("git log -1 --format=%s @{u}").catch(() => "");
    } catch {
        // No upstream configured → nothing to compare against.
        return NextResponse.json({ isRepo: true, updateAvailable: false, current });
    }

    return NextResponse.json({ isRepo: true, updateAvailable: behind > 0, behind, current, latestMsg });
}

export async function POST() {
    try {
        await git("git rev-parse --is-inside-work-tree");
    } catch {
        return NextResponse.json({ ok: false, error: "not_a_repo" }, { status: 400 });
    }
    try {
        const pull = await git("git pull --ff-only", 120_000);
        // Reinstall deps in case package.json changed (safe no-op otherwise).
        await run("npm install --no-audit --no-fund", { cwd, timeout: 300_000, windowsHide: true });
        return NextResponse.json({ ok: true, pull });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "update_failed";
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
}
