// ============================================================
// Database connection — Neon serverless (optional at build time)
// ============================================================
// The marketing pages are fully static and must build without a database, so
// the client is created lazily and only the licence routes ever touch it.

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = ReturnType<typeof makeDb>;

function makeDb(url: string) {
    return drizzle(neon(url), { schema });
}

let cached: Db | null = null;

/** Returns the db, or null when no DATABASE_URL is configured. */
export function getDb(): Db | null {
    if (cached) return cached;
    const url = process.env.DATABASE_URL;
    if (!url) return null;
    cached = makeDb(url);
    return cached;
}
