// ============================================================
// Licence store — Neon PostgreSQL via Drizzle
// ============================================================
// Deliberately minimal: we keep what's needed to reissue someone's key and to
// reconcile a payment, and nothing else. No passwords (there are no accounts),
// no tracking, no device fingerprints.

import { pgTable, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const licenses = pgTable(
    "licenses",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

        /** Buyer email, lowercased — the only handle we need to reissue a key. */
        email: text("email").notNull(),

        /** The signed licence string handed to the buyer. */
        licenseKey: text("license_key").notNull(),

        /** "stripe" | "lemonsqueezy" | "manual" — provider-agnostic by design. */
        provider: text("provider").notNull(),

        /** Provider's payment/order id. Unique so a replayed webhook can't
         *  issue a second licence for the same purchase. */
        paymentId: text("payment_id").notNull(),

        /** Product tier, so future tiers reuse this table. */
        product: text("product").notNull().default("ai-lifetime"),

        /** Amount paid in cents + currency, for bookkeeping. */
        amountCents: integer("amount_cents"),
        currency: text("currency").default("EUR"),

        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [uniqueIndex("licenses_payment_id_idx").on(t.paymentId)],
);

export type License = typeof licenses.$inferSelect;
