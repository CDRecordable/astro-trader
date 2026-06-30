// ============================================================
// Database connection — Neon Serverless HTTP driver
// ============================================================

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

/**
 * Whether a database is configured. When false the app runs in "no-cache"
 * mode: data is fetched live on every request and nothing is persisted.
 * This lets the project run with just an LLM key (or even none) — no DB setup.
 */
export const hasDb = Boolean(url);

export const db = url ? drizzle(neon(url), { schema }) : null;

/**
 * Retry a DB operation a few times with small backoff. The Neon serverless
 * HTTP driver occasionally throws on cold connections / transient network
 * hiccups; a quick retry self-heals instead of bubbling a raw SQL error to
 * the UI. Only meant for idempotent reads (and idempotent upserts).
 */
export async function withDbRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < tries; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            if (i < tries - 1) await new Promise((r) => setTimeout(r, 150 * (i + 1)));
        }
    }
    throw lastErr;
}
