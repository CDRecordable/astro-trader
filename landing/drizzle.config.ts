// ============================================================
// Drizzle config — schema push for the licence + patron tables
// ============================================================
// Run with `npm run db:push` from this folder. Reads DATABASE_URL from
// .env.local, which is gitignored: the connection string never enters the repo.

import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

// drizzle-kit loads .env but not .env.local, so do it here. The parent folder
// is included because the desktop app and this site share one Neon project, and
// its connection string already lives in the app's env file.
for (const file of [".env.local", ".env", "../.env.local", "../.env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
    }
}

export default defineConfig({
    schema: "./db/schema.ts",
    out: "./db/migrations",
    dialect: "postgresql",
    dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
