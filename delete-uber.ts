import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { companies } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function run() {
    await db.delete(companies).where(eq(companies.ticker, "UBER"));
    console.log("Deleted UBER from cache.");
    // also delete from memory store client side maybe? Refreshing page will do.
}
run();
