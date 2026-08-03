// ============================================================
// Patreon — membership verification
// ============================================================
// The PRO tier is granted by asking Patreon, at sign-in and at every renewal,
// whether this person is still an active member of OUR campaign. We deliberately
// keep almost nothing: the OAuth access token is used once to read the
// membership and then thrown away, so this server never holds a credential that
// could act on a supporter's Patreon account.
//
// Setup (see PATREON.md): create a client at patreon.com/portal/registration/
// register-clients, then set PATREON_CLIENT_ID, PATREON_CLIENT_SECRET,
// PATREON_CAMPAIGN_ID and PATREON_REDIRECT_URI.

const AUTHORIZE_URL = "https://www.patreon.com/oauth2/authorize";
const TOKEN_URL = "https://www.patreon.com/api/oauth2/token";
const IDENTITY_URL = "https://www.patreon.com/api/oauth2/v2/identity";

/** Minimum monthly pledge, in cents, that unlocks PRO. */
export const PRO_MIN_PLEDGE_CENTS = Number(process.env.PATREON_MIN_PLEDGE_CENTS ?? 0);

/** Monthly AI analyses included with an active membership. */
export const MONTHLY_QUOTA = Number(process.env.PATREON_MONTHLY_QUOTA ?? 100);

export interface PatreonMember {
    patreonUserId: string;
    email: string;
    /** active_patron | declined_patron | former_patron | null */
    status: string;
    pledgeCents: number;
    /** Whether this membership currently entitles the PRO tier. */
    entitled: boolean;
    /** Refresh token to re-check this membership later (rotates on each use). */
    refreshToken?: string;
}

function required(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`${name} is not configured`);
    return v;
}

/** Where we send someone to approve the connection. */
export function authorizeUrl(state: string): string {
    const u = new URL(AUTHORIZE_URL);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("client_id", required("PATREON_CLIENT_ID"));
    u.searchParams.set("redirect_uri", required("PATREON_REDIRECT_URI"));
    // identity[email] is the only personal scope we ask for; the memberships
    // scope is what actually answers "is this person a supporter?".
    u.searchParams.set("scope", "identity identity[email]");
    u.searchParams.set("state", state);
    return u.toString();
}

interface PatreonIdentity {
    data?: {
        id?: string;
        attributes?: { email?: string };
        relationships?: { memberships?: { data?: Array<{ id: string }> } };
    };
    included?: Array<{
        id: string;
        type: string;
        attributes?: {
            patron_status?: string | null;
            currently_entitled_amount_cents?: number;
        };
        relationships?: { campaign?: { data?: { id?: string } } };
    }>;
}

/**
 * Exchange the one-time code for the person's membership status.
 * Throws on a Patreon-side failure so the caller can tell "not a patron"
 * (a real answer) from "we couldn't ask" (a temporary problem).
 */
export async function memberFromCode(code: string): Promise<PatreonMember> {
    const body = new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: required("PATREON_CLIENT_ID"),
        client_secret: required("PATREON_CLIENT_SECRET"),
        redirect_uri: required("PATREON_REDIRECT_URI"),
    });

    return exchange(body);
}

/**
 * Re-check a membership using a stored refresh token. This is what makes
 * cancellation actually take effect: at every renewal we ask Patreon again
 * rather than trusting what we saw at sign-in.
 *
 * Patreon rotates refresh tokens, so the caller must persist the returned one.
 */
export async function memberFromRefreshToken(refreshToken: string): Promise<PatreonMember> {
    return exchange(
        new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: required("PATREON_CLIENT_ID"),
            client_secret: required("PATREON_CLIENT_SECRET"),
        }),
    );
}

async function exchange(body: URLSearchParams): Promise<PatreonMember> {
    const tokenRes = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!tokenRes.ok) {
        throw new Error(`Patreon token exchange failed (${tokenRes.status})`);
    }
    const { access_token: accessToken, refresh_token: newRefresh } =
        (await tokenRes.json()) as { access_token?: string; refresh_token?: string };
    if (!accessToken) throw new Error("Patreon returned no access token");

    const member = await memberFromAccessToken(accessToken);
    return { ...member, refreshToken: newRefresh };
}

/** Read identity + memberships with a freshly-issued access token. */
export async function memberFromAccessToken(accessToken: string): Promise<PatreonMember> {
    const u = new URL(IDENTITY_URL);
    u.searchParams.set("include", "memberships");
    u.searchParams.set("fields[user]", "email");
    u.searchParams.set(
        "fields[member]",
        "patron_status,currently_entitled_amount_cents",
    );

    const res = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Patreon identity failed (${res.status})`);

    const json = (await res.json()) as PatreonIdentity;
    const patreonUserId = json.data?.id ?? "";
    const email = (json.data?.attributes?.email ?? "").toLowerCase();
    if (!patreonUserId) throw new Error("Patreon identity returned no user id");

    // A person can back several campaigns; only ours grants the tier.
    const campaignId = process.env.PATREON_CAMPAIGN_ID;
    const memberships = (json.included ?? []).filter((i) => i.type === "member");
    const ours = campaignId
        ? memberships.find((m) => m.relationships?.campaign?.data?.id === campaignId)
        : memberships[0];

    const status = ours?.attributes?.patron_status ?? "none";
    const pledgeCents = ours?.attributes?.currently_entitled_amount_cents ?? 0;

    return {
        patreonUserId,
        email,
        status,
        pledgeCents,
        entitled: status === "active_patron" && pledgeCents >= PRO_MIN_PLEDGE_CENTS,
    };
}
