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

// ============================================================
// Patreon subscribers — the PRO tier
// ============================================================
// Different from a licence in one decisive way: a purchase is permanent, a
// subscription is not. Someone can pledge for a month, take a lifetime key and
// cancel — so the PRO tier is granted as a SHORT-LIVED token that is only
// re-issued while Patreon still reports the membership as active.
//
// We store the Patreon user id rather than an OAuth token: the token is used
// once at sign-in to read the membership and then discarded, so a leak of this
// table cannot be used to act on anyone's Patreon account.

export const patrons = pgTable(
    "patrons",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

        /** Patreon's own user id — stable across email changes. */
        patreonUserId: text("patreon_user_id").notNull(),

        /** Lowercased email, so a patron can be helped by hand if needed. */
        email: text("email").notNull(),

        /** Patreon's `patron_status`: active_patron | declined_patron | former_patron. */
        status: text("status").notNull(),

        /** Cents pledged per month — how we tell tiers apart. */
        pledgeCents: integer("pledge_cents").notNull().default(0),

        /**
         * Patreon refresh token, used ONLY to re-ask "is this membership still
         * active?" when the app renews a PRO token.
         *
         * Storing it is a deliberate trade. Without it, revocation would have to
         * rely on whatever status we saw at sign-in — so someone could cancel
         * and keep spending our API budget indefinitely, which is the exact
         * failure this tier has to avoid. The token is scoped to reading
         * identity and memberships: it cannot post, charge, or change anything.
         */
        refreshToken: text("refresh_token"),

        /** When we last confirmed the membership with Patreon. */
        checkedAt: timestamp("checked_at").defaultNow().notNull(),

        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [uniqueIndex("patrons_patreon_user_id_idx").on(t.patreonUserId)],
);

export type Patron = typeof patrons.$inferSelect;

/**
 * One row per patron per calendar month. The AI proxy spends real money on
 * every call, so the quota is enforced here rather than trusted to the client:
 * the desktop app is open source and its checks can be edited away.
 */
export const aiUsage = pgTable(
    "ai_usage",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

        patreonUserId: text("patreon_user_id").notNull(),

        /** "2026-08" — calendar month, so the quota resets on the 1st. */
        period: text("period").notNull(),

        /** Analyses served this period. */
        used: integer("used").notNull().default(0),

        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (t) => [uniqueIndex("ai_usage_patron_period_idx").on(t.patreonUserId, t.period)],
);

export type AiUsage = typeof aiUsage.$inferSelect;
