// ============================================================
// GET /api/patreon/start — begin "Connect with Patreon"
// ============================================================
// Sends the supporter to Patreon to approve the connection. The `state` is a
// random value we also drop in a short-lived, http-only cookie: when Patreon
// sends them back, the two must match. That is what stops someone from
// tricking a supporter into completing a login the attacker started (CSRF).

import { NextResponse } from "next/server";
import crypto from "crypto";
import { authorizeUrl } from "@/lib/patreon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
    let url: string;
    const state = crypto.randomBytes(16).toString("hex");
    try {
        url = authorizeUrl(state);
    } catch {
        // Misconfigured server — say so plainly rather than bouncing the user
        // to a broken Patreon screen.
        return NextResponse.redirect(
            new URL("/pro?error=not_configured", process.env.SITE_URL ?? "http://localhost:3000"),
        );
    }

    const res = NextResponse.redirect(url);
    res.cookies.set("patreon_state", state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 600,
        path: "/",
    });
    return res;
}
